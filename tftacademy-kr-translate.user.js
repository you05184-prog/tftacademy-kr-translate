// ==UserScript==
// @name         TFT Academy 한글 번역
// @namespace    https://github.com/you05184-prog/tftacademy-kr-translate
// @version      0.3.1
// @description  tftacademy.com 티어리스트 페이지의 챔피언/아이템/특성/증강 이름 및 사이트 자체 팁 텍스트를 한글로 실시간 번역
// @author       you05184-prog
// @match        https://tftacademy.com/tierlist*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/you05184-prog/tftacademy-kr-translate/main/tftacademy-kr-translate.user.js
// @downloadURL  https://raw.githubusercontent.com/you05184-prog/tftacademy-kr-translate/main/tftacademy-kr-translate.user.js
// ==/UserScript==

(function () {
    "use strict";

    const GLOSSARY_URL =
        "https://raw.githubusercontent.com/you05184-prog/tftacademy-kr-translate/main/data/glossary.json";
    const TIPS_GLOSSARY_URL =
        "https://raw.githubusercontent.com/you05184-prog/tftacademy-kr-translate/main/data/tips-glossary.json";

    // ---------- 1. 챔피언/아이템/특성/증강 고유명사 번역 (fetch 인터셉트) ----------

    // API 경로 -> glossary.json 내 카테고리 키
    const CATEGORY_BY_PATH = {
        "/api/assets/champions": "champions",
        "/api/assets/items": "items",
        "/api/assets/traits": "traits",
        "/api/assets/augments": "augments",
    };

    let glossary = null;
    const glossaryReady = fetch(GLOSSARY_URL)
        .then((r) => r.json())
        .then((g) => {
            glossary = g;
        })
        .catch((err) => {
            console.warn("[TFT Academy 한글 번역] 용어집 로드 실패:", err);
        });

    function matchCategory(pathname) {
        for (const prefix in CATEGORY_BY_PATH) {
            if (pathname.startsWith(prefix)) return CATEGORY_BY_PATH[prefix];
        }
        return null;
    }

    function translateEntry(entry, dict) {
        const g = dict[entry.apiName];
        if (g && g.name_ko) {
            entry.name = g.name_ko;
        }
    }

    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        let url;
        try {
            const first = args[0];
            url = typeof first === "string" ? first : first && first.url;
        } catch (e) {
            url = null;
        }
        if (!url) return response;

        let pathname;
        try {
            pathname = new URL(url, location.href).pathname;
        } catch (e) {
            return response;
        }

        const category = matchCategory(pathname);
        if (!category) return response;

        await glossaryReady;
        if (!glossary) return response;

        let data;
        try {
            data = await response.clone().json();
        } catch (e) {
            return response;
        }

        const list = data[category];
        const dict = glossary[category] || {};
        if (Array.isArray(list)) {
            for (const entry of list) {
                translateEntry(entry, dict);
            }
        }

        return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
        });
    };

    // ---------- 2. 사이트 자체 팁/코멘터리 텍스트 번역 (DOM 문자열 치환) ----------

    let tipsReplacer = null;
    const tipsGlossaryReady = fetch(TIPS_GLOSSARY_URL)
        .then((r) => r.json())
        .then((g) => {
            const flat = Object.assign(
                {},
                g.enums && g.enums.difficulty,
                g.enums && g.enums.style,
                g.text
            );
            const keys = Object.keys(flat)
                .filter((k) => k.length > 0)
                .sort((a, b) => b.length - a.length);
            tipsReplacer = function (text) {
                let result = text;
                for (const k of keys) {
                    if (result.indexOf(k) !== -1) {
                        result = result.split(k).join(flat[k]);
                    }
                }
                return result;
            };
        })
        .catch((err) => {
            console.warn("[TFT Academy 한글 번역] 팁 용어집 로드 실패:", err);
        });

    function walkAndReplace(root) {
        if (!tipsReplacer) return;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) return NodeFilter.FILTER_REJECT;
                const tag = parent.tagName;
                if (tag === "SCRIPT" || tag === "STYLE") return NodeFilter.FILTER_REJECT;
                if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            },
        });
        const nodes = [];
        let n;
        while ((n = walker.nextNode())) nodes.push(n);
        for (const node of nodes) {
            const newText = tipsReplacer(node.nodeValue);
            if (newText !== node.nodeValue) node.nodeValue = newText;
        }
    }

    function startDomTranslation() {
        tipsGlossaryReady.then(() => {
            if (!tipsReplacer) return;
            walkAndReplace(document.body);

            const observer = new MutationObserver((mutations) => {
                if (!tipsReplacer) return;
                for (const m of mutations) {
                    if (m.type === "characterData") {
                        const node = m.target;
                        const newText = tipsReplacer(node.nodeValue);
                        if (newText !== node.nodeValue) node.nodeValue = newText;
                        continue;
                    }
                    for (const node of m.addedNodes) {
                        if (node.nodeType === Node.TEXT_NODE) {
                            const newText = tipsReplacer(node.nodeValue);
                            if (newText !== node.nodeValue) node.nodeValue = newText;
                        } else if (node.nodeType === Node.ELEMENT_NODE) {
                            walkAndReplace(node);
                        }
                    }
                }
            });
            // Svelte는 새 노드를 삽입하기보다 기존 텍스트 노드의 내용(characterData)만
            // 갱신하는 경우가 많아서 childList만으로는 감지가 안 됨 -> characterData도 관찰.
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        });
    }

    if (document.body) {
        startDomTranslation();
    } else {
        document.addEventListener("DOMContentLoaded", startDomTranslation);
    }
})();
