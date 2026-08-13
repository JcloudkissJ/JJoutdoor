import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  estimateDurationMin,
  NAISMITH_V1,
  NAISMITH_NET_ASCENT_SRTM30M_V1,
  SRTM30M_NET_V1,
  ROUND_TO_MIN,
} from '../src/lib/estimate';

describe('estimateDurationMin — Naismith 규칙', () => {
  it('평지 5km는 1시간이다 — 규칙의 기준선', () => {
    expect(estimateDurationMin({ distanceKm: 5, ascentM: 0 })).toBe(60);
  });

  it('상승 600m는 1시간을 더한다 — 규칙의 두 번째 항', () => {
    // 1km(12분) + 600m 상승(60분) = 72분 → 5분 단위로 70
    expect(estimateDurationMin({ distanceKm: 1, ascentM: 600 })).toBe(70);
  });

  it('거리와 상승을 더한다', () => {
    // 10km(120분) + 800m(80분) = 200분
    expect(estimateDurationMin({ distanceKm: 10, ascentM: 800 })).toBe(200);
  });

  it('5분 단위로 반올림한다 — 분 단위 정밀도는 추정에 없다', () => {
    // 3.2km(38.4분) + 200m(20분) = 58.4분 → 60
    expect(estimateDurationMin({ distanceKm: 3.2, ascentM: 200 })).toBe(60);
    expect(estimateDurationMin({ distanceKm: 3.2, ascentM: 200 }) % ROUND_TO_MIN).toBe(0);
  });

  it('아무리 짧아도 0분을 내지 않는다', () => {
    expect(estimateDurationMin({ distanceKm: 0.05, ascentM: 0 })).toBeGreaterThan(0);
  });

  it('하강은 시간을 줄이지 않는다 — Naismith는 내리막을 보정하지 않는다', () => {
    expect(() => estimateDurationMin({ distanceKm: 4, ascentM: -100 })).toThrow(/ascent/i);
  });

  it('거리가 0 이하면 거부한다', () => {
    expect(() => estimateDurationMin({ distanceKm: 0, ascentM: 100 })).toThrow(/distance/i);
    expect(() => estimateDurationMin({ distanceKm: -1, ascentM: 100 })).toThrow(/distance/i);
  });

  it('유한하지 않은 값은 거부한다', () => {
    expect(() => estimateDurationMin({ distanceKm: Infinity, ascentM: 0 })).toThrow(/finite/i);
    expect(() => estimateDurationMin({ distanceKm: 3, ascentM: NaN })).toThrow(/finite/i);
  });

  it('method 식별자를 함께 내보낸다 — 데이터와 코드가 어긋나지 않게', () => {
    expect(NAISMITH_V1).toBe('naismith_v1');
    expect(NAISMITH_NET_ASCENT_SRTM30M_V1).toBe('naismith_net_ascent_srtm30m_v1');
    expect(SRTM30M_NET_V1).toBe('srtm30m_net_v1');
  });
});

/**
 * 빌드는 스키마만 본다 — 기록된 입력이 정말 그 숫자를 만드는지는 검사하지 않는다.
 * 거리나 상승을 고치고 소요시간을 안 고치면 "재현 가능한 추정"이 조용히 거짓이 된다.
 */
describe('콘텐츠 계약 — 추정한 소요시간은 기록된 입력으로 재현된다', () => {
  const dir = path.resolve(__dirname, '../src/content/places');
  const places = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) }));

  const estimated = places.filter((p) => p.data.metrics_origin.duration_min.kind === 'estimated');

  it('추정으로 표시된 장소가 실제로 있다 — 없으면 이 검사가 헛돈다', () => {
    expect(estimated.length).toBeGreaterThan(0);
  });

  for (const { file, data } of estimated) {
    it(`${file} — duration_min 이 distance_km · ascent_m 에서 재현된다`, () => {
      expect(data.metrics.ascent_m).not.toBeNull();
      expect(
        estimateDurationMin({
          distanceKm: data.metrics.distance_km,
          ascentM: data.metrics.ascent_m,
        }),
      ).toBe(data.metrics.duration_min);
    });

    it(`${file} — method 가 코드의 식별자와 일치한다`, () => {
      expect([NAISMITH_V1, NAISMITH_NET_ASCENT_SRTM30M_V1]).toContain(
        data.metrics_origin.duration_min.method,
      );
    });
  }
});
