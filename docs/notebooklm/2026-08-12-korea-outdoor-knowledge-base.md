> ⛔ **이 문서는 구판입니다. `2026-08-13-korea-outdoor-knowledge-base.md` 를 읽으십시오.**
> 08-13 판이 이 문서를 대체하며, 공공데이터 연동 조사 결과가 통째로 추가되어 있습니다.
> 아래 내용은 08-12 시점의 기록으로 보존합니다.
>
> 📓 **이 파일이 노트북 LM 보관소입니다** — korea-outdoor 프로젝트의 종합 지식 베이스.
> **이 문서가 최신판이며 이전판을 대체합니다.** (초판, 2026-08-12)
> **문서와 실측이 어긋나면 실측이 우선입니다.** 아래 수치는 2026-08-12 기준 실행 결과이며, 코드가 바뀌면 문서가 아니라 코드가 진실입니다.

# korea-outdoor 지식 베이스 — 2026-08-12

---

# 1부 · 정체성

## 무엇을 만들고 있는가

한국의 야외 레저 장소를 **8개 언어로** 소개하는 정적 웹사이트. 산에서 시작해 섬, 낚시로 확장 예정.

레포: `C:\Users\cartr\korea-outdoor` · 브랜치 `phase-1` (33 커밋) · 원격 미연결

## 왜 만드는가

**국내 산에 외국인 등산객이 늘어나는 현장 관찰**에서 출발했다. 이 사용자는 하나의 집단이 아니라 둘이며, 둘은 필요한 것이 다르다.

| 집단 | 언어 | 특징 | 필요 |
|---|---|---|---|
| 인바운드 관광객 | 영어, 중국어, 일본어 | 단기 체류, 재방문 없음 | 서울에서 반나절 안에 다녀올 곳 하나 |
| 국내 체류 외국인 | 몽골어, 싱할라어, 말레이어, 러시아어 | 노동자·유학생·이주민, 주말 반복 이용 | 거주지 근처, 반복 가능한 곳 |

**핵심 통찰**: 사용자가 처음 제시한 언어 목록(영·몽골·중·일·말레이·스리랑카·러)이 두 개의 다른 서비스를 가리키고 있었다. 몽골어·싱할라어·말레이어·러시아어는 관광객 언어가 아니라 **국내 체류 외국인의 언어**다. 산 능선에서 자주 마주치는 쪽도 후자일 가능성이 높다(관광객은 대체로 남산·북한산 초입까지).

> 참고: "스리랑카어"라는 언어는 없다. 싱할라어(`si`)와 타밀어(`ta`) 두 개이며 본 설계는 싱할라어를 채택했다. 타밀어는 인도 남부·말레이시아에서도 통용되어 확장 1순위.

두 집단은 **별도 사이트로 나누지 않는다.** 같은 `Place` 컬렉션에 정렬·필터만 다르게 적용해 진입점 두 개로 분기한다. 콘텐츠 중복이 없다.

## 세 가지 목적 (사용자 정의)

1. **정확성** — 산림청·국립공원공단·지자체 데이터를 교차 검증. 거리·소요시간·난이도는 공식 데이터 근거.
2. **안전성** — 코스별 주의사항, 계절별 가이드, 응급 대처.
3. **접근성** — 8개 언어를 동등하게.

---

# 2부 · 실측 확정 지식

## 2-1. 실행 결과 (2026-08-12 확인)

```
npm run build     →  23 page(s)
npm test          →  6 files, 54 tests passed
npm run test:e2e  →  31 passed
npx tsc --noEmit  →  (무출력)
axe wcag2a+wcag2aa →  위반 0
i18n 키            →  en 41 / ko 41, 차집합 없음
```

## 2-2. Playwright가 고정한 계약 31개

이 계약들은 세션 내내 사람이 HTML을 읽어 확인하던 것을 기계 검증으로 바꾼 것이다.

| 계약 | 검증 내용 |
|---|---|
| WCAG 2A/2AA | 10개 페이지(en/ko × 홈·목록·상세·안전허브·안전상세) 위반 0 |
| 375px 오버플로 | 10개 페이지 가로 스크롤 0 |
| 폰트 분리 로딩 | `/en/`은 `Noto+Sans+KR` 미로드, `/ko/`는 로드 |
| hreflang | `en`·`ko`·`x-default`만, `mn` 등 미출시 언어 없음 |
| 미확인 표지판 | `bukhansan-dulle-1`만 공지 표시, `inwangsan`은 미표시 |
| 미확인 편의시설 | restroom 필터 켜면 0건 + 빈 메시지 |
| 소요시간 필터 | ≤2h → 3장, 2–3h → 0장, >3h → 0장 |
| JS 없이 목록 | 3건 전부 서버 렌더 |
| 출처 블록 | `.prov` 표시됨 |

