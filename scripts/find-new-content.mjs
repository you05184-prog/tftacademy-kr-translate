// tftacademy.com에서 현재 라이브 데이터(가이드 팁, 특성/증강 설명)를 가져와
// 이미 번역되어 있는 data/tips-glossary.json, data/descriptions-glossary.json과 비교해서
// "아직 번역 안 된 것"만 골라 JSON으로 stdout에 출력한다.
//
// 목적: 예약 에이전트가 매 실행마다 전체 glossary 파일을 컨텍스트에 읽어들여
// 눈으로 대조하는 대신, 이 스크립트가 diff를 계산해서 필요한 항목만 넘겨주면
// LLM은 그 짧은 결과만 번역하면 되므로 토큰/시간을 크게 아낄 수 있다.
//
// 사용법: node scripts/find-new-content.mjs > diff.json
// TFT_SET은 scripts/build-glossary.mjs와 반드시 같은 값으로 유지할 것.

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TFT_SET = 17;

async function getText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; tftacademy-kr-translate-bot)" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

// SvelteKit이 `kit.start(app, element, {...})` 형태로 심어놓는 SSR 데이터 블록을
// 문자열 상태(따옴표/이스케이프)를 인지하며 중괄호 깊이로 추출한다. JSON이 아니라
// key가 quote 안 된 JS object literal이므로 new Function으로 평가한다.
function extractKitStartObject(html) {
  const marker = "kit.start(app, element, ";
  const startIdx = html.indexOf(marker);
  if (startIdx === -1) throw new Error("kit.start(app, element, ...) 블록을 찾지 못함 - 사이트 구조가 바뀌었을 수 있음");
  const objStart = startIdx + marker.length;
  if (html[objStart] !== "{") throw new Error("예상한 위치에 '{' 없음 - 사이트 구조가 바뀌었을 수 있음");

  let depth = 0;
  let inString = null; // '"' | "'" | '`' | null
  let i = objStart;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (ch === "\\") {
        i++; // 다음 문자(이스케이프된 문자)는 건너뜀
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        i++;
        break;
      }
    }
  }
  const text = html.slice(objStart, i);
  return new Function("return " + text)();
}

async function fetchGuides() {
  const html = await getText("https://tftacademy.com/tierlist/comps");
  const obj = extractKitStartObject(html);
  const entry = obj.data.find((d) => d && d.data && Array.isArray(d.data.guides));
  if (!entry) throw new Error("guides 배열을 SSR 데이터에서 찾지 못함 - 사이트 구조가 바뀌었을 수 있음");
  return entry.data.guides;
}

function main_tipsDiff(guides, tipsGlossary) {
  const existingText = tipsGlossary.text || {};
  const existingStyle = (tipsGlossary.enums && tipsGlossary.enums.style) || {};
  const existingDifficulty = (tipsGlossary.enums && tipsGlossary.enums.difficulty) || {};

  const newText = new Set();
  const newStyle = new Set();
  const newDifficulty = new Set();

  for (const g of guides) {
    if (g.title && !(g.title in existingText)) newText.add(g.title);
    if (g.metaTitle && !(g.metaTitle in existingText)) newText.add(g.metaTitle);
    if (g.augmentsTip && !(g.augmentsTip in existingText)) newText.add(g.augmentsTip);
    if (g.style && !(g.style in existingStyle) && !(g.style in existingText)) newStyle.add(g.style);
    if (g.difficulty && !(g.difficulty in existingDifficulty) && !(g.difficulty in existingText))
      newDifficulty.add(g.difficulty);
    if (Array.isArray(g.tips)) {
      for (const t of g.tips) {
        if (t && t.tip && !(t.tip in existingText)) newText.add(t.tip);
      }
    }
  }

  return {
    newText: [...newText],
    newStyle: [...newStyle],
    newDifficulty: [...newDifficulty],
  };
}

function main_descriptionsDiff(liveTraits, liveAugments, descGlossary) {
  const existingTraits = descGlossary.traits || {};
  const existingAugments = descGlossary.augments || {};

  const newTraits = liveTraits
    .filter((t) => !(t.apiName in existingTraits))
    .map((t) => ({ apiName: t.apiName, name: t.name, description: t.description, effects: t.effects }));

  const newAugments = liveAugments
    .filter((a) => !(a.apiName in existingAugments))
    .map((a) => ({ apiName: a.apiName, name: a.name, description: a.description }));

  return { newTraits, newAugments };
}

async function main() {
  const tipsGlossary = JSON.parse(readFileSync(`${__dirname}/../data/tips-glossary.json`, "utf-8"));
  const descGlossary = JSON.parse(readFileSync(`${__dirname}/../data/descriptions-glossary.json`, "utf-8"));

  const [guides, traitsData, augmentsData] = await Promise.all([
    fetchGuides(),
    getJson(`https://tftacademy.com/api/assets/traits?set=${TFT_SET}`),
    getJson(`https://tftacademy.com/api/assets/augments?set=${TFT_SET}`),
  ]);

  const tipsDiff = main_tipsDiff(guides, tipsGlossary);
  const descDiff = main_descriptionsDiff(traitsData.traits, augmentsData.augments, descGlossary);

  const guideSet = guides.find((g) => g.set)?.set ?? null;

  const result = {
    tftSetHardcodedInScripts: TFT_SET,
    liveGuideSet: guideSet,
    setMismatch: guideSet !== null && guideSet !== TFT_SET,
    tips: tipsDiff,
    descriptions: descDiff,
    hasNewContent:
      tipsDiff.newText.length > 0 ||
      tipsDiff.newStyle.length > 0 ||
      tipsDiff.newDifficulty.length > 0 ||
      descDiff.newTraits.length > 0 ||
      descDiff.newAugments.length > 0,
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
