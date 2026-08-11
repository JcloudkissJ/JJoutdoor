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
    if (!(Number.isFinite(r.value) && r.value > 0)) {
      throw new Error(`reconcile requires positive finite values, got ${r.value} from ${r.org}`);
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