## 2-3. 실제로 고장나 있던 것 — 소요시간 필터

**가장 심각했던 결함.** 테스트 51개 초록, 타입 체크 깨끗, 빌드 성공, 서버 렌더 HTML 정확 — 그런데 필터의 3분의 2가 죽어 있었다.

원인은 두 겹:

1. `PlaceCard`가 `data-duration="short"` (버킷 **이름**)를 심음
2. 스크립트는 숫자를 기대 → `parseInt("short")` = `NaN`
3. `|| 0` 폴백이 `NaN`을 0으로 바꿔 **삼킴**

결과:

- `short`: `0 <= 120` → **우연히 동작**
- `mid`: `0 > 120` → 전부 사라짐
- `long`: `0 > 180` → 전부 사라짐

**단위 테스트가 못 잡은 이유**: `matches()`를 숫자로 직접 호출해 검증했다. 함수는 처음부터 옳았다. 틀린 건 **함수에 값이 도달하는 경로** — 문자열 인코딩 후 재파싱하는 이음매였고 거기엔 테스트가 없었다.

**교훈**: 방어 코드(`|| 0`)가 실패를 숨겼다. 폴백이 없었다면 모든 버킷이 0건이 되어 오히려 눈에 띄었을 것이다.

**수정**: 숫자를 심고, `|| 0` 폴백 제거(누락/파싱 실패 시 명시적 에러), 인코드→디코드 왕복 테스트 3건 추가.

## 2-4. 설계 결함 — 스키마가 거짓말을 강요했다

Task 7에서 장소 3건을 쓰는 중 드러났다.

`signage_langs`만 nullable이었고 `restroom`·`water_refill`·`cell_coverage`는 비-nullable이었다. 즉 스키마가 **모르는 것에 대해서도 확정적 답을 강요**했고, 구현자에게 "추측하지 말라"고 지시해놓고 추측 없이는 통과할 수 없는 구조를 준 셈이다.

구현자는 지어냈다: 아차산 화장실 있음, 북한산 둘레길 식수 있음, 통신 상태 양호 등. 전부 미검증.

**왜 심각한가**: 초보 외국인 등산객이 `water_refill: true`를 보고 물을 덜 챙기거나, `cell_coverage: "good"`을 믿고 통신이 안 되는 구간에서 사고를 당하는 게 이 사이트가 막으려던 바로 그 일이다.

**수정**: 세 필드를 nullable로 바꾸고 **인왕산 것까지 포함해** 검증 안 된 값을 전부 `null`로 되돌렸다. 인왕산 값은 계획서에 내가 직접 쓴 것이었지만, 출처가 나라는 게 검증을 대신하지 않는다.

**부수 효과**: "화장실 있음" 필터가 0건을 반환한다. 이건 버그가 아니라 정직한 상태다 — 검증된 데이터가 0건이니 검증된 결과도 0건이어야 한다.

## 2-5. 파생된 자기모순

nullable로 고친 직후 인왕산 파일이 자기모순에 빠졌다.

- 구조화 필드: `water_refill: null` ("모름")
- 본문: "코스 내 식수가 없다" ("확인함")

리뷰어는 `false`로 맞추라 했지만, 그 본문 역시 미검증 문장이었다. 미검증 부재를 "검증된 부재"로 승격시키는 건 처음 문제와 같은 종류다.

**해결 방향**: 본문에서 **사실 단정을 걷어내고 조언만 남김**. "코스 내에 물 공급이 없을 수 있으니 최소 1리터를 준비할 것." 물이 있든 없든 "챙겨라"는 안전하지만, "물이 없다"는 확인한 사람만 할 수 있는 말이다.

## 2-6. 계획서 자체의 버그 2건

구현자가 잡아낸, 계획서의 실제 오류.

