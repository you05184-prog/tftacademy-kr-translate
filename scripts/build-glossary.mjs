// Data Dragon(공식 라이엇 데이터)과 tftacademy API를 apiName 기준으로 매칭해서
// data/glossary.json (고유명사 한글 명칭 사전)을 생성한다.
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = `${__dirname}/../data/glossary.json`;
const OVERRIDES_PATH = `${__dirname}/../data/manual-overrides.json`;
const overrides = JSON.parse(readFileSync(OVERRIDES_PATH, "utf-8"));

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function buildDdragonMap(ddragonVersion, file) {
  const json = await getJson(
    `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/ko_KR/${file}`
  );
  const map = {};
  for (const entry of Object.values(json.data)) {
    // entry.id는 tftacademy의 apiName과 동일한 형식 (예: TFT17_Briar)
    map[entry.id] = entry.name;
  }
  return map;
}

async function buildCategory(kind, ddragonFile, tftSet) {
  const [ddragonMap, siteData] = await Promise.all([
    buildDdragonMap(GLOBAL_DDRAGON_VERSION, ddragonFile),
    getJson(`https://tftacademy.com/api/assets/${kind}?set=${tftSet}`),
  ]);
  const overrideMap = overrides[kind] || {};

  const items = siteData[kind];
  const result = {};
  let matched = 0;
  let overridden = 0;
  for (const it of items) {
    let nameKo = ddragonMap[it.apiName] ?? null;
    if (nameKo) {
      matched++;
    } else if (overrideMap[it.apiName]) {
      nameKo = overrideMap[it.apiName];
      overridden++;
    }
    result[it.apiName] = {
      name_en: it.name,
      name_ko: nameKo,
    };
  }
  console.log(
    `[${kind}] ${matched}/${items.length} matched with Data Dragon, ${overridden} from manual overrides, ${
      items.length - matched - overridden
    } still missing`
  );
  return result;
}

let GLOBAL_DDRAGON_VERSION;

async function main() {
  const versions = await getJson("https://ddragon.leagueoflegends.com/api/versions.json");
  GLOBAL_DDRAGON_VERSION = versions[0];
  console.log(`Data Dragon version: ${GLOBAL_DDRAGON_VERSION}`);

  const TFT_SET = 17;

  const [champions, items, traits, augments] = await Promise.all([
    buildCategory("champions", "tft-champion.json", TFT_SET),
    buildCategory("items", "tft-item.json", TFT_SET),
    buildCategory("traits", "tft-trait.json", TFT_SET),
    buildCategory("augments", "tft-augments.json", TFT_SET),
  ]);

  const glossary = {
    generatedAt: new Date().toISOString(),
    ddragonVersion: GLOBAL_DDRAGON_VERSION,
    tftSet: TFT_SET,
    champions,
    items,
    traits,
    augments,
  };

  mkdirSync(`${__dirname}/../data`, { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(glossary, null, 2), "utf-8");
  console.log(`Wrote ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
