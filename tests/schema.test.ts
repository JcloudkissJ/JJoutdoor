import { describe, it, expect } from 'vitest';
import { placeSchema, safetySchema } from '../src/content/config';

const valid = {
  id: 'inwangsan',
  type: 'mountain',
  name_i18n: { en: 'Inwangsan', ko: '인왕산' },
  region: { sido: '11', sigungu: '11110' },
  coords: { lat: 37.58, lng: 126.9585 },
  metrics: { elevation_m: 338, distance_km: 3.2, duration_min: 90, difficulty: 1 },
  access: {
    transit: { subway: true, walk_min: 10 },
    signage_langs: ['ko', 'en'],
    restroom: true,
    water_refill: false,
    entry_fee_krw: 0,
    cell_coverage: 'good',
  },
  safety: { hazards: ['steep_stair'], sunset_caution: true },
  text: { en: { summary: 's', caution1: 'c1', caution2: 'c2' } },
  provenance: {
    sources: [{ org: 'knps', dataset: '탐방로 정보', fetched_at: '2026-08-10' }],
    verification: { status: 'single_source', checked_fields: ['distance_km'] },
  },
};

describe('placeSchema', () => {
  it('유효한 장소를 통과시킨다', () => {
    expect(placeSchema.safeParse(valid).success).toBe(true);
  });

  it('영어 텍스트는 필수다 — 폴백 언어이기 때문', () => {
    const noEn = { ...valid, text: { ko: { summary: 's', caution1: 'c', caution2: 'c' } } };
    expect(placeSchema.safeParse(noEn).success).toBe(false);
  });

  it('영어 이름은 필수다 — 폴백 언어이기 때문', () => {
    const noEn = { ...valid, name_i18n: { ko: '인왕산' } };
    expect(placeSchema.safeParse(noEn).success).toBe(false);
  });

  it('출처가 없는 장소는 거부한다', () => {
    const noSource = { ...valid, provenance: { ...valid.provenance, sources: [] } };
    expect(placeSchema.safeParse(noSource).success).toBe(false);
  });

  it('난이도는 1~3만 허용한다', () => {
    const bad = { ...valid, metrics: { ...valid.metrics, difficulty: 5 } };
    expect(placeSchema.safeParse(bad).success).toBe(false);
  });

  it('미확인 표지판 언어는 null로 둘 수 있다 — 추측 금지', () => {
    const unknown = { ...valid, access: { ...valid.access, signage_langs: null } };
    expect(placeSchema.safeParse(unknown).success).toBe(true);
  });

  it('섬·낚시 타입을 스키마 수준에서 미리 허용한다', () => {
    expect(placeSchema.safeParse({ ...valid, type: 'island' }).success).toBe(true);
  });

  it('좌표가 한국 범위를 벗어나면 거부한다', () => {
    const bad = { ...valid, coords: { lat: 0, lng: 0 } };
    expect(placeSchema.safeParse(bad).success).toBe(false);
  });

  it('조회 일자는 YYYY-MM-DD 형식이어야 한다', () => {
    const bad = {
      ...valid,
      provenance: {
        ...valid.provenance,
        sources: [{ org: 'knps', dataset: 'x', fetched_at: '2026/08/10' }],
      },
    };
    expect(placeSchema.safeParse(bad).success).toBe(false);
  });
});

describe('safetySchema', () => {
  it('유효한 안전 문서를 통과시킨다', () => {
    const validSafety = {
      id: 'summer_heat',
      category: 'seasonal',
      season: 'summer',
      text: { en: { title: 'Heat Risk', body: ['Stay hydrated'] } },
    };
    expect(safetySchema.safeParse(validSafety).success).toBe(true);
  });

  it('영어 안전 텍스트는 필수다', () => {
    const noEn = {
      id: 'summer_heat',
      category: 'seasonal',
      season: 'summer',
      text: { ko: { title: '더위', body: ['수분 섭취'] } },
    };
    expect(safetySchema.safeParse(noEn).success).toBe(false);
  });
});