| 위치 | 계획서 | 실제 필요 | 이유 |
|---|---|---|---|
| `vitest.config.ts` | `new URL(...).pathname` | `fileURLToPath(new URL(...))` | Windows에서 `.pathname`은 `/C:/Users/...`를 반환해 별칭 해석이 깨짐 |
| `tests/stubs/astro-content.ts` | `export { z } from 'zod'` | `from 'astro/zod'` | `zod`는 직접 의존성이 아님(astro 경유 전이). 바로 임포트하면 npm 호이스팅에 의존 |

**둘 다 계획서 쪽도 정정 필요** (미완료).

## 2-7. 되돌린 리뷰어 제안 5건

리뷰어 판정을 무조건 통과시키면 코드가 검토자 취향으로 채워진다. 근거 확인 후 기각한 것들.

| 제안 | 기각 근거 |
|---|---|
| `tsconfig`에 `target: ES2024` 복원 | `astro/tsconfigs/base.json`이 `noEmit: true` — tsconfig의 target은 산출물에 영향 없음. 원래 값도 스캐폴더가 임의로 넣은 것 |
| `TOLERANCE` 테스트 삭제(동어반복) | 튜닝 노브 **변경 감지기** 역할. 값을 바꾸면 실패가 나서 의도적으로 바꾸게 됨 |
| 테스트 내 도달 불가 가드 유지 | `noUncheckedIndexedAccess`는 `strictest.json`에만 있고 이 프로젝트는 `strict.json` 사용 → 가드가 발동 불가 |
| `clip-path: inset(0)` | **이 값은 클리핑을 하지 않음**(사방 0 = 전부 표시). 숨기려면 `inset(50%)`. 그대로 넣었으면 보호처럼 생긴 무동작 코드가 됨 |
| `.warn`에 ⚠️ 접두사 | 텍스트가 의미를 전부 담고 있어 색은 강조일 뿐(WCAG 1.4.1은 색이 **유일** 수단일 때). 또한 프로젝트가 이모지 아이콘을 명시적으로 금지 |

## 2-8. 강화한 리뷰어 제안 2건

| 리뷰어 제안 | 실제 적용 |
|---|---|
| `SCRIPT_EXTRA`에 "새 Script 추가 시 갱신하라" 주석 | 주석은 빌드를 실패시키지 못함 → `Partial<Record<Script,string>>` → `Record<Script, string \| null>`로 소진적 선언. 가짜 `'thai'` 추가 시 `TS2741` 발동 확인 후 되돌림 |
| enum 중복에 "동기화 유지" 주석 | 타입 전용 임포트 + `satisfies readonly VerificationStatus[]`. `reconcile.ts` 쪽 이름 변경 시 `TS2322` 발동 확인 후 되돌림 |

## 2-9. 보고서 정확도 문제

서브에이전트 보고서가 서술과 증거가 어긋난 사례 3건. **전부 독립 재검증으로 발견.**

1. **Task 10**: "List page matches detail page"라고 쓰고 서로 다른 값(`2시간` vs `2h`)을 나열
2. **Task 11**: "한국어 표기 정상 ✓"이라며 번역된 제목만 인용 → 실제로는 한국어 홈페이지에 영어 문장 3개 + `<h1>Seoul 인근 트레일</h1>`
3. **Task 12**: "키 4개 추가"라고 쓰고 5개 나열(36→41)

**대응으로 도입한 검증**: 한국어 산출물에서 **라틴 문자 산문을 grep**. 사람 눈보다 확실하고 언어가 늘 때마다 반복 가능하다.

```bash
grep -oE "<p[^>]*>[A-Z][a-z]+ [^<]{10,}</p>" dist/ko/**/*.html
```

---

# 3부 · 설계 원칙과 불변 규칙

## 규칙 1 — 언어 목록은 한 곳에만 존재한다

`src/config/languages.ts`가 유일한 출처. 라우팅·hreflang·sitemap·폰트 로딩이 **전부 여기서 파생**된다.

```ts
export const LANGUAGES: readonly Language[] = [
  { code: 'en', label: 'English', script: 'latin',    dir: 'ltr', status: 'live' },
  { code: 'ko', label: '한국어',   script: 'hangul',   dir: 'ltr', status: 'live' },
  { code: 'mn', label: 'Монгол',  script: 'cyrillic', dir: 'ltr', status: 'planned' },
  { code: 'zh', label: '中文',     script: 'sc',       dir: 'ltr', status: 'planned' },
  { code: 'ja', label: '日本語',   script: 'jp',       dir: 'ltr', status: 'planned' },
  { code: 'ms', label: 'Melayu',  script: 'latin',    dir: 'ltr', status: 'planned' },
  { code: 'si', label: 'සිංහල',   script: 'sinhala',  dir: 'ltr', status: 'planned' },
  { code: 'ru', label: 'Русский', script: 'cyrillic', dir: 'ltr', status: 'planned' },
];
```

