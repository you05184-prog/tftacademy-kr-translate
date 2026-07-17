// ==UserScript==
// @name         TFT Academy 한글 번역
// @namespace    https://github.com/you05184-prog/tftacademy-kr-translate
// @version      0.2.0
// @description  tftacademy.com 티어리스트 페이지의 챔피언/아이템/특성/증강 이름을 롤토체스 공식 한글 명칭으로 실시간 번역
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
})();
