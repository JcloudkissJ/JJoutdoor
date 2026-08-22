import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // hreflang과 sitemap이 이 값으로 절대 URL을 만든다.
  // 도메인이 확정되면 이 한 줄만 바꾼다 — 나머지는 전부 여기서 파생된다.
  site: 'https://morning-pine-5579.cartroad.workers.dev',
  integrations: [tailwind(), sitemap()],
  output: 'static',
});