**성공 기준**: 3번째 언어 추가가 `status: 'planned'` → `'live'` **한 줄 + 콘텐츠 채우기**로 끝나야 한다. Playwright 테스트가 이걸 강제한다(미출시 언어가 hreflang에 없음).

## 규칙 2 — 구조화 필드는 언어 독립적이다

숫자와 enum으로 저장하고 **라벨만 번역**한다.

- `duration_min: 90` (O) / `"약 1시간 30분"` (X)
- `difficulty: 2` (O) / `"보통"` (X)

**부수 효과**: 검색·필터가 공짜로 따라온다. 서술문은 필터링할 수 없지만 구조화 필드는 가능하다.

**적용 사례**: 소요시간 표기를 `${hours}h ${mins}m` 하드코딩에서 매개변수 형식 문자열로 교체.

- `time.hm`: `"{h}h {m}m"` / `"{h}시간 {m}분"`
- `time.h`: `"{h}h"` / `"{h}시간"` (분이 0일 때. `2h 0m`은 버그처럼 읽힘)

접미사 방식(`time.hours: "h"`)은 **기각**했다 — 일본어 `1時間30分`, 중국어 `1小时30分钟`는 `{숫자}{접미사}` 구조로 분리되지 않는다.

## 규칙 3 — `null`은 "미확인"이며, 절대 긍정 필터를 만족시키지 않는다

| 값 | 의미 |
|---|---|
| `null` | 현장 확인 안 됨 |
| `false` / `[]` | 확인했고 없음 |
| `true` / `["ko","en"]` | 확인했고 있음 |

nullable 필드: `signage_langs`, `restroom`, `water_refill`, `cell_coverage`

`matches()`는 `card.signageEn !== true`, `card.restroom !== true`로 판정한다. "미확인"을 "있음"으로 취급하는 순간 이 프로젝트의 존재 이유가 사라진다.

## 규칙 4 — 조용한 실패보다 시끄러운 빌드 실패

정적 빌드는 개발자 기계에서 돈다. 실패해도 불편한 사람이 없다. 대신 얻는 건 잘못된 페이지가 배포되지 않는다는 보장이다.

이 원칙을 적용한 지점들:

| 위치 | 동작 |
|---|---|
| Zod 스키마 | 출처 0건, 영어 텍스트 없음, 좌표 범위 밖 → 빌드 실패 (파일명 지목) |
| `resolveText` | 요청 언어도 영어도 없으면 throw |
| `reconcile` | 빈 입력, 0 이하, `Infinity` → throw |
| `HazardCard` | 존재하지 않는 위험요소 id 참조 → throw (**컬렉션 간 참조라 스키마가 못 막음**) |
| `makeTranslator` | 키 없으면 **키 문자열 자체를 반환** → 누락이 화면에 드러남 |
| 필터 디코드 | `\|\| 0` 폴백 제거 |

**반례로 기각된 것**: `HazardCard`의 "우아한 degradation". 장소가 `hazards: ["steep_stair"]`로 **경고할 위험이 있다고 선언**했는데 독자에게 아무것도 안 보이고 빌드는 성공한다면, 안전 경고를 조용히 누락시키는 것이다.

## 규칙 5 — 검증하지 않은 것을 검증했다고 표시하지 않는다

`provenance`에 출처·데이터셋·조회일을 남기고 **화면에 표시**한다. 표시할 수 없는 검증은 마케팅 문구다.

| 상태 | 조건 | 화면 |
|---|---|---|
| `verified` | 2개 이상 출처가 오차 범위 내 일치 | "2건 이상 공식 정보로 교차 확인" |
| `single_source` | 단일 출처 | "단일 공식 출처" |
| `conflict` | 오차 초과 | "출처 간 정보가 다름" (`--c-warn`, **숨기지 않음**) |

`reconcile()`은 중앙값을 쓴다 — 기관마다 측정 기준과 기준 체력이 달라 이상치가 흔하고, 평균은 끌려간다. 허용 오차 `TOLERANCE = 0.1`은 실데이터를 보고 조정할 튜닝 노브다.

## 규칙 6 — 번역은 2등급

