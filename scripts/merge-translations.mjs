// find-new-content.mjs가 찾아낸 "번역 안 된 항목"들을 실제로 번역한 결과(패치 JSON)를
// data/tips-glossary.json, data/descriptions-glossary.json에 병합한다.
// 기존 키는 절대 건드리지 않고 새 키만 추가한다 (append-only).
//
// 사용법: node scripts/merge-translations.mjs patch.json
//
// patch.json 형식:
// {
//   "tips": { "English string": "한글 번역", ... },       // optional
//   "style": { "New Style Name": "한글 번역", ... },       // optional, enums.style에 추가
//   "difficulty": { "NEW_ENUM": "한글 번역", ... },        // optional, enums.difficulty에 추가
//   "traits": { "apiName": { "description_ko": "...", "effects_ko": [...] } },   // optional
//   "augments": { "apiName": { "description_ko": "..." } }                       // optional
// }

import { readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TIPS_PATH = `${__dirname}/../data/tips-glossary.json`;
const DESC_PATH = `${__dirname}/../data/descriptions-glossary.json`;

const patchPath = process.argv[2];
if (!patchPath) {
  console.error("사용법: node scripts/merge-translations.mjs <patch.json>");
  process.exit(1);
}

const patch = JSON.parse(readFileSync(patchPath, "utf-8"));

let tipsChanged = 0;
let descChanged = 0;

if (patch.tips || patch.style || patch.difficulty) {
  const tipsGlossary = JSON.parse(readFileSync(TIPS_PATH, "utf-8"));
  tipsGlossary.text = tipsGlossary.text || {};
  tipsGlossary.enums = tipsGlossary.enums || {};
  tipsGlossary.enums.style = tipsGlossary.enums.style || {};
  tipsGlossary.enums.difficulty = tipsGlossary.enums.difficulty || {};

  for (const [k, v] of Object.entries(patch.tips || {})) {
    if (!(k in tipsGlossary.text)) {
      tipsGlossary.text[k] = v;
      tipsChanged++;
    }
  }
  for (const [k, v] of Object.entries(patch.style || {})) {
    if (!(k in tipsGlossary.enums.style)) {
      tipsGlossary.enums.style[k] = v;
      tipsChanged++;
    }
  }
  for (const [k, v] of Object.entries(patch.difficulty || {})) {
    if (!(k in tipsGlossary.enums.difficulty)) {
      tipsGlossary.enums.difficulty[k] = v;
      tipsChanged++;
    }
  }

  if (tipsChanged > 0) {
    writeFileSync(TIPS_PATH, JSON.stringify(tipsGlossary, null, 2), "utf-8");
  }
}

if (patch.traits || patch.augments) {
  const descGlossary = JSON.parse(readFileSync(DESC_PATH, "utf-8"));
  descGlossary.traits = descGlossary.traits || {};
  descGlossary.augments = descGlossary.augments || {};

  for (const [apiName, entry] of Object.entries(patch.traits || {})) {
    if (!(apiName in descGlossary.traits)) {
      descGlossary.traits[apiName] = entry;
      descChanged++;
    }
  }
  for (const [apiName, entry] of Object.entries(patch.augments || {})) {
    if (!(apiName in descGlossary.augments)) {
      descGlossary.augments[apiName] = entry;
      descChanged++;
    }
  }

  if (descChanged > 0) {
    writeFileSync(DESC_PATH, JSON.stringify(descGlossary, null, 2), "utf-8");
  }
}

console.log(`tips-glossary.json: +${tipsChanged} keys, descriptions-glossary.json: +${descChanged} entries`);
