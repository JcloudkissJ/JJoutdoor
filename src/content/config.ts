import type { VerificationStatus } from '../lib/reconcile';
import { defineCollection, z } from 'astro:content';

const localizedText = z.object({
  summary: z.string().min(1),
  caution1: z.string().min(1),
  caution2: z.string().min(1),
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
  access: z.object({
    transit: z.object({
      subway: z.boolean(),
      station_i18n: z.record(z.string()).optional(),
      walk_min: z.number().nonnegative(),
    }),
    // null = 미확인. 추측해서 채우지 않는다.
    signage_langs: z.array(z.string()).nullable(),
    // null = field-verified되지 않음. 추측해서 채우지 않는다.
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