| 등급 | 대상 | 방식 |
|---|---|---|
| A | 안전 가이드, 응급 대처, 위험요소 카드, 경고 문구 | 기계번역 초안 허용, **게시 전 사람 검수 의무** |
| B | 장소 요약·소개, UI 라벨 | 기계번역 후 게시 가능 |

안전 정보 오역은 사람을 다치게 한다. A등급은 **장소 수와 무관하게 개수가 고정**(위험요소 카드 ~12 + 계절 4 + 응급 6~8 ≈ 25건)이라 8개 언어 검수가 현실적이다. 이것이 안전을 핵심 기둥으로 세울 수 있는 이유다.

## 규칙 7 — 폰트는 언어별 스크립트만 로딩

공통 서체 3벌이 **라틴과 키릴을 함께 덮는다**: Source Serif 4(디스플레이) · Inter(본문/UI) · IBM Plex Mono(수치, tabular).

`SCRIPT_EXTRA`에 `latin`/`cyrillic`이 `null`인 것은 누락이 아니라 설계다. 몽골어(실제로 키릴 표기)·러시아어·말레이어는 추가 폰트를 한 바이트도 받지 않는다.

전부 실으면 수 MB. CJK와 싱할라 폰트는 개별적으로 크다.

## 규칙 8 — 디자인은 Swiss Modernism, 라이트 모드 고정

12칼럼 그리드, 8px 단위, **액센트 1개**, 박스보다 헤어라인, 그림자 최소.

**라이트 모드는 협상 불가**: 들머리에서 직사광선 아래 폰으로 읽는 사이트다. 다크 배경은 판독 불가에 가깝다.

색은 의미다:

| 토큰 | 값 | 의미 |
|---|---|---|
| `--c-bg` | `#fafaf7` | 웜 페이퍼(순백 아님) — 야외 반사광 저감 |
| `--c-accent` | `#166534` | 브랜드/링크/활성 |
| `--c-warn` | `#c2410c` | 주의(미확인 표지판, 계단 많음) |
| `--c-danger` | `#b91c1c` | 진짜 위험 |

`.num` 클래스가 모든 수치에 `tabular-nums`를 강제한다 — 값이 바뀌어도 열이 흔들리지 않는다.

**금지**: 스톡 산 사진, 이모지 아이콘, 다크모드 기본값.

## 규칙 9 — URL 구조는 처음부터 `/{lang}/{type}/{slug}`

```
/{lang}/                        홈
/{lang}/mountain/               목록 + 필터
/{lang}/mountain/{slug}         상세
/{lang}/near/{region}           내 주변       ← 체류자 진입점
/{lang}/half-day-from-seoul     반나절권       ← 관광객 진입점
/{lang}/safety/                 안전 허브
/{lang}/safety/{slug}           안전 문서
```

`/{lang}/{slug}`로 시작했다면 섬·낚시 추가 시 전체 URL 마이그레이션 + 축적된 검색 순위 손실이 발생한다.

같은 이유로 `Place` 엔티티가 `type: mountain | island | fishing`을 **지금 이미 허용**한다. 기능은 산만 만들지만 스키마 마이그레이션은 피한다.

---

# 4부 · 현재 상태와 로드맵

## 4-1. Phase 1 진행 — 14/15

| Task | 상태 | 핵심 |
|---|---|---|
| 1. 스캐폴딩 | 완료 | Astro + Tailwind + Vitest |
| 2. 언어 레지스트리 | 완료 | 단일 출처, 6 tests |
| 3. 교차검증 로직 | 완료 | 중앙값 + 편차, 12 tests |
| 4. 번역 폴백 | 완료 | `isFallback` 노출, 7 tests |
| 5. 폰트 분리 로딩 | 완료 | 소진적 `Record<Script,…>`, 6 tests |
| 6. Zod 스키마 | 완료 | 빌드 차단, 11 tests |
| 7. 초기 콘텐츠 | 완료 | 장소 3 + 안전 3 + 사전 |
| 8. 토큰 + 레이아웃 | 완료 | hreflang, 스킵링크 번역 |
| 9. 장소 상세 | 완료 | 6 페이지 |
| 10. 목록 + 필터 | 완료 | 12 tests (왕복 3 포함) |
| 11. 홈 + 진입점 | 완료 | 15 페이지 |
| 12. 안전 허브 | 완료 | 23 페이지 |
| **13. 콘텐츠 15건 확장** | **보류** | 아래 참조 |
| 14. 접근성 검증 | 완료 | Playwright 31 |
| 15. 배포 설정 | 완료 | `site` + sitemap |

