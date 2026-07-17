# tftacademy-kr-translate

[tftacademy.com/tierlist/comps](https://tftacademy.com/tierlist/comps) (TFT/롤토체스 티어리스트·조합 공략 사이트)를 한글로 번역하는 Tampermonkey 유저스크립트.

> 다른 PC에서 새 세션으로 이 프로젝트를 이어갈 경우, 이 README가 진실 공급원(source of truth)입니다. 대화 히스토리나 로컬 메모리에 의존하지 말고 이 문서와 저장소 현재 상태를 기준으로 작업하세요.

## 무엇을 하는가

- 원본 사이트는 건드리지 않고, 브라우저에서 Tampermonkey가 페이지 로드시 텍스트를 실시간으로 한글 치환.
- 번역 대상:
  - 클릭 시 뜨는 숨김 모달 (조합 상세)
  - 마우스 호버 시 뜨는 챔피언 / 아이템 / 특성 / 증강 툴팁
  - 페이지 상의 일반 텍스트, 사이트 자체 팁/코멘터리

## 번역 원칙 (제일 중요)

- **고유명사(챔피언명, 아이템명, 특성명, 증강명, 효과명 등)는 반드시 라이엇 공식 데이터(Data Dragon 등) 기준 공식 한글 명칭을 사용**해야 함. 임의 의역 금지.
- 사이트 자체 팁/코멘터리 등 설명 텍스트는 자유롭게 의역 가능.

## 자동 업데이트 구조

- 이 저장소는 **Public**이어야 함 — Tampermonkey가 `raw.githubusercontent.com`의 `tftacademy-kr-translate.user.js`를 `@updateURL`/`@downloadURL`로 인증 없이 주기적으로 확인하기 때문.
- tftacademy.com은 매일 업데이트되며, 업데이트 여부는 사이트 상단에서 확인 가능.
- 클라우드 예약 에이전트가 매일 한국시간 **08:00, 14:00** 두 번 사이트 업데이트 여부를 체크하고, 변경이 있으면 재번역 후 이 저장소에 새 버전을 커밋/푸시함.
- Tampermonkey가 새 버전을 인식하려면 `@version` 값을 올릴 때마다 갱신해야 함 — 자동화 로직에서 반드시 버전을 bump할 것.

## 파일 구조

- `tftacademy-kr-translate.user.js` — 실제 배포되는 유저스크립트 (현재 스켈레톤 단계, 번역 로직 미구현)
- `README.md` — 이 문서

## 설치 방법 (사용자용)

1. 브라우저에 Tampermonkey 확장 설치
2. `tftacademy-kr-translate.user.js` 파일의 Raw 링크로 접속하면 설치 프롬프트가 뜸
3. 이후 tftacademy.com/tierlist/comps 방문 시 자동으로 번역 적용, 이 저장소의 새 버전이 나오면 Tampermonkey가 자동 갱신

## 진행 상태 / TODO

- [x] 저장소 세팅, 유저스크립트 스켈레톤
- [ ] 챔피언/아이템/특성/증강 공식 한글 명칭 용어집 구축 (Data Dragon 기반)
- [ ] 페이지 기본 텍스트 번역 로직
- [ ] 클릭 시 뜨는 조합 상세 모달 번역 로직
- [ ] 호버 툴팁(챔피언/아이템/특성/증강) 번역 로직
- [ ] 클라우드 예약 에이전트 설정 (매일 08:00, 14:00 KST 업데이트 체크 및 자동 푸시)
