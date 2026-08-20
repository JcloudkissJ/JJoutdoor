# korea-outdoor

한국의 야외 레저 장소를 8개 언어로 소개하는 플랫폼. 산에서 시작해 섬, 낚시로 확장한다.

> 레포 이름은 작업용이다. 최종 도메인과 브랜드명이 정해지면 변경한다.

## 무엇을 만드는가

국내 산에서 외국인 등산객이 늘어나는 현장 관찰에서 출발했다. 대상은 두 집단이다.

- **인바운드 관광객** — 영어, 중국어, 일본어
- **국내 체류 외국인** — 몽골어, 싱할라어, 말레이어, 러시아어

두 집단 모두 "어떻게 가는지, 무엇을 챙기는지, 어디가 안전한지"를 모국어로 알 수 없다.

## 세 가지 원칙

1. **정확성** — 산림청·국립공원공단·지자체 데이터를 교차 검증하고, 출처와 검증
   상태를 화면에 표시한다. 표시할 수 없는 검증은 주장하지 않는다.
2. **안전성** — 코스별 주의사항, 계절 가이드, 응급 대처를 체계적으로 제공한다.
   안전 관련 번역은 기계번역만으로 게시하지 않는다.
3. **접근성** — 8개 언어를 동등하게 다룬다. 구조화 데이터를 우선하고 자유 서술을
   최소화해, 언어가 늘어도 유지보수 비용이 선형으로 늘지 않게 한다.

## 현재 상태

> 📓 **노트북 LM 보관소부터 찾아주세요** — 종합 지식 베이스: [docs/notebooklm/2026-08-20-korea-outdoor-knowledge-base.md](docs/notebooklm/2026-08-20-korea-outdoor-knowledge-base.md)

Phase 1 구현 14/15 완료 (브랜치 `phase-1`). 영어·한국어 출시분이 동작한다.

```
npm run build     23 pages
npm test          54 passed
npm run test:e2e  31 passed  (WCAG 2A/2AA 위반 0)
```

남은 것: Task 13(장소 15건 확장) — **공공데이터 연동 전까지 보류.** 현재 `provenance`는
실제 조회 기록이 아니라 손으로 적은 자리표시자이며, 지금 12건을 더 만들면 데이터가
붙는 순간 전부 다시 써야 한다. 배경은 지식 베이스 §4-2 참조.

- 설계: [docs/superpowers/specs/2026-08-10-phase1-multilingual-place-platform-design.md](docs/superpowers/specs/2026-08-10-phase1-multilingual-place-platform-design.md)
- 구현 계획: [docs/superpowers/plans/2026-08-10-phase1-implementation.md](docs/superpowers/plans/2026-08-10-phase1-implementation.md)

## 로드맵

| Phase | 내용 | 상태 |
|---|---|---|
| 1 | 다국어 장소 정보 기반 (산 15개, 8개 언어, 안전 콘텐츠) | 14/15 (en·ko 출시분 동작) |
| 2 | 인증 + 장소별 댓글 (Google OAuth, 원문/번역 토글) | 미착수 |
| 3 | 수익화 (교통 중개, 장비 렌탈 제휴, 지역 상권 리스팅) | 미착수 |
| 4 | 도메인 확장 (섬 → 낚시) | 미착수 |
| 5 | 모바일 앱 (오프라인 지도, GPS 트랙) | 미착수 |

각 Phase는 독립된 스펙 → 계획 → 구현 주기를 갖는다.

## 기술 스택 (Phase 1)

Astro (정적 생성) · Cloudflare Pages · 콘텐츠는 Git 내 JSON

상시 서버 없음. Phase 2에서 Supabase를 붙인다.