## 4-2. Task 13을 보류한 이유 — **사용자 판단 필요**

계획서는 장소를 15건으로 늘리라고 한다. 하지만:

- **아무도 이 등산로를 가보지 않았다.**
- 공공데이터 수집기(`scripts/fetch/*`)는 실제 API 엔드포인트를 확인해야 해서 계획서가 **의도적으로 범위 밖**에 뒀다.
- 그래서 현재 `provenance`는 **손으로 적은 자리표시자**이며, 실제 조회 기록이 아니다.

3건에서는 파이프라인 검증용으로 타당했다. 12건을 더 만들면 편의시설 전부 `null`, 서술문 일반론, 출처 미조회인 항목이 12개 더 생긴다. **공공데이터가 붙는 순간 전부 다시 써야 한다.**

**권고 순서**: 공공데이터포털에서 산림청·국립공원공단 API 확인 → `scripts/fetch/*` 구현 → 실제 조회 결과로 15건 채움. 그러면 `reconcile()`(Task 3에서 만들고 테스트까지 끝냈지만 **아직 호출자가 없는 함수**)도 그때 연결된다.

## 4-3. 출시 전 차단 항목

| 항목 | 상태 |
|---|---|
| `provenance`가 실제 조회 기록이 아님 | **차단** — 공공데이터 연동 전 출시 불가 |
| 편의시설 데이터 0건 검증 | 현장 확인 또는 공식 출처 필요 |
| `signage_langs` 현장 수집 | 공공데이터에 없음. 자체 수집이 곧 진입장벽 |
| A등급 안전 콘텐츠 사람 검수 | en/ko 미검수 |
| 도메인 미확정 | `astro.config.mjs`의 `site` 한 줄만 교체하면 됨 |
| 원격 저장소 미연결 | GitHub push + Cloudflare Pages 연결은 사용자 계정 작업 |

## 4-4. Phase 2 이후 (미확정)

- **Phase 2** 인증 + 장소별 댓글. Google OAuth 우선. **댓글 원문 + 번역 토글은 필수 구조** — 언어별로 파편화되면 각 언어권 댓글 수가 0에 수렴한다. 앱 대비 다중 provider 스키마(iOS는 소셜 로그인 시 Apple 로그인 병행이 심사 요건). **중국 본토는 Google 차단** → 읽기는 항상 비로그인으로 완전 가능해야 함.
- **Phase 3** 수익화. 디스플레이 광고는 이 트래픽 규모에서 주 수익원이 되기 어렵다. 교통·셔틀 중개, 장비 렌탈 제휴, 산 아래 상권 리스팅, 관광 정책 지원사업이 더 현실적.
- **Phase 4** 섬 → 낚시. 낚시는 규제·면허·금지구역 등 안전 축이 산과 달라 별도 설계 필요.
- **Phase 5** 모바일 앱. 오프라인 지도와 GPS 트랙이 필요해지는 시점이 앱의 진짜 이유.

---

# 5부 · 시스템 스냅샷 + 복구 프로토콜

## 5-1. 환경

- **OS**: Windows 11. Bash(Git Bash) + PowerShell 병용. 경로는 슬래시 사용.
- **레포**: `C:\Users\cartr\korea-outdoor` — 트레이딩 봇(`Claude-project`)과 **무관한 별도 레포**
- **브랜치**: `phase-1` (`main`에서 분기, 미병합)

## 5-2. 스택

```
astro                 ^5.2.3   (스캐폴드 시 5.18.2 설치)
typescript            ^5.9.3   astro/tsconfigs/strict
vitest                ^4.1.10
@playwright/test      ^1.62.1
@axe-core/playwright  ^4.13.0
@astrojs/sitemap      ^3.7.3
@astrojs/tailwind     ^6.0.2   (tailwindcss ^3.4.19)
```

**Tailwind는 설치되어 있으나 의도적으로 미사용.** 스타일은 `tokens.css` + 스코프 `<style>`로 처리한다.

## 5-3. 명령

```bash
npm run build      # 23 페이지
npm test           # vitest, 54개
npm run test:e2e   # playwright, 31개
npx tsc --noEmit -p tsconfig.json
npm run preview    # localhost:4321
```

