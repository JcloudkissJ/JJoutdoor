export type CardData = {
  region: string;
  difficulty: 1 | 2 | 3;
  durationMin: number;
  /** null = 표지판 언어 미확인 */
  signageEn: boolean | null;
  /** null = 화장실 여부 미확인 */
  restroom: boolean | null;
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
  if (f.restroom && card.restroom !== true) return false;
  return true;
}
