import { scriptFor, type Script } from '../config/languages';

/** 모든 언어에 공통으로 필요한 서체. 라틴과 키릴을 함께 덮는다. */
export const BASE_FAMILIES = [
  'Source Serif 4:wght@400;600',
  'Inter:wght@400;500;700',
  'IBM Plex Mono:wght@400;600',
] as const;

/** 스크립트별 추가 서체. latin과 cyrillic은 공통 서체(Source Serif 4, Inter, IBM Plex Mono)가 충분하므로 null. */
const SCRIPT_EXTRA: Record<Script, string | null> = {
  latin: null,      // 공통 서체가 덮는다
  cyrillic: null,   // 공통 서체가 덮는다
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