## 5-4. 파일 구조

```
src/
  config/languages.ts          언어 레지스트리 — 유일한 언어 목록
  lib/
    reconcile.ts               교차검증 (호출자 없음, 타입만 소비됨)
    i18n.ts                    resolveText / makeTranslator
    fonts.ts                   스크립트별 폰트 URL
    filter.ts                  matches / CardData / FilterState
  content/
    config.ts                  Zod 스키마 (Place, Safety)
    places/*.json              3건
    safety/*.json              3건
  i18n/{en,ko}.json            41키, 패리티
  components/
    PlaceCard.astro  MetricRow.astro
    HazardCard.astro ProvenanceBlock.astro
  layouts/Base.astro           hreflang, 폰트, 스킵링크
  styles/tokens.css
  pages/
    index.astro                루트 → /en/ (meta refresh + 가시 링크)
    [lang]/index.astro
    [lang]/mountain/{index,[slug]}.astro
    [lang]/near/[region].astro
    [lang]/half-day-from-seoul.astro
    [lang]/safety/{index,[slug]}.astro
tests/
  *.test.ts                    vitest (languages/reconcile/i18n/fonts/schema/filter)
  e2e/a11y.spec.ts             playwright 31
  stubs/astro-content.ts       astro:content 스텁
```

## 5-5. 함정 (실제로 밟은 것들)

1. **`Astro.redirect()`는 SSR 전용.** `output: 'static'`에서 동작하지 않는다. 루트는 `<meta http-equiv="refresh">` + **가시 링크**로 처리했다. 가시 링크는 선택이 아니다 — meta refresh를 무시하는 환경에서 사용자가 갇힌다.
2. **`vitest.config.ts`의 `astro:content` 별칭**은 `fileURLToPath()`로 감싸야 한다. Windows에서 `.pathname`은 앞에 슬래시가 붙는다.
3. **스텁은 `astro/zod`에서 임포트.** `zod`는 직접 의존성이 아니다.
4. **Astro 5.18.2는 `type: 'data'`를 여전히 지원**한다(`DataCollectionConfig` 존재, deprecation 경고 없음). 새 `loader: glob()` API로 바꿀 필요 없었다.
5. **`clip-path: inset(0)`은 숨기지 않는다.** `.sr-only`에는 `inset(50%)`. `:focus`에서 `clip: auto`만 되돌리고 `clip-path: none`을 빠뜨리면 키보드 사용자에게만 조용히 고장난다.
6. **vitest는 `tests/**/*.test.ts`, Playwright는 `tests/e2e/*.spec.ts`** — 패턴이 겹치지 않아 충돌 없음.
7. **GateGuard 훅**이 첫 Bash와 모든 Write/Edit 앞에서 "사실 블록"을 요구한다. 정상 동작이며 실패가 아니다.

## 5-6. 검증 규율 (이 세션에서 확립)

**보고서를 믿지 않는다.** 서브에이전트 보고서 3건에서 서술과 증거가 어긋났고 전부 독립 재검증으로 발견했다.

체크 항목:

1. **빌드 종료 코드가 아니라 산출된 HTML을 읽는다.** `dist/`에서 실제 태그를 인용하게 한다.
2. **통과한 것만 인용하는 보고서를 경계한다.** "정상 ✓"이라며 일부만 인용하면 나머지를 직접 확인한다.
3. **한국어 페이지에서 라틴 산문을 grep한다.**
4. **가드가 실제로 발동하는지 임시 편집으로 확인하고 되돌린다.** (가짜 `Script` 멤버, 잘못된 enum 값, 존재하지 않는 hazard id — 세 번 다 발동 확인 후 복구)
5. **단위 테스트가 초록이어도 이음매는 별도 검증한다.** 소요시간 필터 버그가 그 자리에 있었다.

## 5-7. 다음 세션 시작점

1. 이 문서를 읽는다.
2. `cd C:\Users\cartr\korea-outdoor && git log --oneline -5 && npm test && npm run build`로 실측 확인.
3. `docs/superpowers/specs/2026-08-10-phase1-multilingual-place-platform-design.md` — 설계 스펙
4. `docs/superpowers/plans/2026-08-10-phase1-implementation.md` — 15개 작업 계획 (**§2-6의 버그 2건 미정정 상태**)
5. 미착수: Task 13(보류, 사용자 판단 대기), 계획서 버그 정정, 원격 저장소 연결
