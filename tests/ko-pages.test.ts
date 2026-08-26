import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// 한국어 페이지에 영문이 남아 있는지 본다.
//
// 이런 검사가 레포에 하나도 없었다. 그래서 지역 필터가 시도 코드(11·27…)를 그대로
// 뿌리고, All·≤ 2h 가 번역되지 않고, meta description 이 영어인 채로 배포까지 갔다.
//
// 두 가지를 반드시 지킨다:
//   1. <head> 를 본다 — description 이 거기 있었다
//   2. 1~2단어짜리도 본다 — All·≤ 2h 는 짧아서 산문 검사로는 안 걸린다
//
// 빌드 산출물을 검사한다. 소스만 보면 t() 를 통과했는지는 알아도, 사전에 키가
// 빠져 키 문자열이 그대로 찍히는 것은 못 잡는다.

const DIST_KO = join(process.cwd(), 'dist', 'ko');

function htmlFilesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFilesUnder(p));
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

/** 한국어 페이지에 있어도 되는 것: 단위·약어. 늘릴 때는 이유를 함께 적는다. */
const ALLOWED = [
  /^[\d.,\s]*(km|m|h|min)$/i, // 단위가 붙은 수치 — "3.2 km", "835 m"
  /^(KNPS|GPX|API|CSV|SRTM|DEM|WCAG|SEO)$/i, // 약어
];

function isSuspect(s: string): boolean {
  const t = s.trim();
  if (!t) return false;
  if (!/[A-Za-z]/.test(t)) return false; // 라틴 문자가 없으면 통과
  if (/[가-힣]/.test(t)) return false; // 한글이 섞였으면 번역된 것으로 본다
  return !ALLOWED.some((re) => re.test(t));
}

describe('한국어 페이지에 영문이 남지 않는다', () => {
  if (!existsSync(DIST_KO)) {
    it('dist/ko 가 없다 — npm run build 를 먼저 돌린다', () => {
      throw new Error(`${DIST_KO} 가 없다. 이 검사는 빌드 산출물을 본다.`);
    });
    return;
  }

  const files = htmlFilesUnder(DIST_KO);

  it('검사할 페이지가 있다', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    const rel = file.slice(file.indexOf('dist')).replace(/\\/g, '/');
    const html = readFileSync(file, 'utf8');

    // ── <head> — 여기를 안 봐서 description 이 영어인 채 배포됐다 ──────────
    it(`${rel} <title> 이 번역돼 있다`, () => {
      const m = html.match(/<title>([^<]*)<\/title>/);
      expect(m, '<title> 이 없다').not.toBeNull();
      expect(isSuspect(m![1]), `번역 누락: ${m![1]}`).toBe(false);
    });

    it(`${rel} meta description 이 번역돼 있다`, () => {
      const m = html.match(/<meta\s+name="description"\s+content="([^"]*)"/);
      if (!m) return; // description 이 없는 페이지는 이 검사의 대상이 아니다
      expect(isSuspect(m[1]), `번역 누락: ${m[1]}`).toBe(false);
    });

    // ── <option> — 1~2단어라 산문 검사로는 안 걸린다 ──────────────────────
    it(`${rel} <option> 라벨이 번역돼 있다`, () => {
      const labels = [...html.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map((m) => m[1]);
      const bad = labels.filter(isSuspect);
      expect(bad, `번역 누락: ${bad.join(' · ')}`).toEqual([]);
    });

    // 지역 필터가 시도 코드(11·27…)를 그대로 뿌렸는데 위 검사가 못 잡았다 —
    // 코드에는 라틴 문자가 없어서 통과한다. 라벨이 value 와 같으면 사전을 안 거친 것이다.
    it(`${rel} <option> 라벨이 value 를 그대로 뿌리지 않는다`, () => {
      const bad = [...html.matchAll(/<option[^>]*\svalue="([^"]*)"[^>]*>([^<]*)<\/option>/g)]
        .filter(([, value, label]) => value.trim() === label.trim())
        .map(([, value]) => value);
      expect(bad, `번역을 안 거친 코드: ${bad.join(' · ')}`).toEqual([]);
    });
  }
});
