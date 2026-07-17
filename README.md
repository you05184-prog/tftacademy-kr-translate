# tftacademy-kr-translate

[tftacademy.com](https://tftacademy.com) (TFT/롤토체스 티어리스트·조합 공략 사이트)의 **Tierlist 탭(`/tierlist/*`) 화면만** 한글로 번역하는 Tampermonkey 유저스크립트.

> 다른 PC에서 새 세션으로 이 프로젝트를 이어갈 경우, 이 README가 진실 공급원(source of truth)입니다. 대화 히스토리나 로컬 메모리에 의존하지 말고 이 문서와 저장소 현재 상태를 기준으로 작업하세요.

## 범위

- 번역 대상: `tftacademy.com/tierlist/*` (Comps / Items / Augments 탭, 조합 상세 페이지 포함)
- **번역 제외**: 상단 네비게이션 바, 티어 뱃지 이미지(S/A/B/C/X TIER), 푸터, Guides/Study Hall/Tools/Set Info/Academy+/로그인 등 Tierlist 밖의 다른 탭 화면

## 어떻게 동작하는가 (핵심 아키텍처)

이 사이트(SvelteKit 앱)는 챔피언/아이템/특성/증강 데이터를 아래 4개의 공개 API에서 통째로 불러온 뒤, 그 데이터를 화면 표시·호버 툴팁·클릭 시 뜨는 조합 상세까지 전부 재사용한다:

- `tftacademy.com/api/assets/champions?set={N}`
- `tftacademy.com/api/assets/items?set={N}`
- `tftacademy.com/api/assets/traits?set={N}`
- `tftacademy.com/api/assets/augments?set={N}`

각 항목은 라이엇 공식 내부 식별자 `apiName`(예: `TFT17_Briar`)을 갖고 있음. 유저스크립트는 `window.fetch`를 몽키패치해서 이 4개 API 응답이 도착하는 순간 `apiName` 기준으로 `name` 필드를 공식 한글 명칭으로 바꿔치기한다. 데이터 레이어에서 한 번에 치환하기 때문에 카드 표시/호버 툴팁/클릭 상세 화면까지 별도 작업 없이 전부 번역된다 (Playwright로 실제 확인 완료: 조합 상세 페이지의 챔피언 아이콘, Early Units, Item Priority, Positioning Example, Alt Builds 전부 한글로 표시됨).

## 번역 원칙 (제일 중요)

- **고유명사(챔피언명, 아이템명, 특성명, 증강명)는 반드시 라이엇 공식 데이터(Data Dragon) 기준 공식 한글 명칭을 사용**해야 함. 임의 의역 금지. → 완료 (`data/glossary.json`)
- 사이트 자체 팁/코멘터리(예: 조합별 `Tips`, `augmentsTip` 등)는 자유롭게 의역 가능하나, 이건 위 4개 API가 아니라 페이지에 서버사이드로 직접 심어지는 데이터라 별도 파이프라인 필요 → **미구현, TODO**
- 챔피언/아이템/특성/증강의 `description`/`ability`/`effects`/`rules` (스킬 설명 등 상세 텍스트)도 위 4개 API 안에 있지만 Data Dragon은 이름만 제공하고 설명 전문은 없음 → Claude 기반 번역 파이프라인 필요, **미구현, TODO**

## 용어집 (`data/glossary.json`)

`scripts/build-glossary.mjs`로 생성. Data Dragon(ko_KR) + tftacademy 라이브 API를 `apiName` 기준 매칭.

- traits: 42/42 매칭
- champions: 64/81 Data Dragon 매칭 + 11개 수동 보정(`data/manual-overrides.json`, 아노말리 챔피언 변형 등) = 75/81, 6개 미매칭(레벨 표시자 등 사소한 항목)은 영어로 폴백
- augments: 263/266 매칭, 3개 미매칭은 영어 폴백
- items: 270/276 매칭, 6개 미매칭은 영어 폴백

미매칭 항목은 한글 명칭이 없으면 원본 영어를 그대로 표시하도록 안전하게 폴백 처리됨 (번역 실패로 화면이 깨지지 않음).

재생성: `node scripts/build-glossary.mjs` (현재 `tftSet`은 스크립트 상단에 하드코딩되어 있음 — 새 시즌 전환 시 수정 필요)

## 자동 업데이트 구조

- 이 저장소는 **Public**이어야 함 — Tampermonkey가 `raw.githubusercontent.com`의 파일을 `@updateURL`/`@downloadURL`로 인증 없이 주기적으로 확인하기 때문.
- tftacademy.com은 매일 업데이트되며, 업데이트 여부는 사이트 상단 "Last Updated"에서 확인 가능.
- 클라우드 예약 루틴("tftacademy-kr-translate sync", claude.ai/code/routines)이 매일 한국시간 **08:00, 14:00** 두 번 실행됨. "Last Updated" 표시를 파싱하는 대신 `scripts/find-new-content.mjs`로 라이브 사이트 전체를 다시 긁어 기존 glossary와 diff — 새 항목만 골라 번역하고 `scripts/merge-translations.mjs`로 병합. 대부분의 실행에서는 변경 없음(git status 비어있음)으로 끝나고 커밋/푸시가 발생하지 않음.
- Tampermonkey가 새 버전을 인식하려면 `tftacademy-kr-translate.user.js`의 `@version` 값을 올릴 때마다 갱신해야 함 — 자동화 로직에서 반드시 버전을 bump할 것.

## 파일 구조

- `tftacademy-kr-translate.user.js` — 실제 배포되는 유저스크립트 (fetch 인터셉트 기반 고유명사 번역 구현됨)
- `scripts/build-glossary.mjs` — Data Dragon + tftacademy API로 `data/glossary.json` 생성
- `scripts/find-new-content.mjs` — 라이브 사이트(가이드 팁 + 특성/증강 설명)와 기존 glossary 파일을 비교해서 **아직 번역 안 된 항목만** JSON으로 출력. 예약 에이전트가 전체 파일을 매번 읽어서 눈으로 대조하지 않고 이 diff 결과만 보고 번역하도록 해서 토큰/시간을 절약함.
- `scripts/merge-translations.mjs` — `find-new-content.mjs`가 찾은 항목의 번역 결과(패치 JSON)를 `data/tips-glossary.json`/`data/descriptions-glossary.json`에 병합(append-only, 기존 키 보존)
- `data/glossary.json` — apiName → 한글 명칭 매핑 (자동 생성 파일)
- `data/manual-overrides.json` — Data Dragon에 없는 apiName 수동 보정
- `README.md` — 이 문서

## 설치 방법 (사용자용)

1. 브라우저에 Tampermonkey 확장 설치
2. `tftacademy-kr-translate.user.js` 파일의 Raw 링크로 접속하면 설치 프롬프트가 뜸
3. 이후 tftacademy.com/tierlist/* 방문 시 자동으로 챔피언/아이템/특성/증강 이름이 한글로 표시되고, 저장소에 새 버전이 올라오면 Tampermonkey가 자동 갱신

## 진행 상태 / TODO

- [x] 저장소 세팅, 유저스크립트 스켈레톤
- [x] 챔피언/아이템/특성/증강 공식 한글 명칭 용어집 구축 (Data Dragon 기반)
- [x] fetch 인터셉트 기반 번역 로직 (카드 표시 + 호버 툴팁 + 클릭 상세 화면 전부 커버, Playwright로 검증 완료)
- [x] 사이트 자체 팁(제목/스타일/난이도/augmentsTip/Stage별 tips) 번역 — `data/tips-glossary.json`, 현재 게시된 조합 67개 전부 번역 완료. DOM 텍스트 치환(MutationObserver, `characterData` 포함) 방식으로 적용, Playwright로 검증 완료
  - 주의: Svelte는 텍스트를 기존 노드의 `characterData` 변경으로 갱신하는 경우가 많아 `childList`만으로는 감지 안 됨 — 반드시 `characterData: true`도 관찰해야 함
- [x] 특성(trait) description + effects 번역 (42/42) — `data/descriptions-glossary.json`, fetch 인터셉트로 적용 (호버 툴팁/카드 자동 반영, 챔피언명과 동일한 메커니즘)
  - 참고: Set 17은 최신 세트라 일부 신규 키워드(정밀/Precision, 행운/Lucky 등)는 공식 로컬라이제이션 대조 자료가 없어 통상적인 번역 관례를 따른 추정 번역 — 추후 검증 필요
- [x] 증강(augment) description 번역 (266/266) — 동일한 fetch 인터셉트 메커니즘으로 적용, API 응답 레벨에서 검증 완료
- [ ] 챔피언 스킬 설명(ability) 번역 — 사용자가 불필요하다고 확인함, 진행 안 함
- [x] 클라우드 예약 루틴 설정 (매일 08:00, 14:00 KST, "tftacademy-kr-translate sync") — diff 스크립트(`find-new-content.mjs`/`merge-translations.mjs`) 기반으로 동작해서 변경 없는 실행은 빠르게 종료됨
