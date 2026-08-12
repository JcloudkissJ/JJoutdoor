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

// Unverified amenities filter test
test('미확인 편의시설 - restroom 필터 적용 시 결과 없음', async ({ page }) => {
  await page.goto('/en/mountain/');

  // 필터를 클릭 — restroom 체크박스
  const restroomCheckbox = page.locator('input[name="restroom"]');
  await restroomCheckbox.check();

  // 필터가 적용될 때까지 대기 - 빈 메시지가 보여질 때까지
  const emptyMessage = page.locator('#empty');
  await expect(emptyMessage).toBeVisible();

  // 보이는 카드 개수 확인 (hidden 클래스가 없는 카드만 세기)
  const allCards = page.locator('article.card');
  const hiddenCards = page.locator('article.card.hidden');
  const hiddenCount = await hiddenCards.count();
  const totalCount = await allCards.count();
  const visibleCount = totalCount - hiddenCount;

  expect(visibleCount).toBe(0);
});

// Duration filter test
test('기간 필터 — 2시간 이하 선택 시 3개 카드 표시', async ({ page }) => {
  await page.goto('/en/mountain/');

  // ≤2h 필터 선택 (value="short")
  await page.selectOption('#duration-select', 'short');

  await page.waitForTimeout(300);

  const cards = page.locator('article.card:not(.hidden)');
  const count = await cards.count();
  expect(count).toBe(3);
});

test('기간 필터 — 2-3시간 선택 시 0개 카드 표시', async ({ page }) => {
  await page.goto('/en/mountain/');

  // 2-3h 필터 선택 (value="mid")
  await page.selectOption('#duration-select', 'mid');

  await page.waitForTimeout(300);

  const cards = page.locator('article.card:not(.hidden)');
  const count = await cards.count();
  expect(count).toBe(0);
});

test('기간 필터 — 3시간 이상 선택 시 0개 카드 표시', async ({ page }) => {
  await page.goto('/en/mountain/');

  // >3h 필터 선택 (value="long")
  await page.selectOption('#duration-select', 'long');

  await page.waitForTimeout(300);

  const cards = page.locator('article.card:not(.hidden)');
  const count = await cards.count();
  expect(count).toBe(0);
});

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
