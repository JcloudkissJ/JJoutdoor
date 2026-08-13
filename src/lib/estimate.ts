/**
 * 소요시간 추정.
 *
 * 왜 추정하는가: 공공데이터 조사 결과 소요시간을 주는 출처가 없다. 산림청
 * 등산로 데이터의 시간 필드는 평균 80m짜리 선분 단위라 코스 시간이 아니고,
 * 한국등산트레킹지원센터 코스 데이터에는 시간 필드 자체가 없다.
 *
 * 그래서 계산하되, 계산했다는 사실을 데이터에 남긴다
 * (`metrics_origin.duration_min = { kind: 'estimated', method: NAISMITH_V1 }`).
 */

/** `metrics_origin.method` 에 기록할 식별자. 데이터와 코드가 어긋나지 않도록 여기서만 정의한다. */
export const NAISMITH_V1 = 'naismith_v1';

/** 평지 이동 속도. Naismith 규칙의 첫 항. */
const FLAT_KM_PER_HOUR = 5;

/** 상승 보정. Naismith 규칙의 두 번째 항 — 600m 오를 때마다 1시간을 더한다. */
const ASCENT_M_PER_HOUR = 600;

/**
 * 반올림 단위(분).
 *
 * 87분 같은 값은 측정한 것처럼 읽힌다. 추정에 분 단위 정밀도는 없으므로
 * 5분으로 끊어 근사값임이 드러나게 한다.
 */
export const ROUND_TO_MIN = 5;

export type EstimateInput = {
  /** 코스 거리(km). 0 이하 불가. */
  distanceKm: number;
  /** 누적 상승(m). 0 이상. 하강은 보정하지 않는다. */
  ascentM: number;
};

/**
 * Naismith 규칙으로 소요시간(분)을 추정한다.
 *
 *   시간 = 거리 / 5km_per_h + 상승 / 600m_per_h
 *
 * **초보 보정 계수를 곱하지 않는다.** 이 사이트의 독자는 초보 외국인이고
 * Naismith 는 체력 좋은 등산자를 가정하므로 실제보다 짧게 나온다. 그렇다고
 * 근거 없는 계수(예: 1.3배)를 넣으면 그 숫자를 방어할 수 없다. 여유는
 * 조작된 상수가 아니라 안내 문구로 전달한다.
 *
 * 하강 보정(Tranter 등)도 넣지 않았다. 규칙 원형을 그대로 두어야 값의
 * 출처를 설명할 수 있다.
 */
export function estimateDurationMin({ distanceKm, ascentM }: EstimateInput): number {
  if (!Number.isFinite(distanceKm) || !Number.isFinite(ascentM)) {
    throw new Error(
      `estimateDurationMin requires finite numbers, got distanceKm=${distanceKm} ascentM=${ascentM}`,
    );
  }
  if (!(distanceKm > 0)) {
    throw new Error(`estimateDurationMin requires positive distance, got ${distanceKm}`);
  }
  if (ascentM < 0) {
    throw new Error(
      `estimateDurationMin requires non-negative ascent, got ${ascentM} — 내리막은 시간을 줄여주지 않는다`,
    );
  }

  const minutes = (distanceKm / FLAT_KM_PER_HOUR) * 60 + (ascentM / ASCENT_M_PER_HOUR) * 60;
  const rounded = Math.round(minutes / ROUND_TO_MIN) * ROUND_TO_MIN;

  // 아주 짧은 코스가 0분이 되면 "시간이 걸리지 않는다"는 거짓말이 된다.
  return Math.max(ROUND_TO_MIN, rounded);
}
