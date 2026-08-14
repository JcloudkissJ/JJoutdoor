import type { VerificationStatus } from '../lib/reconcile';
import { defineCollection, z } from 'astro:content';

const localizedText = z.object({
  summary: z.string().min(1),
  caution1: z.string().min(1),
  caution2: z.string().min(1),
});

/**
 * 수치 하나의 출처.
 *
 * 공공데이터로 채울 수 있는 것은 고도·좌표·거리뿐이다. 소요시간은 어느
 * 출처에도 없고 난이도 코드는 97% 이상이 한 값이라 쓸 수 없다. 그래서
 * 일부 수치는 계산해야 하는데, 계산한 값을 확인된 값처럼 보여주면
 * 이 프로젝트가 지켜온 규칙이 무너진다.
 *
 * estimated 인데 method 가 없으면 빌드가 실패한다. "추정했다"만 적고
 * "어떻게"를 빠뜨리면 재현할 수 없고, 재현할 수 없는 값은 검증할 수 없다.
 */
const metricOrigin = z
  .object({
    kind: z.enum(['sourced', 'estimated', 'manual']),
    /** estimated 일 때 필수. 예: 'naismith_v1' */
    method: z.string().min(1).optional(),
    /** sourced 일 때 어느 기관인지. 예: 'forest_service' */
    org: z.string().min(1).optional(),
  })
  .refine((o) => o.kind !== 'estimated' || !!o.method, {
    message: 'estimated 수치에는 method 가 필요하다 — 재현할 수 없는 추정은 검증할 수 없다',
  })
  .refine((o) => o.kind !== 'sourced' || !!o.org, {
    message: 'sourced 수치에는 org 가 필요하다 — 출처 없는 인용은 출처가 아니다',
  });

export const placeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['mountain', 'island', 'fishing']),
  name_i18n: z.record(z.string()).refine((v) => 'en' in v, { message: 'English name required' }),
  region: z.object({ sido: z.string(), sigungu: z.string() }),
  // 대한민국 육상 범위. 벗어난 좌표는 데이터 오류다.
  coords: z.object({
    lat: z.number().min(33).max(39),
    lng: z.number().min(124).max(132),
  }),
  metrics: z.object({
    elevation_m: z.number().positive(),
    distance_km: z.number().positive(),
    duration_min: z.number().positive(),
    difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  // 각 수치가 어디서 왔는지. 값과 출처를 나란히 두지 않으면 화면에서
  // "확인된 값"과 "계산한 값"을 구분할 수 없다.
  //
  // 네 지표를 모두 명시해야 한다. 지표를 추가하면 여기서 검증이 깨져
  // 출처를 정하지 않은 채 넘어갈 수 없다.
  metrics_origin: z.object({
    elevation_m: metricOrigin,
    distance_km: metricOrigin,
    duration_min: metricOrigin,
    difficulty: metricOrigin,
  }),
  access: z.object({
    transit: z.object({
      subway: z.boolean(),
      station_i18n: z.record(z.string()).optional(),
      walk_min: z.number().nonnegative(),
    }),
    // 다음 필드들은 null = 미확인. 추측해서 채우지 않는다:
    // signage_langs, restroom, water_refill, cell_coverage
    signage_langs: z.array(z.string()).nullable(),
    restroom: z.boolean().nullable(),
    water_refill: z.boolean().nullable(),
    entry_fee_krw: z.number().nonnegative(),
    open_hours: z.object({ type: z.string(), detail: z.string() }).optional(),
    cell_coverage: z.enum(['good', 'partial', 'none']).nullable(),
  }),
  safety: z.object({
    hazards: z.array(z.string()),
    sunset_caution: z.boolean(),
  }),
  // 영어는 폴백 언어이므로 반드시 존재해야 한다.
  text: z.record(localizedText).refine((v) => 'en' in v, { message: 'English text required' }),
  provenance: z.object({
    sources: z
      .array(
        z.object({
          org: z.string(),
          dataset: z.string(),
          url: z.string().optional(),
          fetched_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        }),
      )
      .min(1, 'at least one source required'),
    verification: z.object({
      status: z.enum(['verified', 'single_source', 'conflict'] as const satisfies readonly VerificationStatus[]),
      checked_fields: z.array(z.string()),
      note: z.string().optional(),
    }),
  }),
});

export const safetySchema = z.object({
  id: z.string().min(1),
  category: z.enum(['hazard', 'seasonal', 'emergency']),
  season: z.enum(['spring', 'summer', 'autumn', 'winter']).nullable(),
  text: z
    .record(z.object({ title: z.string().min(1), body: z.array(z.string().min(1)).min(1) }))
    .refine((v) => 'en' in v, { message: 'English safety text required' }),
});

export const collections = {
  places: defineCollection({ type: 'data', schema: placeSchema }),
  safety: defineCollection({ type: 'data', schema: safetySchema }),
};
