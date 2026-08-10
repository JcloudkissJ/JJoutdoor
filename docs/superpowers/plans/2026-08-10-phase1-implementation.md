# Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 한국 산 15곳의 코스·접근·안전 정보를 영어와 한국어로 제공하는 정적 사이트를 만들고, 3번째 언어 추가가 코드 수정 없이 가능한 구조를 갖춘다.

**Architecture:** Astro 정적 생성. 콘텐츠는 Git 내 JSON을 Content Collections(Zod)로 타입 검증한다. 공공데이터는 별도 스크립트로 수집·교차검증해 콘텐츠 JSON을 만들며, 원본은 보존한다. 언어 레지스트리 하나가 라우팅·hreflang·sitemap·폰트 로딩을 전부 파생시킨다. 상시 서버는 없다.

**Tech Stack:** Astro 5, TypeScript, Tailwind CSS 4, Zod (Astro Content Collections), Vitest, Playwright + axe-core, Cloudflare Pages

---

## 설계 근거 요약

스펙: `docs/superpowers/specs/2026-08-10-phase1-multilingual-place-platform-design.md`

이 계획이 반복해서 지키는 세 가지 규칙이다. 어떤 작업이든 이것과 충돌하면 작업이 틀린 것이다.

1. **구조화 필드는 언어 독립적이다.** 숫자와 enum으로 저장하고 라벨만 번역한다.
2. **언어 목록은 한 곳에만 존재한다.** 라우팅·hreflang·sitemap·폰트가 전부 거기서 파생된다.
3. **검증하지 않은 것을 검증했다고 표시하지 않는다.** `conflict`는 숨기지 않고 노출한다.

## 디자인 시스템 (확정)

스타일 방향은 **Swiss Modernism 2.0**이다. 12칼럼 그리드, 수학적 간격, 액센트 1개,
장식 배제. 참조 레퍼런스(impeccable.style)의 본질도 스위스 그리드 + 에디토리얼이며,
우리는 야외 판독성을 위해 그것을 라이트 모드로 뒤집는다.

### 색

액센트는 하나(포레스트)다. 안전색은 브랜드 액센트가 아니라 시맨틱 색이며 별도로 관리한다.

| 역할 | 값 | 용도 |
|---|---|---|
| `--c-bg` | `#FAFAF7` | 페이지 배경. 순백이 아니라 웜 페이퍼 — 야외 반사광을 줄인다 |
| `--c-surface` | `#FFFFFF` | 카드 |
| `--c-fg` | `#111311` | 본문 |
| `--c-fg-muted` | `#5A625A` | 보조 텍스트 |
| `--c-line` | `#E2E5E0` | 헤어라인 구획 |
| `--c-accent` | `#166534` | 브랜드 액센트. 링크, 활성 상태 |
| `--c-warn` | `#C2410C` | 주의 (계단 많음, 표지판 미확인) |
| `--c-danger` | `#B91C1C` | 위험 (낙석, 급경사) |

### 타이포그래피

라틴 전용 디스플레이 서체를 시스템 중심에 두면 3번째 언어에서 무너진다. 그래서
**라틴+키릴을 한 서체가 덮고, 나머지 스크립트는 Noto로 폴백**한다.

| 역할 | 서체 | 커버 |
|---|---|---|
| Display | Source Serif 4 | Latin, Cyrillic |
| Body/UI | Inter | Latin, Cyrillic |
| 수치·데이터 | IBM Plex Mono (tabular) | Latin, Cyrillic |
| 한국어 | Noto Sans KR | Hangul |
| 일본어 | Noto Sans JP | Kana/Kanji |
| 중국어 | Noto Sans SC | Han |
| 싱할라 | Noto Sans Sinhala | Sinhala |

**언어별로 필요한 스크립트만 로딩한다.** 전부 실으면 수 MB가 된다.

### 레이아웃

12칼럼 그리드, 8px 기본 단위. 브레이크포인트 375 / 768 / 1024 / 1440.
박스보다 헤어라인으로 구조를 만든다. 카드 그림자는 최소.

### 모션

150–250ms, `ease-out`. `transform`/`opacity`만 애니메이션한다.
데이터 목록에 overshoot 이징(`back.out`)을 쓰지 않는다 — 정보성 UI에서 조잡하게 읽힌다.
`prefers-reduced-motion`을 존중한다.

### 금지

- 스톡 산 사진(generic photos). 실제 한국 등산로 사진만 사용한다.
- 아이콘으로 이모지 사용
- 다크모드 기본값

---

## File Structure

```
korea-outdoor/
├─ src/
│  ├─ config/
│  │  └─ languages.ts          언어 레지스트리 — 유일한 언어 목록
│  ├─ lib/
│  │  ├─ reconcile.ts          교차검증 로직
│  │  ├─ i18n.ts               번역 조회 + 폴백
│  │  ├─ fonts.ts              스크립트별 폰트 링크 생성
│  │  └─ filter.ts             목록 필터 판정
│  ├─ content/
│  │  ├─ config.ts             Zod 스키마 (Place, Safety)
│  │  ├─ places/*.json
│  │  └─ safety/*.json
│  ├─ i18n/
│  │  ├─ en.json               UI 라벨 사전
│  │  └─ ko.json
│  ├─ components/
│  │  ├─ PlaceCard.astro
│  │  ├─ MetricRow.astro       수치 표시 (모노, tabular)
│  │  ├─ HazardCard.astro
│  │  └─ ProvenanceBlock.astro 출처·검증 상태
│  ├─ layouts/
│  │  └─ Base.astro            hreflang, 폰트, 스킵링크
│  ├─ styles/
│  │  └─ tokens.css
│  └─ pages/
│     ├─ index.astro
│     └─ [lang]/
│        ├─ index.astro
│        ├─ mountain/index.astro
│        ├─ mountain/[slug].astro
│        ├─ near/[region].astro
│        ├─ half-day-from-seoul.astro
│        └─ safety/[slug].astro
├─ data/raw/                   공공데이터 원본 보존
└─ tests/
```

로직은 `lib/`에만 둔다. 페이지가 판정 로직을 갖고 있으면 테스트할 수 없다.

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`

- [ ] **Step 1: Astro 프로젝트 생성**

```bash
cd C:/Users/cartr/korea-outdoor
npm create astro@latest . -- --template minimal --typescript strict --no-install --no-git --skip-houston
```

기존 `README.md`, `docs/`, `.gitignore`는 유지한다. 덮어쓰기 프롬프트가 나오면 거부한다.

- [ ] **Step 2: 의존성 설치**

```bash
npm install
npm install -D vitest @vitest/coverage-v8
npx astro add tailwind --yes
npx astro add sitemap --yes
```

- [ ] **Step 3: Vitest 설정 추가**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
  resolve: {
    alias: {
      // Astro 런타임 밖에서 스키마를 테스트하기 위한 스텁
      'astro:content': new URL('./tests/stubs/astro-content.ts', import.meta.url).pathname,
    },
  },
});
```

`package.json`의 `scripts`에 추가:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: 빌드 확인**

Run: `npm run build`
Expected: 성공, `dist/` 생성

- [ ] **Step 5: 커밋**

```bash
git add -A
git commit -m "chore: Astro + Tailwind + Vitest 초기 설정"
```

---

## Task 2: 언어 레지스트리

언어 목록이 존재하는 유일한 장소다. 3번째 언어 추가는 `status`를 `planned`에서
`live`로 바꾸는 것으로 끝나야 한다.

**Files:**
- Create: `src/config/languages.ts`
- Test: `tests/languages.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/languages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { LANGUAGES, LIVE_LANGUAGES, isLive, scriptFor } from '../src/config/languages';

describe('language registry', () => {
  it('Phase 1 출시 언어는 en, ko 두 개뿐이다', () => {
    expect(LIVE_LANGUAGES.map((l) => l.code)).toEqual(['en', 'ko']);
  });

  it('스펙에 정의된 8개 언어를 모두 등록한다', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'ko', 'mn', 'zh', 'ja', 'ms', 'si', 'ru']);
  });

  it('몽골어는 키릴 스크립트를 사용한다', () => {
    expect(scriptFor('mn')).toBe('cyrillic');
  });

  it('아직 출시하지 않은 언어는 live가 아니다', () => {
    expect(isLive('mn')).toBe(false);
  });

  it('영어는 폴백 언어이므로 항상 live여야 한다', () => {
    expect(isLive('en')).toBe(true);
  });

  it('등록되지 않은 코드는 조용히 넘기지 않고 실패시킨다', () => {
    expect(() => scriptFor('xx')).toThrow(/unknown language/i);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- languages`
