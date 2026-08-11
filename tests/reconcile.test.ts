import { describe, it, expect } from 'vitest';
import { reconcile, TOLERANCE } from '../src/lib/reconcile';

describe('reconcile', () => {
  it('출처가 하나면 single_source로 판정하고 그 값을 쓴다', () => {
    const r = reconcile([{ org: 'knps', value: 3.2 }]);
    expect(r.value).toBe(3.2);
    expect(r.verification.status).toBe('single_source');
  });

  it('두 출처가 허용 오차 안이면 verified로 판정한다', () => {
    const r = reconcile([
      { org: 'knps', value: 3.2 },
      { org: 'forest_service', value: 3.4 },
    ]);
    expect(r.verification.status).toBe('verified');
  });

  it('허용 오차를 넘으면 conflict로 판정한다', () => {
    const r = reconcile([
      { org: 'knps', value: 3.2 },
      { org: 'forest_service', value: 5.0 },
    ]);
    expect(r.verification.status).toBe('conflict');
  });

  it('conflict일 때도 값을 버리지 않고 중앙값을 쓴다', () => {
    const r = reconcile([
      { org: 'a', value: 2.0 },
      { org: 'b', value: 3.0 },
      { org: 'c', value: 10.0 },
    ]);
    expect(r.value).toBe(3.0);
    expect(r.verification.status).toBe('conflict');
  });

  it('중앙값은 이상치 하나에 끌려가지 않는다', () => {
    const r = reconcile([
      { org: 'a', value: 3.0 },
      { org: 'b', value: 3.1 },
      { org: 'c', value: 90.0 },
    ]);
    expect(r.value).toBe(3.1);
  });

  it('짝수 개일 때 중앙값은 가운데 두 값의 평균이다', () => {
    const r = reconcile([
      { org: 'a', value: 2.0 },
      { org: 'b', value: 4.0 },
    ]);
    expect(r.value).toBe(3.0);
  });

  it('편차 비율을 기록해 화면에서 설명할 수 있게 한다', () => {
    const r = reconcile([
      { org: 'a', value: 2.0 },
      { org: 'b', value: 3.0 },
    ]);
    expect(r.verification.spread).toBeCloseTo(0.5, 5);
  });

  it('빈 입력은 조용히 넘기지 않고 실패시킨다', () => {
    expect(() => reconcile([])).toThrow(/at least one/i);
  });

  it('0 이하 값은 측정 오류이므로 거부한다', () => {
    expect(() => reconcile([{ org: 'a', value: 0 }])).toThrow(/positive/i);
  });

  it('허용 오차는 10%이다', () => {
    expect(TOLERANCE).toBe(0.1);
  });
});
