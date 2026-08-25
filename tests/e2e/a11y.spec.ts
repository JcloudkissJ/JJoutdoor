import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/en/',
  '/en/mountain/',
  '/en/mountain/inwangsan',
  '/en/safety/',
  '/en/safety/emergency-call-119',
  '/ko/',
  '/ko/mountain/',
  '/ko/mountain/inwangsan',
  '/ko/safety/',
  '/ko/safety/emergency-call-119',
];

const MOBILE_WIDTH = 375;

// WCAG AA and horizontal overflow tests for each page
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

// Font loading tests
test('영어 페이지는 한글 서체를 로딩하지 않는다', async ({ page }) => {
  await page.goto('/en/mountain/inwangsan');
  const href = await page.getAttribute('link[rel="stylesheet"][href*="fonts.googleapis"]', 'href');
  expect(href).not.toContain('Noto+Sans+KR');
});

test('한국어 페이지는 한글 서체를 로딩한다', async ({ page }) => {
  await page.goto('/ko/mountain/inwangsan');
  const href = await page.getAttribute('link[rel="stylesheet"][href*="fonts.googleapis"]', 'href');
  expect(href).toContain('Noto+Sans+KR');
});

// hreflang tests
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

// Provenance block visibility
test('출처 간 불일치를 화면에서 숨기지 않는다', async ({ page }) => {
  await page.goto('/en/mountain/bukhansan-dulle-1');
  await expect(page.locator('.prov')).toBeVisible();
});

// Signage language notice tests
test('서명 언어 미확인 - bukhansan-dulle-1이 공지를 표시한다', async ({ page }) => {
  await page.goto('/en/mountain/bukhansan-dulle-1');
  const warn = page.locator('.warn');
  const text = await warn.textContent();
  expect(text).toContain('Signage languages not confirmed');
});

test('서명 언어 확인됨 - inwangsan은 공지를 표시하지 않는다', async ({ page }) => {
  await page.goto('/en/mountain/inwangsan');
  const warn = page.locator('.warn');
  const count = await warn.count();
  // 공지가 없거나 있어도 다른 내용이어야 함
  if (count > 0) {
    const text = await warn.textContent();
    expect(text).not.toContain('Signage languages not confirmed');
  }
});

// ── 필터 — 두 언어에서 동일하게 동작해야 한다 (스펙 §12 출시 조건) ──────────
//
// 필터 컨트롤의 id 와 option value 는 언어 독립이고 라벨만 번역되므로
// 같은 선택자로 두 언어를 돌린다. 한쪽 언어만 검사하면 번역이 선택자를
// 건드렸을 때 조용히 깨진다.
//
// 기대 개수는 콘텐츠에서 온다. 장소를 추가하면 여기도 함께 고친다.
//   ≤2h  아차산 80 · 인왕산 90 · 백운대코스 90 · 덕숭산 105 · 경주 남산 115 · 둘레길 1구간 120
//   2-3h 삼악산 150 · 백운산(포천) 155 · 북한산성코스 160 · 감악산 175 · 방장산 180
//   >3h  유명산 185 · 마니산 195 · 관악산 210 · 도봉산 215 · 계룡산 230 · 북한산 추천코스 270
//        비슬산 290 · 무등산 300 · 신불산 330 · 금정산 335
const DURATION_BUCKETS = [
  { value: 'short', label: '2시간 이하', expected: 6 },
  { value: 'mid', label: '2-3시간', expected: 5 },
  { value: 'long', label: '3시간 이상', expected: 10 },
];

const FILTER_LANGS = ['en', 'ko'];

for (const lang of FILTER_LANGS) {
  test(`/${lang}/ 미확인 편의시설 — restroom 필터 적용 시 결과 없음`, async ({ page }) => {
    await page.goto(`/${lang}/mountain/`);

    await page.locator('input[name="restroom"]').check();

    // 편의시설은 전 장소가 null 이라 하나도 남지 않아야 한다.
    await expect(page.locator('#empty')).toBeVisible();
    expect(await page.locator('article.card:not(.hidden)').count()).toBe(0);
  });

  for (const bucket of DURATION_BUCKETS) {
    test(`/${lang}/ 기간 필터 — ${bucket.label} 선택 시 ${bucket.expected}개 카드`, async ({ page }) => {
      await page.goto(`/${lang}/mountain/`);

      await page.selectOption('#duration-select', bucket.value);
      await page.waitForTimeout(300);

      expect(await page.locator('article.card:not(.hidden)').count()).toBe(bucket.expected);
    });
  }
}

// ── 카드 링크가 실제로 열리는가 ────────────────────────────────────────────
//
// 목록·지역·반나절 세 페이지가 각자 href 를 만든다. 세 곳 모두 언어 접두어를
// 빼먹어 **모든 카드가 404 로 가고 있었다** — 75d8f80 이후 줄곧, 배포된 뒤에야
// 사람이 눌러보고 발견했다.
//
// 페이지가 200 이고 카드가 보이는 것만 검사하면 이 버그를 못 잡는다.
// 링크를 실제로 따라가 봐야 한다.
const LIST_PAGES = ['mountain/', 'near/11/', 'half-day-from-seoul/'];

for (const lang of FILTER_LANGS) {
  for (const listPath of LIST_PAGES) {
    test(`/${lang}/${listPath} 첫 카드 링크가 열린다`, async ({ page }) => {
      await page.goto(`/${lang}/${listPath}`);

      const href = await page.locator('article.card a.card-link').first().getAttribute('href');

      // 규칙 9 — /{lang}/{type}/{slug}. 접두어가 빠지면 여기서 걸린다.
      expect(href).toMatch(new RegExp(`^/${lang}/mountain/`));

      const response = await page.goto(href!);
      expect(response?.status()).toBe(200);
      await expect(page.locator('h1')).toBeVisible();
    });
  }
}

// No-JavaScript rendering test
test('목록은 JavaScript 없이도 표시된다', async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
  });
  const page = await context.newPage();

  await page.goto('http://localhost:4321/en/mountain/');
  await page.waitForLoadState('networkidle');

  // 3개 장소 이름 모두 보여야 함
  await expect(page.locator('text=Inwangsan')).toBeVisible();
  await expect(page.locator('text=Bukhansan Dulle-gil Section 1')).toBeVisible();
  await expect(page.locator('text=Achasan')).toBeVisible();

  await context.close();
});