Expected: FAIL — `Cannot find module '../src/config/languages'`

- [ ] **Step 3: 구현**

`src/config/languages.ts`:

```ts
export type Script = 'latin' | 'cyrillic' | 'hangul' | 'jp' | 'sc' | 'sinhala';

export type Language = {
  code: string;
  label: string;
  script: Script;
  dir: 'ltr' | 'rtl';
  status: 'live' | 'planned';
};

/** 언어 목록의 유일한 출처. 라우팅·hreflang·sitemap·폰트가 여기서 파생된다. */
export const LANGUAGES: readonly Language[] = [
  { code: 'en', label: 'English', script: 'latin',    dir: 'ltr', status: 'live' },
  { code: 'ko', label: '한국어',   script: 'hangul',   dir: 'ltr', status: 'live' },
  { code: 'mn', label: 'Монгол',  script: 'cyrillic', dir: 'ltr', status: 'planned' },
  { code: 'zh', label: '中文',     script: 'sc',       dir: 'ltr', status: 'planned' },
  { code: 'ja', label: '日本語',   script: 'jp',       dir: 'ltr', status: 'planned' },
  { code: 'ms', label: 'Melayu',  script: 'latin',    dir: 'ltr', status: 'planned' },
  { code: 'si', label: 'සිංහල',   script: 'sinhala',  dir: 'ltr', status: 'planned' },
  { code: 'ru', label: 'Русский', script: 'cyrillic', dir: 'ltr', status: 'planned' },
] as const;

/** 미번역 필드가 폴백하는 언어. */
export const FALLBACK_LANG = 'en';

export const LIVE_LANGUAGES = LANGUAGES.filter((l) => l.status === 'live');

export function isLive(code: string): boolean {
  return LIVE_LANGUAGES.some((l) => l.code === code);
}

export function scriptFor(code: string): Script {
  const lang = LANGUAGES.find((l) => l.code === code);
  if (!lang) throw new Error(`Unknown language: ${code}`);
  return lang.script;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- languages`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/config/languages.ts tests/languages.test.ts
git commit -m "feat: 언어 레지스트리 — 라우팅·hreflang·폰트의 단일 출처"
```

---

## Task 3: 교차검증 로직

스펙 §6의 대조 규칙을 구현한다. 여기서 틀리면 "공식 데이터 기반"이라는 주장
전체가 무너진다.

**Files:**
- Create: `src/lib/reconcile.ts`
- Test: `tests/reconcile.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/reconcile.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { reconcile, TOLERANCE } from '../src/lib/reconcile';

