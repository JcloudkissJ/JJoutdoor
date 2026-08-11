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
];

/** 미번역 필드가 폴백하는 언어. */
export const FALLBACK_LANG = 'en';

export const LIVE_LANGUAGES = LANGUAGES.filter((l) => l.status === 'live');

export function isLive(code: string): boolean {
  return LIVE_LANGUAGES.some((l) => l.code === code);
}

/** 언어 코드에 해당하는 스크립트를 반환한다. 등록되지 않은 코드면 throw — 조용히 폴백하지 않는다. */
export function scriptFor(code: string): Script {
  const lang = LANGUAGES.find((l) => l.code === code);
  if (!lang) throw new Error(`Unknown language: ${code}`);
  return lang.script;
}
