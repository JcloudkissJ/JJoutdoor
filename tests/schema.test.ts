import fs from 'node:fs';
import path from 'node:path';
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
  metrics_origin: {
    elevation_m: { kind: 'sourced', org: 'forest_service' },
    distance_km: { kind: 'sourced', org: 'forest_service' },
    duration_min: { kind: 'estimated', method: 'naismith_v1' },
    difficulty: { kind: 'manual' },
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

  it('미확인 편의시설은 null로 둘 수 있다 — restroom, water_refill, cell_coverage 모두', () => {
    const unverified = {
      ...valid,
      access: {
        ...valid.access,
        restroom: null,
        water_refill: null,
        cell_coverage: null,
      },
    };
    expect(placeSchema.safeParse(unverified).success).toBe(true);
  });

  it('추정값에 method가 없으면 거부한다 — 재현 불가능한 추정은 검증할 수 없다', () => {
    const noMethod = {
      ...valid,
      metrics_origin: { ...valid.metrics_origin, duration_min: { kind: 'estimated' } },
    };
    expect(placeSchema.safeParse(noMethod).success).toBe(false);
  });

  it('출처값에 org가 없으면 거부한다 — 출처 없는 인용은 출처가 아니다', () => {
    const noOrg = {
      ...valid,
      metrics_origin: { ...valid.metrics_origin, elevation_m: { kind: 'sourced' } },
    };
    expect(placeSchema.safeParse(noOrg).success).toBe(false);
  });

  it('네 지표의 출처를 모두 명시해야 한다', () => {
    const { difficulty: _omitted, ...partial } = valid.metrics_origin;
    expect(placeSchema.safeParse({ ...valid, metrics_origin: partial }).success).toBe(false);
  });

  it('거리가 있는데 출처가 없으면 거부한다', () => {
    const orphanValue = {
      ...valid,
      metrics_origin: { ...valid.metrics_origin, distance_km: null },
    };
    expect(placeSchema.safeParse(orphanValue).success).toBe(false);
  });

  it('거리가 없는데 출처만 있으면 거부한다', () => {
    const orphanOrigin = { ...valid, metrics: { ...valid.metrics, distance_km: null } };
    expect(placeSchema.safeParse(orphanOrigin).success).toBe(false);
  });

  it('출처가 거리를 주지 않은 코스는 값과 출처를 함께 null 로 둘 수 있다', () => {
    // 숲나들e 100대명산은 추천코스와 소요시간을 주면서 거리는 100건 전부 주지 않는다.
    const noDistance = {
      ...valid,
      metrics: { ...valid.metrics, distance_km: null },
      metrics_origin: { ...valid.metrics_origin, distance_km: null },
    };
    expect(placeSchema.safeParse(noDistance).success).toBe(true);
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

/**
 * 소요시간은 계산하지 않고 공식 등산로의 값을 인용한다.
 *
 * 스키마는 `estimated` 를 여전히 허용한다 — 다른 지표에는 쓸 수 있기 때문이다.
 * 그래서 "소요시간만은 계산값을 쓰지 않는다"는 결정은 스키마가 아니라 여기서 지킨다.
 */
describe('콘텐츠 정책 — 소요시간에 계산값을 쓰지 않는다', () => {
  const dir = path.resolve(__dirname, '../src/content/places');
  const places = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));

  it('장소를 실제로 읽었다 — 빈 목록이면 이 검사가 헛돈다', () => {
    expect(places.length).toBeGreaterThan(0);
  });

  for (const { file, data } of places) {
    it(`${file} — duration_min 은 sourced 이거나 manual 이다`, () => {
      expect(['sourced', 'manual']).toContain(data.metrics_origin.duration_min.kind);
    });
  }
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
