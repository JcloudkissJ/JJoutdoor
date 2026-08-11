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