describe('reconcile', () => {
  it('출처가 하나면 single_source로 판정하고 그 값을 쓴다', () => {
    const r = reconcile([{ org: 'knps', value: 3.2 }]);
    expect(r.value).toBe(3.2);
    expect(r.verification.status).toBe('single_source');
  });

  it('두 출처가 허용 오차 안이면 verified로 판정한다', () => {
    const r = reconcile([
      { org: 'knps', value: 3.2 },
      { org: 'forest_service', value: 3.4 },
    ]);
    expect(r.verification.status).toBe('verified');
  });

  it('허용 오차를 넘으면 conflict로 판정한다', () => {
    const r = reconcile([
      { org: 'knps', value: 3.2 },
      { org: 'forest_service', value: 5.0 },
    ]);
    expect(r.verification.status).toBe('conflict');
  });

  it('conflict일 때도 값을 버리지 않고 중앙값을 쓴다', () => {
    const r = reconcile([
      { org: 'a', value: 2.0 },
      { org: 'b', value: 3.0 },
      { org: 'c', value: 10.0 },
    ]);
    expect(r.value).toBe(3.0);
    expect(r.verification.status).toBe('conflict');
  });

  it('중앙값은 이상치 하나에 끌려가지 않는다', () => {
    const r = reconcile([
      { org: 'a', value: 3.0 },
      { org: 'b', value: 3.1 },
      { org: 'c', value: 90.0 },
    ]);
    expect(r.value).toBe(3.1);
  });

  it('짝수 개일 때 중앙값은 가운데 두 값의 평균이다', () => {
    const r = reconcile([
      { org: 'a', value: 2.0 },
      { org: 'b', value: 4.0 },
    ]);
    expect(r.value).toBe(3.0);
  });

  it('편차 비율을 기록해 화면에서 설명할 수 있게 한다', () => {
    const r = reconcile([
      { org: 'a', value: 2.0 },
      { org: 'b', value: 3.0 },
    ]);
    expect(r.verification.spread).toBeCloseTo(0.5, 5);
  });

  it('빈 입력은 조용히 넘기지 않고 실패시킨다', () => {
    expect(() => reconcile([])).toThrow(/at least one/i);
  });

  it('0 이하 값은 측정 오류이므로 거부한다', () => {
    expect(() => reconcile([{ org: 'a', value: 0 }])).toThrow(/positive/i);
  });

  it('허용 오차는 10%이다', () => {
    expect(TOLERANCE).toBe(0.1);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- reconcile`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/lib/reconcile.ts`:

```ts
export type SourceReading = { org: string; value: number };

export type VerificationStatus = 'verified' | 'single_source' | 'conflict';

export type Verification = {
  status: VerificationStatus;
  /** (max - min) / min. 단일 출처면 null. */
  spread: number | null;
};

export type ReconcileResult = {
  value: number;
  verification: Verification;
};

/**
 * 출처 간 허용 오차. 기관마다 측정 기준과 기준 체력이 달라 실제 편차가 크다.
 * 실데이터를 보고 조정해야 하는 튜닝 지점이다.
 */
export const TOLERANCE = 0.1;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * 여러 기관의 측정값을 하나로 합치고 검증 상태를 판정한다.
 * conflict여도 값을 버리지 않는다. 화면에서 "출처 간 정보가 다름"으로 표시한다.
 */
export function reconcile(readings: SourceReading[]): ReconcileResult {
  if (readings.length === 0) {
    throw new Error('reconcile requires at least one reading');
  }
  for (const r of readings) {
    if (!(r.value > 0)) {
      throw new Error(`reconcile requires positive values, got ${r.value} from ${r.org}`);
    }
  }

  const values = readings.map((r) => r.value);
  const value = median(values);

  if (readings.length === 1) {
    return { value, verification: { status: 'single_source', spread: null } };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = (max - min) / min;

  return {
    value,
    verification: { status: spread <= TOLERANCE ? 'verified' : 'conflict', spread },
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- reconcile`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/reconcile.ts tests/reconcile.test.ts
git commit -m "feat: 공공데이터 교차검증 — 중앙값 + 편차 기반 3단계 판정"
```

---

## Task 4: 번역 조회와 폴백

미번역 필드는 영어로 폴백하되, **폴백했다는 사실을 숨기지 않는다.**

**Files:**
- Create: `src/lib/i18n.ts`
- Test: `tests/i18n.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/i18n.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveText, makeTranslator } from '../src/lib/i18n';

const text = {
  en: { summary: 'A short city ridge walk.', caution1: 'Stairs near the top.', caution2: 'No water on route.' },
  ko: { summary: '도심 성곽 능선길.', caution1: '정상부 계단 구간.', caution2: '식수 없음.' },
};

describe('resolveText', () => {
  it('요청한 언어가 있으면 그대로 쓴다', () => {
    const r = resolveText(text, 'ko');
    expect(r.value.summary).toBe('도심 성곽 능선길.');
    expect(r.isFallback).toBe(false);
  });

  it('요청한 언어가 없으면 영어로 폴백한다', () => {
    const r = resolveText(text, 'mn');
    expect(r.value.summary).toBe('A short city ridge walk.');
    expect(r.isFallback).toBe(true);
  });

  it('영어조차 없으면 실패시킨다 — 조용히 빈 화면을 내지 않는다', () => {
    expect(() => resolveText({ ko: text.ko }, 'ja')).toThrow(/fallback/i);
  });
});

describe('makeTranslator', () => {
  const en = { 'filter.difficulty': 'Difficulty', 'filter.region': 'Region' };
  const t = makeTranslator(en, { 'filter.difficulty': '난이도' });

  it('사전에서 라벨을 찾는다', () => {
    expect(t('filter.difficulty')).toBe('난이도');
  });

  it('해당 언어에 없으면 영어로 폴백한다', () => {
    expect(t('filter.region')).toBe('Region');
  });

  it('어디에도 없으면 키 자체를 돌려줘 누락이 화면에서 드러나게 한다', () => {
    expect(t('filter.missing')).toBe('filter.missing');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- i18n`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/lib/i18n.ts`:

```ts
import { FALLBACK_LANG } from '../config/languages';

export type Dict = Record<string, string>;

export type Resolved<T> = { value: T; isFallback: boolean };

/**
 * 언어별 값 묶음에서 요청 언어를 꺼낸다.
 * 없으면 영어로 폴백하고, 폴백했다는 사실을 함께 반환한다.
 */
export function resolveText<T>(byLang: Partial<Record<string, T>>, lang: string): Resolved<T> {
  const direct = byLang[lang];
  if (direct !== undefined) return { value: direct, isFallback: false };

  const fallback = byLang[FALLBACK_LANG];
  if (fallback === undefined) {
    throw new Error(`No content for "${lang}" and no "${FALLBACK_LANG}" fallback available`);
  }
  return { value: fallback, isFallback: true };
}

/**
 * UI 라벨 조회기. 키가 없으면 키 자체를 반환해 누락이 화면에서 드러나게 한다.
 * 빈 문자열을 돌려주면 누락이 조용히 묻힌다.
 */
export function makeTranslator(fallbackDict: Dict, dict: Dict) {
  return (key: string): string => dict[key] ?? fallbackDict[key] ?? key;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- i18n`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/i18n.ts tests/i18n.test.ts
git commit -m "feat: 번역 조회 + 영어 폴백 — 폴백 사실을 노출"
```

---

## Task 5: 스크립트별 폰트 로딩

**Files:**
- Create: `src/lib/fonts.ts`
- Test: `tests/fonts.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/fonts.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fontHrefFor, BASE_FAMILIES } from '../src/lib/fonts';

describe('fontHrefFor', () => {
  it('모든 언어에 공통 서체(디스플레이·본문·모노)를 싣는다', () => {
    const href = fontHrefFor('en');
    for (const family of BASE_FAMILIES) {
      expect(href).toContain(family.split(':')[0].replace(/ /g, '+'));
    }
  });

  it('한국어 페이지에만 한글 서체를 싣는다', () => {
    expect(fontHrefFor('ko')).toContain('Noto+Sans+KR');
    expect(fontHrefFor('en')).not.toContain('Noto+Sans+KR');
  });

  it('키릴 언어는 추가 서체 없이 공통 서체로 처리한다', () => {
    const href = fontHrefFor('mn');
    expect(href).not.toContain('Noto+Sans+Mongolian');
    expect(href).toContain('Inter');
  });

  it('싱할라는 전용 서체가 필요하다', () => {
    expect(fontHrefFor('si')).toContain('Noto+Sans+Sinhala');
  });

  it('FOIT를 피하려면 display=swap이어야 한다', () => {
    expect(fontHrefFor('en')).toContain('display=swap');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- fonts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/lib/fonts.ts`:

```ts
import { scriptFor, type Script } from '../config/languages';

/** 모든 언어에 공통으로 필요한 서체. 라틴과 키릴을 함께 덮는다. */
export const BASE_FAMILIES = [
  'Source Serif 4:wght@400;600',
  'Inter:wght@400;500;700',
  'IBM Plex Mono:wght@400;600',
] as const;

/** 공통 서체가 덮지 못하는 스크립트만 추가한다. latin/cyrillic은 공통 서체가 덮는다. */
const SCRIPT_EXTRA: Partial<Record<Script, string>> = {
  hangul: 'Noto Sans KR:wght@400;500;700',
  jp: 'Noto Sans JP:wght@400;500;700',
  sc: 'Noto Sans SC:wght@400;500;700',
  sinhala: 'Noto Sans Sinhala:wght@400;500;700',
};

export function fontHrefFor(lang: string): string {
  const extra = SCRIPT_EXTRA[scriptFor(lang)];
  const families = extra ? [...BASE_FAMILIES, extra] : [...BASE_FAMILIES];
  const query = families.map((f) => `family=${f.replace(/ /g, '+')}`).join('&');
  return `https://fonts.googleapis.com/css2?${query}&display=swap`;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- fonts`
Expected: PASS (5 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/lib/fonts.ts tests/fonts.test.ts
git commit -m "feat: 언어별 스크립트 폰트 분리 로딩"
```

---

## Task 6: 콘텐츠 스키마

Zod 스키마가 잘못된 콘텐츠를 빌드 시점에 막는다.

**Files:**
- Create: `src/content/config.ts`, `tests/stubs/astro-content.ts`
- Test: `tests/schema.test.ts`

- [ ] **Step 1: 테스트 스텁 작성**

`tests/stubs/astro-content.ts`:

```ts
export { z } from 'zod';
export const defineCollection = (config: unknown) => config;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/schema.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { placeSchema } from '../src/content/config';

const valid = {
  id: 'inwangsan',
  type: 'mountain',
  name_i18n: { en: 'Inwangsan', ko: '인왕산' },
  region: { sido: '11', sigungu: '11110' },
  coords: { lat: 37.58, lng: 126.9585 },
  metrics: { elevation_m: 338, distance_km: 3.2, duration_min: 90, difficulty: 1 },
  access: {
    transit: { subway: true, walk_min: 10 },
    signage_langs: ['ko', 'en'],
    restroom: true,
    water_refill: false,
    entry_fee_krw: 0,
    cell_coverage: 'good',
  },
  safety: { hazards: ['steep_stair'], sunset_caution: true },
  text: { en: { summary: 's', caution1: 'c1', caution2: 'c2' } },
  provenance: {
    sources: [{ org: 'knps', dataset: '탐방로 정보', fetched_at: '2026-08-10' }],
    verification: { status: 'single_source', checked_fields: ['distance_km'] },
  },
};

describe('placeSchema', () => {
  it('유효한 장소를 통과시킨다', () => {
    expect(placeSchema.safeParse(valid).success).toBe(true);
  });

  it('영어 텍스트는 필수다 — 폴백 언어이기 때문', () => {
    const noEn = { ...valid, text: { ko: { summary: 's', caution1: 'c', caution2: 'c' } } };
    expect(placeSchema.safeParse(noEn).success).toBe(false);
  });

  it('출처가 없는 장소는 거부한다', () => {
    const noSource = { ...valid, provenance: { ...valid.provenance, sources: [] } };
    expect(placeSchema.safeParse(noSource).success).toBe(false);
  });

  it('난이도는 1~3만 허용한다', () => {
    const bad = { ...valid, metrics: { ...valid.metrics, difficulty: 5 } };
    expect(placeSchema.safeParse(bad).success).toBe(false);
  });

  it('미확인 표지판 언어는 null로 둘 수 있다 — 추측 금지', () => {
    const unknown = { ...valid, access: { ...valid.access, signage_langs: null } };
    expect(placeSchema.safeParse(unknown).success).toBe(true);
  });

  it('섬·낚시 타입을 스키마 수준에서 미리 허용한다', () => {
    expect(placeSchema.safeParse({ ...valid, type: 'island' }).success).toBe(true);
  });

  it('좌표가 한국 범위를 벗어나면 거부한다', () => {
    const bad = { ...valid, coords: { lat: 0, lng: 0 } };
    expect(placeSchema.safeParse(bad).success).toBe(false);
  });

  it('조회 일자는 YYYY-MM-DD 형식이어야 한다', () => {
    const bad = {
      ...valid,
      provenance: {
        ...valid.provenance,
        sources: [{ org: 'knps', dataset: 'x', fetched_at: '2026/08/10' }],
      },
    };
    expect(placeSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -- schema`
Expected: FAIL — 모듈 없음

- [ ] **Step 4: 구현**

`src/content/config.ts`:

```ts
import { defineCollection, z } from 'astro:content';

const localizedText = z.object({
  summary: z.string().min(1),
  caution1: z.string().min(1),
  caution2: z.string().min(1),
});

export const placeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['mountain', 'island', 'fishing']),
  name_i18n: z.record(z.string()).refine((v) => 'en' in v, { message: 'English name required' }),
  region: z.object({ sido: z.string(), sigungu: z.string() }),
  // 대한민국 육상 범위. 벗어난 좌표는 데이터 오류다.
  coords: z.object({
    lat: z.number().min(33).max(39),
    lng: z.number().min(124).max(132),
  }),
  metrics: z.object({
    elevation_m: z.number().positive(),
    distance_km: z.number().positive(),
    duration_min: z.number().positive(),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  access: z.object({
    transit: z.object({
      subway: z.boolean(),
      station_i18n: z.record(z.string()).optional(),
      walk_min: z.number().nonnegative(),
    }),
    // null = 미확인. 추측해서 채우지 않는다.
    signage_langs: z.array(z.string()).nullable(),
    restroom: z.boolean(),
    water_refill: z.boolean(),
    entry_fee_krw: z.number().nonnegative(),
    open_hours: z.object({ type: z.string(), detail: z.string() }).optional(),
    cell_coverage: z.enum(['good', 'partial', 'none']),
  }),
  safety: z.object({
    hazards: z.array(z.string()),
    sunset_caution: z.boolean(),
  }),
  // 영어는 폴백 언어이므로 반드시 존재해야 한다.
  text: z.record(localizedText).refine((v) => 'en' in v, { message: 'English text required' }),
  provenance: z.object({
    sources: z
      .array(
        z.object({
          org: z.string(),
          dataset: z.string(),
          url: z.string().optional(),
          fetched_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .min(1, 'at least one source required'),
    verification: z.object({
      status: z.enum(['verified', 'single_source', 'conflict']),
      checked_fields: z.array(z.string()),
      note: z.string().optional(),
    }),
  }),
});

export const safetySchema = z.object({
  id: z.string().min(1),
  category: z.enum(['hazard', 'seasonal', 'emergency']),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).nullable(),
  text: z
    .record(z.object({ title: z.string().min(1), body: z.array(z.string().min(1)).min(1) }))
    .refine((v) => 'en' in v, { message: 'English text required' }),
});

export const collections = {
  places: defineCollection({ type: 'data', schema: placeSchema }),
  safety: defineCollection({ type: 'data', schema: safetySchema }),
};
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -- schema`
Expected: PASS (8 tests)

- [ ] **Step 6: 커밋**

```bash
git add src/content/config.ts tests/schema.test.ts tests/stubs
git commit -m "feat: Place/Safety Zod 스키마 — 출처 없는 콘텐츠를 빌드에서 차단"
```

---

## Task 7: 초기 콘텐츠 3건 + 안전 콘텐츠 3건 + 라벨 사전

15건을 한 번에 만들지 않는다. 3건으로 파이프라인 전체를 통과시킨 뒤 늘린다.

**Files:**
- Create: `src/content/places/{inwangsan,achasan,bukhansan-dulle-1}.json`
- Create: `src/content/safety/{steep_stair,sunset_descent,emergency-call-119}.json`
- Create: `src/i18n/en.json`, `src/i18n/ko.json`

- [ ] **Step 1: 장소 1건 작성**

`src/content/places/inwangsan.json`:

```json
{
  "id": "inwangsan",
  "type": "mountain",
  "name_i18n": { "en": "Inwangsan", "ko": "인왕산" },
  "region": { "sido": "11", "sigungu": "11110" },
  "coords": { "lat": 37.58, "lng": 126.9585 },
  "metrics": { "elevation_m": 338, "distance_km": 3.2, "duration_min": 90, "difficulty": 1 },
  "access": {
    "transit": { "subway": true, "station_i18n": { "en": "Dongnimmun", "ko": "독립문" }, "walk_min": 10 },
    "signage_langs": ["ko", "en"],
    "restroom": true,
    "water_refill": false,
    "entry_fee_krw": 0,
    "cell_coverage": "good"
  },
  "safety": { "hazards": ["steep_stair"], "sunset_caution": true },
  "text": {
    "en": {
      "summary": "A short ridge walk along the old city wall, ten minutes from a subway station.",
      "caution1": "The final stretch is continuous stone steps with no shade.",
      "caution2": "There is no drinking water on the route. Carry at least one litre."
    },
    "ko": {
      "summary": "한양도성 성곽을 따라 걷는 짧은 능선길. 지하철역에서 도보 10분.",
      "caution1": "정상 직전 구간이 그늘 없는 돌계단으로 이어진다.",
      "caution2": "코스 내 식수가 없다. 최소 1리터를 준비할 것."
    }
  },
  "provenance": {
    "sources": [{ "org": "seoul", "dataset": "서울시 등산로 정보", "fetched_at": "2026-08-10" }],
    "verification": { "status": "single_source", "checked_fields": ["distance_km", "duration_min"] }
  }
}
```

- [ ] **Step 2: 장소 2건 추가**

위 파일과 동일한 구조로 작성한다. 값만 다르다.

`achasan.json` — `id` `"achasan"`, `name_i18n` `{ "en": "Achasan", "ko": "아차산" }`,
`region` `{ "sido": "11", "sigungu": "11215" }`, `coords` `{ "lat": 37.5556, "lng": 127.1017 }`,
`metrics` `{ "elevation_m": 295, "distance_km": 2.8, "duration_min": 80, "difficulty": 1 }`,
`signage_langs` `["ko", "en"]`, `hazards` `[]`, `sunset_caution` `true`,
`provenance.sources` 는 `seoul` 1건, `verification.status` `"single_source"`.

`bukhansan-dulle-1.json` — `id` `"bukhansan-dulle-1"`,
`name_i18n` `{ "en": "Bukhansan Dulle-gil Section 1", "ko": "북한산 둘레길 1구간" }`,
`region` `{ "sido": "11", "sigungu": "11305" }`, `coords` `{ "lat": 37.6605, "lng": 127.0107 }`,
`metrics` `{ "elevation_m": 180, "distance_km": 4.5, "duration_min": 120, "difficulty": 1 }`,
`signage_langs` `null` (미확인 — 추측 금지), `hazards` `[]`, `sunset_caution` `false`,
`provenance.sources` 는 `knps` 와 `forest_service` 2건, `verification.status` `"verified"`.

각 파일의 `text.en` / `text.ko` 는 해당 코스의 실제 특징으로 3문장을 채운다.
영어가 없으면 스키마가 거부한다.

- [ ] **Step 3: 안전 콘텐츠 작성**

`src/content/safety/emergency-call-119.json`:

```json
{
  "id": "emergency-call-119",
  "category": "emergency",
  "season": null,
  "text": {
    "en": {
      "title": "Calling 119 from a trail",
      "body": [
        "119 is the emergency number for fire, rescue and ambulance in Korea. It is free from any phone.",
        "Interpretation support is available. Say your language in English and wait to be connected.",
        "Korean trails have numbered location markers on posts. Read that number to the operator: it locates you faster than any address.",
        "If you cannot speak, stay on the line. The call is still traced."
      ]
    },
    "ko": {
      "title": "산에서 119에 신고하기",
      "body": [
        "119는 화재·구조·구급 통합 신고번호이며 통화료가 없다.",
        "다국어 통역 연결이 가능하다. 영어로 필요한 언어를 말한 뒤 연결을 기다린다.",
        "등산로 기둥의 국가지점번호 또는 산악위치표지판 번호를 읽어주면 주소보다 빠르게 위치가 특정된다.",
        "말을 할 수 없는 상황이어도 통화를 끊지 않는다."
      ]
    }
  }
}
```

`steep_stair.json` (`category` `"hazard"`, `season` `null`) 과
`sunset_descent.json` (`category` `"hazard"`, `season` `null`) 도 같은 구조로 작성한다.

**`id`는 장소의 `safety.hazards` 원소와 정확히 일치해야 한다.** 일치하지 않으면
Task 12의 위험요소 카드가 연결되지 않는다.

- [ ] **Step 4: UI 라벨 사전 작성**

`src/i18n/en.json`:

```json
{
  "nav.mountains": "Mountains",
  "nav.safety": "Safety",
  "filter.region": "Region",
  "filter.difficulty": "Difficulty",
  "filter.duration": "Duration",
  "filter.signage": "English signage",
  "filter.restroom": "Restroom",
  "difficulty.1": "Easy",
  "difficulty.2": "Moderate",
  "difficulty.3": "Hard",
  "metric.elevation": "Elevation",
  "metric.distance": "Distance",
  "metric.duration": "Time",
  "provenance.title": "Data sources",
  "provenance.verified": "Cross-checked against two or more official sources",
  "provenance.single_source": "Single official source",
  "provenance.conflict": "Official sources disagree on this figure",
  "provenance.checked_on": "Retrieved",
  "signage.unknown": "Signage languages not confirmed",
  "fallback.notice": "Not yet translated. Showing English.",
  "empty.results": "No routes match these filters.",
  "disclaimer": "Trail information is for reference. Check official notices before you go."
}
```

`src/i18n/ko.json` — 같은 키를 한국어로 채운다. 키가 빠지면 영어로 폴백하고,
영어에도 없으면 키 문자열이 화면에 그대로 노출되어 누락이 즉시 드러난다.

- [ ] **Step 5: 스키마 검증 통과 확인**

Run: `npm run build`
Expected: 성공. 스키마 위반 시 Astro가 파일명과 필드를 지목하며 실패한다.

- [ ] **Step 6: 커밋**

```bash
git add src/content src/i18n
git commit -m "feat: 초기 장소 3건 + 안전 콘텐츠 3건 + UI 라벨 사전(en/ko)"
```

---

## Task 8: 디자인 토큰과 기본 레이아웃

**Files:**
- Create: `src/styles/tokens.css`, `src/layouts/Base.astro`

- [ ] **Step 1: 디자인 토큰 작성**

`src/styles/tokens.css`:

```css
:root {
  --c-bg: #fafaf7;
  --c-surface: #ffffff;
  --c-fg: #111311;
  --c-fg-muted: #5a625a;
  --c-line: #e2e5e0;
  --c-accent: #166534;
  --c-warn: #c2410c;
  --c-danger: #b91c1c;

  --font-display: 'Source Serif 4', Georgia, serif;
  --font-body: Inter, 'Noto Sans KR', 'Noto Sans JP', 'Noto Sans SC', 'Noto Sans Sinhala', sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, monospace;

  --unit: 8px;
  --measure: 68ch;

  --dur: 200ms;
  --ease: cubic-bezier(0.16, 1, 0.3, 1);
}

html {
  background: var(--c-bg);
  color: var(--c-fg);
  font-family: var(--font-body);
}

/* 수치는 항상 tabular — 값이 바뀌어도 열이 흔들리지 않는다 */
.num {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
.sr-only:focus {
  position: static;
  width: auto;
  height: auto;
  clip: auto;
  padding: var(--unit);
}

:focus-visible {
  outline: 3px solid var(--c-accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: 레이아웃 작성**

`src/layouts/Base.astro`:

```astro
---
import { LIVE_LANGUAGES } from '../config/languages';
import { fontHrefFor } from '../lib/fonts';
import '../styles/tokens.css';

interface Props { lang: string; title: string; description?: string; path: string; }
const { lang, title, description = '', path } = Astro.props;
const site = Astro.site?.toString().replace(/\/$/, '') ?? '';
---
<!doctype html>
<html lang={lang}>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link rel="stylesheet" href={fontHrefFor(lang)} />
    {LIVE_LANGUAGES.map((l) => (
      <link rel="alternate" hreflang={l.code} href={`${site}/${l.code}${path}`} />
    ))}
    <link rel="alternate" hreflang="x-default" href={`${site}/en${path}`} />
  </head>
  <body>
    <a href="#main" class="sr-only">Skip to content</a>
    <nav aria-label="Language">
      {LIVE_LANGUAGES.map((l) => (
        <a href={`/${l.code}${path}`} lang={l.code} aria-current={l.code === lang ? 'true' : undefined}>{l.label}</a>
      ))}
    </nav>
    <main id="main"><slot /></main>
  </body>
</html>
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add src/styles src/layouts
git commit -m "feat: 디자인 토큰 + 기본 레이아웃 (hreflang, 스크립트별 폰트, 스킵링크)"
```

---

## Task 9: 장소 상세 페이지

**Files:**
- Create: `src/components/MetricRow.astro`, `src/components/ProvenanceBlock.astro`
- Create: `src/pages/[lang]/mountain/[slug].astro`

- [ ] **Step 1: 수치 표시 컴포넌트**

`src/components/MetricRow.astro`:

```astro
---
interface Props { items: { label: string; value: string }[]; }
const { items } = Astro.props;
---
<dl class="metrics">
  {items.map((i) => (
    <div>
      <dt>{i.label}</dt>
      <dd class="num">{i.value}</dd>
    </div>
  ))}
</dl>

<style>
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--c-line); margin: calc(var(--unit) * 4) 0; }
  .metrics > div { padding: calc(var(--unit) * 2) 0; border-bottom: 1px solid var(--c-line); }
  dt { font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-fg-muted); }
  dd { margin: 4px 0 0; font-size: 1.5rem; font-weight: 600; }
</style>
```

- [ ] **Step 2: 출처 블록 컴포넌트**

`src/components/ProvenanceBlock.astro`:

```astro
---
import type { VerificationStatus } from '../lib/reconcile';

interface Props {
  sources: { org: string; dataset: string; fetched_at: string }[];
  status: VerificationStatus;
  t: (key: string) => string;
}
const { sources, status, t } = Astro.props;
---
<section class={`prov prov--${status}`}>
  <h2>{t('provenance.title')}</h2>
  <p>{t(`provenance.${status}`)}</p>
  <ul>
    {sources.map((s) => (
      <li>
        <span>{s.dataset}</span>
        <span class="num">{t('provenance.checked_on')} {s.fetched_at}</span>
      </li>
    ))}
  </ul>
</section>

<style>
  .prov { border-top: 1px solid var(--c-line); padding-top: calc(var(--unit) * 2); font-size: 0.875rem; }
  .prov h2 { font-size: 0.75rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-fg-muted); }
  /* conflict 는 숨기지 않고 눈에 띄게 한다 */
  .prov--conflict p { color: var(--c-warn); font-weight: 600; }
  ul { list-style: none; padding: 0; }
  li { display: flex; justify-content: space-between; gap: var(--unit); padding: 4px 0; }
</style>
```

- [ ] **Step 3: 상세 페이지**

`src/pages/[lang]/mountain/[slug].astro`:

```astro
---
import { getCollection } from 'astro:content';
import { LIVE_LANGUAGES } from '../../../config/languages';
import { resolveText, makeTranslator } from '../../../lib/i18n';
import Base from '../../../layouts/Base.astro';
import MetricRow from '../../../components/MetricRow.astro';
import ProvenanceBlock from '../../../components/ProvenanceBlock.astro';
import en from '../../../i18n/en.json';

export async function getStaticPaths() {
  const places = await getCollection('places', (p) => p.data.type === 'mountain');
  return LIVE_LANGUAGES.flatMap((l) =>
    places.map((p) => ({ params: { lang: l.code, slug: p.data.id }, props: { place: p.data } })),
  );
}

const { lang, slug } = Astro.params;
const { place } = Astro.props;

const dict = (await import(`../../../i18n/${lang}.json`)).default;
const t = makeTranslator(en, dict);

const name = place.name_i18n[lang!] ?? place.name_i18n.en;
const { value: text, isFallback } = resolveText(place.text, lang!);
const hours = Math.floor(place.metrics.duration_min / 60);
const mins = place.metrics.duration_min % 60;
---
<Base lang={lang!} title={name} description={text.summary} path={`/mountain/${slug}`}>
  <article class="wrap">
    <h1>{name}</h1>
    {isFallback && <p class="fallback">{t('fallback.notice')}</p>}
    <p class="lede">{text.summary}</p>

    <MetricRow items={[
      { label: t('metric.elevation'), value: `${place.metrics.elevation_m} m` },
      { label: t('metric.distance'),  value: `${place.metrics.distance_km} km` },
      { label: t('metric.duration'),  value: `${hours}h ${mins}m` },
    ]} />

    <ul class="cautions">
      <li>{text.caution1}</li>
      <li>{text.caution2}</li>
    </ul>

    {place.access.signage_langs === null && <p class="warn">{t('signage.unknown')}</p>}

    <ProvenanceBlock
      sources={place.provenance.sources}
      status={place.provenance.verification.status}
      t={t}
    />
    <p class="disclaimer">{t('disclaimer')}</p>
  </article>
</Base>

<style>
  .wrap { max-width: var(--measure); margin: 0 auto; padding: calc(var(--unit) * 6) calc(var(--unit) * 2); }
  h1 { font-family: var(--font-display); font-size: clamp(2rem, 6vw, 3.25rem); line-height: 1.1; margin: 0; }
  .lede { font-size: 1.125rem; line-height: 1.7; color: var(--c-fg-muted); }
  .fallback { font-size: 0.8125rem; color: var(--c-warn); }
  .warn { color: var(--c-warn); font-weight: 600; }
  .cautions { padding-left: 1.2em; line-height: 1.7; }
  .disclaimer { font-size: 0.75rem; color: var(--c-fg-muted); margin-top: calc(var(--unit) * 4); }
</style>
```

- [ ] **Step 4: 빌드 및 육안 확인**

Run: `npm run build && npm run preview`
Expected: `/en/mountain/inwangsan`, `/ko/mountain/inwangsan` 생성.
`bukhansan-dulle-1`은 `signage_langs`가 `null`이므로 미확인 문구가 보여야 한다.

- [ ] **Step 5: 커밋**

```bash
git add src/pages src/components
git commit -m "feat: 장소 상세 페이지 — 수치·주의사항·출처 검증 상태 표시"
```

---

## Task 10: 목록과 필터

필터는 서버에서 렌더링한 카드에 데이터 속성을 심고 소량의 바닐라 JS로 토글한다.
검색엔진이 전체 목록을 그대로 읽어야 하므로 클라이언트 렌더링을 쓰지 않는다.

**Files:**
- Create: `src/lib/filter.ts`, `src/components/PlaceCard.astro`, `src/pages/[lang]/mountain/index.astro`
- Test: `tests/filter.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`tests/filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { matches, type CardData, type FilterState } from '../src/lib/filter';

const card: CardData = { region: '11', difficulty: 1, durationMin: 90, signageEn: true, restroom: true };
const none: FilterState = { region: 'all', difficulty: 'all', duration: 'all', signageEn: false, restroom: false };

describe('matches', () => {
  it('조건이 없으면 전부 통과시킨다', () => {
    expect(matches(card, none)).toBe(true);
  });

  it('지역이 다르면 제외한다', () => {
    expect(matches(card, { ...none, region: '41' })).toBe(false);
  });

  it('2시간 이하 조건에 90분은 포함된다', () => {
    expect(matches(card, { ...none, duration: 'short' })).toBe(true);
  });

  it('2시간 이하 조건에 150분은 제외된다', () => {
    expect(matches({ ...card, durationMin: 150 }, { ...none, duration: 'short' })).toBe(false);
  });

  it('영어 표지판 필터는 미확인(null)을 통과시키지 않는다', () => {
    expect(matches({ ...card, signageEn: null }, { ...none, signageEn: true })).toBe(false);
  });

  it('조건을 끄면 미확인도 통과한다', () => {
    expect(matches({ ...card, signageEn: null }, none)).toBe(true);
  });

  it('난이도 필터가 동작한다', () => {
    expect(matches(card, { ...none, difficulty: '2' })).toBe(false);
    expect(matches(card, { ...none, difficulty: '1' })).toBe(true);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- filter`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

`src/lib/filter.ts`:

```ts
export type CardData = {
  region: string;
  difficulty: 1 | 2 | 3;
  durationMin: number;
  /** null = 표지판 언어 미확인 */
  signageEn: boolean | null;
  restroom: boolean;
};

export type FilterState = {
  region: string;
  difficulty: 'all' | '1' | '2' | '3';
  duration: 'all' | 'short' | 'mid' | 'long';
  signageEn: boolean;
  restroom: boolean;
};

const DURATION_BUCKETS: Record<string, (m: number) => boolean> = {
  short: (m) => m <= 120,
  mid: (m) => m > 120 && m <= 180,
  long: (m) => m > 180,
};

export function matches(card: CardData, f: FilterState): boolean {
  if (f.region !== 'all' && card.region !== f.region) return false;
  if (f.difficulty !== 'all' && String(card.difficulty) !== f.difficulty) return false;
  if (f.duration !== 'all' && !DURATION_BUCKETS[f.duration](card.durationMin)) return false;
  // 미확인을 "있음"으로 취급하지 않는다.
  if (f.signageEn && card.signageEn !== true) return false;
  if (f.restroom && !card.restroom) return false;
  return true;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- filter`
Expected: PASS (7 tests)

- [ ] **Step 5: 카드 컴포넌트**

`src/components/PlaceCard.astro`:

```astro
---
interface Props {
  href: string;
  name: string;
  summary: string;
  difficultyLabel: string;
  difficulty: 1 | 2 | 3;
  region: string;
  durationMin: number;
  signageEn: boolean | null;
  restroom: boolean;
  metrics: { label: string; value: string }[];
}
const { href, name, summary, difficultyLabel, difficulty, region, durationMin, signageEn, restroom, metrics } = Astro.props;
---
<article
  class="card"
  data-region={region}
  data-difficulty={difficulty}
  data-duration={durationMin}
  data-signage-en={signageEn === null ? 'unknown' : String(signageEn)}
  data-restroom={String(restroom)}
>
  <a href={href}><h3>{name}</h3></a>
  <!-- 색만으로 난이도를 전달하지 않는다: 점 + 텍스트 동시 사용 -->
  <p class="badge"><span class={`dot dot--${difficulty}`} aria-hidden="true"></span>{difficultyLabel}</p>
  <p class="summary">{summary}</p>
  <dl class="mini">
    {metrics.map((m) => (
      <div><dt>{m.label}</dt><dd class="num">{m.value}</dd></div>
    ))}
  </dl>
</article>

<style>
  .card { border-top: 1px solid var(--c-line); padding: calc(var(--unit) * 3) 0; }
  .card.hidden { display: none; }
  h3 { font-family: var(--font-display); font-size: 1.5rem; margin: 0; }
  a { color: inherit; text-decoration: none; }
  a:hover h3 { color: var(--c-accent); }
  .badge { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--c-fg-muted); }
  .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .dot--1 { background: var(--c-accent); }
  .dot--2 { background: var(--c-warn); }
  .dot--3 { background: var(--c-danger); }
  .summary { line-height: 1.7; color: var(--c-fg-muted); }
  .mini { display: flex; gap: calc(var(--unit) * 3); margin: 0; }
  dt { font-size: 0.6875rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--c-fg-muted); }
  dd { margin: 2px 0 0; font-weight: 600; }
</style>
```

- [ ] **Step 6: 목록 페이지**

`src/pages/[lang]/mountain/index.astro`:

```astro
---
import { getCollection } from 'astro:content';
import { LIVE_LANGUAGES } from '../../../config/languages';
import { resolveText, makeTranslator } from '../../../lib/i18n';
import Base from '../../../layouts/Base.astro';
import PlaceCard from '../../../components/PlaceCard.astro';
import en from '../../../i18n/en.json';

export async function getStaticPaths() {
  return LIVE_LANGUAGES.map((l) => ({ params: { lang: l.code } }));
}

const { lang } = Astro.params;
const dict = (await import(`../../../i18n/${lang}.json`)).default;
const t = makeTranslator(en, dict);

const places = await getCollection('places', (p) => p.data.type === 'mountain');
const regions = [...new Set(places.map((p) => p.data.region.sido))].sort();
---
<Base lang={lang!} title={t('nav.mountains')} path="/mountain/">
  <div class="wrap">
    <h1>{t('nav.mountains')}</h1>

    <form id="filters" aria-label={t('nav.mountains')}>
      <label>{t('filter.region')}
        <select name="region">
          <option value="all">—</option>
          {regions.map((r) => <option value={r}>{r}</option>)}
        </select>
      </label>
      <label>{t('filter.difficulty')}
        <select name="difficulty">
          <option value="all">—</option>
          <option value="1">{t('difficulty.1')}</option>
          <option value="2">{t('difficulty.2')}</option>
          <option value="3">{t('difficulty.3')}</option>
        </select>
      </label>
      <label>{t('filter.duration')}
        <select name="duration">
          <option value="all">—</option>
          <option value="short">&#8804; 2h</option>
          <option value="mid">2&ndash;3h</option>
          <option value="long">&gt; 3h</option>
        </select>
      </label>
      <label><input type="checkbox" name="signageEn" /> {t('filter.signage')}</label>
      <label><input type="checkbox" name="restroom" /> {t('filter.restroom')}</label>
    </form>

    <div id="list">
      {places.map((p) => {
        const { value: text } = resolveText(p.data.text, lang!);
        const m = p.data.metrics;
        return (
          <PlaceCard
            href={`/${lang}/mountain/${p.data.id}`}
            name={p.data.name_i18n[lang!] ?? p.data.name_i18n.en}
            summary={text.summary}
            difficulty={m.difficulty}
            difficultyLabel={t(`difficulty.${m.difficulty}`)}
            region={p.data.region.sido}
            durationMin={m.duration_min}
            signageEn={p.data.access.signage_langs === null ? null : p.data.access.signage_langs.includes('en')}
            restroom={p.data.access.restroom}
            metrics={[
              { label: t('metric.distance'), value: `${m.distance_km} km` },
              { label: t('metric.duration'), value: `${Math.floor(m.duration_min / 60)}h ${m.duration_min % 60}m` },
            ]}
          />
        );
      })}
    </div>
    <p id="empty" hidden>{t('empty.results')}</p>
  </div>
</Base>

<script>
  import { matches, type CardData, type FilterState } from '../../../lib/filter';

  const form = document.getElementById('filters') as HTMLFormElement;
  const empty = document.getElementById('empty')!;
  const cards = Array.from(document.querySelectorAll<HTMLElement>('.card'));

  function read(el: HTMLElement): CardData {
    const s = el.dataset.signageEn;
    return {
      region: el.dataset.region!,
      difficulty: Number(el.dataset.difficulty) as 1 | 2 | 3,
      durationMin: Number(el.dataset.duration),
      signageEn: s === 'unknown' ? null : s === 'true',
      restroom: el.dataset.restroom === 'true',
    };
  }

  function apply() {
    const d = new FormData(form);
    const state: FilterState = {
      region: String(d.get('region') ?? 'all'),
      difficulty: String(d.get('difficulty') ?? 'all') as FilterState['difficulty'],
      duration: String(d.get('duration') ?? 'all') as FilterState['duration'],
      signageEn: d.get('signageEn') === 'on',
      restroom: d.get('restroom') === 'on',
    };
    let visible = 0;
    for (const el of cards) {
      const ok = matches(read(el), state);
      el.classList.toggle('hidden', !ok);
      if (ok) visible++;
    }
    empty.hidden = visible > 0;
  }

  form.addEventListener('change', apply);
  apply();
</script>

<style>
  .wrap { max-width: 1100px; margin: 0 auto; padding: calc(var(--unit) * 6) calc(var(--unit) * 2); }
  h1 { font-family: var(--font-display); font-size: clamp(2rem, 6vw, 3rem); }
  #filters { display: flex; flex-wrap: wrap; gap: calc(var(--unit) * 2); padding: calc(var(--unit) * 2) 0; border-top: 1px solid var(--c-line); }
  label { display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--c-fg-muted); }
  select { font: inherit; padding: 4px 6px; border: 1px solid var(--c-line); background: var(--c-surface); }
</style>
```

- [ ] **Step 7: 빌드 및 확인**

Run: `npm run build && npm run preview`
Expected: `/en/mountain/`에서 필터 조작 시 카드가 사라지고, JS를 꺼도 전체 목록이 보인다.

- [ ] **Step 8: 커밋**

```bash
git add src/lib/filter.ts tests/filter.test.ts src/pages src/components
git commit -m "feat: 장소 목록 + 필터 — 미확인 데이터를 '있음'으로 취급하지 않음"
```

---

## Task 11: 홈과 두 진입점

**Files:**
- Create: `src/pages/index.astro`, `src/pages/[lang]/index.astro`
- Create: `src/pages/[lang]/half-day-from-seoul.astro`, `src/pages/[lang]/near/[region].astro`

- [ ] **Step 1: 루트 리다이렉트**

`src/pages/index.astro`:

```astro
---
return Astro.redirect('/en/');
---
```

- [ ] **Step 2: 반나절권 큐레이션 (관광객 진입점)**

`src/pages/[lang]/half-day-from-seoul.astro` — `getStaticPaths`는 `LIVE_LANGUAGES`를
순회한다. 장소는 `region.sido === '11'` 이고 `metrics.duration_min <= 150` 인 것만
필터링해 `PlaceCard`로 렌더링한다. 카드 위에 `access.transit.station_i18n[lang]`과
`walk_min`을 "역에서 도보 N분" 형태로 노출한다 — 관광객에게 가장 중요한 정보다.

Task 10의 목록 페이지와 동일한 `getCollection` → `resolveText` → `PlaceCard` 흐름을
쓰되 필터 UI는 없다.

- [ ] **Step 3: 지역별 페이지 (체류자 진입점)**

`src/pages/[lang]/near/[region].astro`:

```astro
---
import { getCollection } from 'astro:content';
import { LIVE_LANGUAGES } from '../../../config/languages';

export async function getStaticPaths() {
  const places = await getCollection('places');
  const regions = [...new Set(places.map((p) => p.data.region.sido))];
  // 하드코딩한 지역 목록을 두지 않는다. 콘텐츠에 존재하는 지역만 경로가 생긴다.
  return LIVE_LANGUAGES.flatMap((l) =>
    regions.map((r) => ({
      params: { lang: l.code, region: r },
      props: { places: places.filter((p) => p.data.region.sido === r) },
    })),
  );
}
---
```

본문은 Task 10과 동일한 `PlaceCard` 렌더링 흐름을 쓴다.

- [ ] **Step 4: 홈**

`src/pages/[lang]/index.astro` — `getStaticPaths`는 `LIVE_LANGUAGES`를 순회한다.
구성: 디스플레이 서체 대형 헤드라인, 두 진입점 링크 2개
(`/{lang}/half-day-from-seoul`, `/{lang}/mountain/`), 안전 허브 링크
(`/{lang}/safety/`). 히어로 이미지는 실제 한국 등산로 사진을 쓰며
`width`/`height`를 명시하고 `fetchpriority="high"`를 준다.

- [ ] **Step 5: 빌드 확인**

Run: `npm run build`
Expected: `/`, `/en/`, `/ko/`, `/en/half-day-from-seoul`, `/en/near/11` 생성

- [ ] **Step 6: 커밋**

```bash
git add src/pages
git commit -m "feat: 홈 + 두 진입점(반나절권 / 지역별)"
```

---

## Task 12: 안전 허브와 위험요소 카드

**Files:**
- Create: `src/pages/[lang]/safety/index.astro`, `src/pages/[lang]/safety/[slug].astro`
- Create: `src/components/HazardCard.astro`
- Modify: `src/pages/[lang]/mountain/[slug].astro`

- [ ] **Step 1: 위험요소 카드 컴포넌트**

`src/components/HazardCard.astro`:

```astro
---
import { getCollection } from 'astro:content';
import { resolveText } from '../lib/i18n';

interface Props { id: string; lang: string; }
const { id, lang } = Astro.props;

const all = await getCollection('safety');
const doc = all.find((d) => d.data.id === id);
const resolved = doc ? resolveText(doc.data.text, lang) : null;
---
{resolved && (
  <a class="hazard" href={`/${lang}/safety/${id}`}>
    <strong>{resolved.value.title}</strong>
    <span>{resolved.value.body[0]}</span>
  </a>
)}

<style>
  .hazard { display: block; border-left: 3px solid var(--c-warn); padding: var(--unit) calc(var(--unit) * 2); margin: var(--unit) 0; color: inherit; text-decoration: none; }
  .hazard:hover { background: var(--c-surface); }
  strong { display: block; }
  span { font-size: 0.875rem; color: var(--c-fg-muted); }
</style>
```

- [ ] **Step 2: 안전 문서 상세**

`src/pages/[lang]/safety/[slug].astro` — `getStaticPaths`에서 `safety` 컬렉션과
`LIVE_LANGUAGES`를 조합한다. `resolveText`로 본문을 꺼내고, `isFallback`이면
`t('fallback.notice')`를 표시한다. `body` 배열을 `<p>`로 렌더링한다.

- [ ] **Step 3: 안전 허브**

`src/pages/[lang]/safety/index.astro` — `category`별(`hazard` / `seasonal` /
`emergency`)로 묶어 목록을 낸다.

- [ ] **Step 4: 장소 상세에 위험요소 카드 삽입**

`src/pages/[lang]/mountain/[slug].astro` 상단 import에 추가:

```astro
import HazardCard from '../../../components/HazardCard.astro';
```

`.cautions` 목록 바로 아래에 추가:

```astro
{place.safety.hazards.map((h) => <HazardCard id={h} lang={lang!} />)}
```

- [ ] **Step 5: 빌드 확인**

Run: `npm run build && npm run preview`
Expected: `/en/safety/emergency-call-119` 생성. 인왕산 상세에 `steep_stair` 카드가 보인다.

- [ ] **Step 6: 커밋**

```bash
git add src/pages src/components
git commit -m "feat: 안전 허브 + 장소별 위험요소 카드 연결"
```

---

## Task 13: 콘텐츠를 15건으로 확장

파이프라인이 검증된 뒤에 늘린다.

**Files:**
- Create: `src/content/places/*.json` (12건), `src/content/safety/*.json` (9건)

- [ ] **Step 1: 수도권 5건 추가**

관악산, 청계산, 남한산성, 수리산, 광교산. Task 7의 JSON 구조를 그대로 따른다.
각 장소는 `provenance.sources` 1건 이상을 반드시 갖는다.

- [ ] **Step 2: 체류 외국인 밀집 지역 인근 7건 추가**

안산·화성·김해 등 인근 산을 선정한다. 스펙 §11의 "두 타깃을 데이터 선정 단계에서
나눠 담는다"를 실행하는 단계다.

- [ ] **Step 3: 계절 가이드 4건 추가**

`category` `"seasonal"`, `season`은 각각 `spring` / `summer` / `autumn` / `winter`.

- [ ] **Step 4: 응급 대처 5건 추가**

저체온증, 탈진, 발목 부상, 길 잃음, 낙상. `category` `"emergency"`, `season` `null`.

**이 문서들은 A등급이다.** 기계번역 초안을 쓰더라도 게시 전 사람 검수를 거친다.

- [ ] **Step 5: 빌드 검증**

Run: `npm run build`
Expected: 성공. 스키마 위반이 있으면 파일명과 함께 실패한다.

- [ ] **Step 6: 커밋**

```bash
git add src/content
git commit -m "content: 장소 15건 + 안전 문서 12건으로 확장"
```

---

## Task 14: 접근성·성능 검증

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/a11y.spec.ts`

- [ ] **Step 1: Playwright 설치**

```bash
npm install -D @playwright/test @axe-core/playwright
npx playwright install chromium
```

- [ ] **Step 2: 설정 작성**

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 3: 테스트 작성**

`tests/e2e/a11y.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/en/',
  '/en/mountain/',
  '/en/mountain/inwangsan',
  '/en/safety/emergency-call-119',
  '/ko/mountain/inwangsan',
];

const MOBILE_WIDTH = 375;

for (const path of PAGES) {
  test(`${path} — WCAG AA 위반 없음`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test(`${path} — 375px 가로 오버플로 없음`, async ({ page }) => {
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 812 });
    await page.goto(path);
    // 주요 랜드마크의 오른쪽 끝이 뷰포트를 넘지 않으면 가로 스크롤이 생기지 않는다.
    for (const selector of ['nav', 'main']) {
      const box = await page.locator(selector).first().boundingBox();
      if (box) expect(box.x + box.width).toBeLessThanOrEqual(MOBILE_WIDTH);
    }
  });
}

test('영어 페이지는 한글 서체를 로딩하지 않는다', async ({ page }) => {
  await page.goto('/en/mountain/inwangsan');
  const href = await page.getAttribute('link[href*="fonts.googleapis"]', 'href');
  expect(href).not.toContain('Noto+Sans+KR');
});

test('한국어 페이지는 한글 서체를 로딩한다', async ({ page }) => {
  await page.goto('/ko/mountain/inwangsan');
  const href = await page.getAttribute('link[href*="fonts.googleapis"]', 'href');
  expect(href).toContain('Noto+Sans+KR');
});

test('hreflang이 출시 언어만 상호 참조한다', async ({ page }) => {
  await page.goto('/en/mountain/inwangsan');
  const links = page.locator('link[rel="alternate"]');
  const count = await links.count();
  const langs: (string | null)[] = [];
  for (let i = 0; i < count; i++) {
    langs.push(await links.nth(i).getAttribute('hreflang'));
  }
  expect(langs).toContain('en');
  expect(langs).toContain('ko');
  expect(langs).toContain('x-default');
  // 아직 출시하지 않은 언어는 노출하지 않는다
  expect(langs).not.toContain('mn');
});

test('출처 간 불일치를 화면에서 숨기지 않는다', async ({ page }) => {
  await page.goto('/en/mountain/bukhansan-dulle-1');
  await expect(page.locator('.prov')).toBeVisible();
});
```

- [ ] **Step 4: 실행**

Run: `npm run build && npx playwright test`
Expected: 전부 통과. 실패하면 코드를 고친다 — 테스트를 완화하지 않는다.

- [ ] **Step 5: 커밋**

```bash
git add tests/e2e playwright.config.ts package.json
git commit -m "test: WCAG AA + 375px 오버플로 + 폰트 분리 로딩 + hreflang 검증"
```

---

## Task 15: 배포

**Files:**
- Modify: `astro.config.mjs`

- [ ] **Step 1: site URL 설정**

`astro.config.mjs`에 `site`를 추가한다. hreflang과 sitemap이 이 값을 쓴다.

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://korea-outdoor.pages.dev',
  integrations: [sitemap()],
});
```

도메인이 확정되면 이 값만 바꾼다.

- [ ] **Step 2: GitHub 푸시**

```bash
git remote add origin <repo-url>
git push -u origin main
```

- [ ] **Step 3: Cloudflare Pages 연결**

빌드 명령 `npm run build`, 출력 디렉터리 `dist`, Node 20 이상.

- [ ] **Step 4: 배포 확인**

- `/en/`과 `/ko/`가 각각 열린다
- `/`가 `/en/`으로 리다이렉트된다
- hreflang 태그가 두 언어를 상호 참조한다
- `sitemap-index.xml`이 생성되었다

- [ ] **Step 5: 커밋**

```bash
git add astro.config.mjs
git commit -m "chore: 배포 설정 — site URL, sitemap"
```

---

## 언어 추가 절차 (3번째 언어부터)

이 절차에 **코드 수정이 없어야** Phase 1이 성공한 것이다.

1. `src/config/languages.ts`에서 해당 언어의 `status`를 `'planned'` → `'live'`로 변경
2. `src/i18n/{lang}.json` 생성 — `en.json`의 키를 전부 채운다
3. 각 장소 JSON에 `text.{lang}` 추가 — 없으면 영어로 폴백하고 안내가 뜬다
4. 안전 문서에 `text.{lang}` 추가 — **A등급이므로 사람 검수 필수**
5. `tests/e2e/a11y.spec.ts`의 `PAGES`에 해당 언어 경로 1건 추가
6. `npm run build && npx playwright test`

라우팅·hreflang·sitemap·폰트는 자동으로 따라온다.

---

## Self-Review

**스펙 커버리지**

| 스펙 항목 | 담당 Task |
|---|---|
| §4 아키텍처 (Astro SSG, Cloudflare) | 1, 15 |
| §5.1 Place 모델 | 6, 7 |
| §5.2 signage_langs 미확인 처리 | 6(nullable), 9(문구), 10(필터) |
| §5.3 provenance | 6, 9, 14 |
| §5.4 안전 콘텐츠 | 7, 12, 13 |
| §6 교차검증 규칙 | 3 |
| §7 번역 정책·폴백 | 4, 7, 13 |
| §8 URL·hreflang·sitemap | 2, 8, 11, 15 |
| §9 두 진입점 | 11 |
| §10 필터 | 10 |
| §11 초기 콘텐츠 15건 | 7, 13 |
| §12 출시 조건 | 14 |
| §12 확장 준비 조건 | 2, 5, 8, 14 + 「언어 추가 절차」 |

**의도적 미커버**

§6의 `scripts/fetch/*` 실제 공공데이터 수집기는 이 계획에 포함하지 않았다.
엔드포인트와 파라미터를 실물로 확인해야 작성할 수 있으며, 추측으로 코드를 적으면
그 자체가 플레이스홀더다. Task 3의 `reconcile`이 판정 로직을 이미 담고 있으므로,
수집기는 공공데이터포털에서 API를 확인한 뒤 별도 작업으로 붙인다. 그때까지
`provenance`는 수동 입력한다 — Task 7·13의 콘텐츠가 그 방식이다.

**타입 일관성 확인**

- `VerificationStatus`(Task 3) = 스키마 `verification.status` enum(Task 6) = `ProvenanceBlock` props(Task 9) — `'verified' | 'single_source' | 'conflict'` 일치
- `Script`(Task 2)의 유니온 = `SCRIPT_EXTRA`(Task 5)의 키 — `latin`/`cyrillic`은 의도적으로 비움
- `resolveText`(Task 4) 반환 `{ value, isFallback }` — Task 9·10·12에서 동일 이름으로 사용
- `makeTranslator(fallbackDict, dict)` 2인자(Task 4) — Task 9·10 호출부 일치
- `CardData.signageEn` `boolean | null`(Task 10) = 스키마 `signage_langs` nullable(Task 6) — 일치
- `HazardCard`의 `id`(Task 12) = 장소 `safety.hazards` 원소(Task 7) — 파일명이 곧 id
