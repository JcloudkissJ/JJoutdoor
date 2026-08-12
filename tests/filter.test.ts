import { describe, it, expect } from 'vitest';
import { matches, type CardData, type FilterState } from '../src/lib/filter';

const card: CardData = {
  region: '11',
  difficulty: 1,
  durationMin: 90,
  signageEn: true,
  restroom: true,
};
const none: FilterState = {
  region: 'all',
  difficulty: 'all',
  duration: 'all',
  signageEn: false,
  restroom: false,
};

// Helper: simulate the DOM encode/decode round-trip for duration
// PlaceCard writes data-duration={durationMin} (the raw number)
// Browser script parses: const durationNum = parseInt(durationStr, 10)
function encodeDecodeDuration(durationMin: number): number {
  const encoded = String(durationMin); // PlaceCard: data-duration={durationMin}
  const decoded = parseInt(encoded, 10); // Browser script: parseInt(durationStr, 10)
  return decoded;
}

describe('matches', () => {
  it('조건이 없으면 전부 통과시킨다', () => {
    expect(matches(card, none)).toBe(true);
  });

  it('지역이 다르면 제외한다', () => {
    expect(matches(card, { ...none, region: '41' })).toBe(false);
  });

  it('2시간 이하 조건에 90분은 포함된다', () => {
    expect(matches(card, { ...none, duration: 'short' })).toBe(true);
  });

  it('2시간 이하 조건에 150분은 제외된다', () => {
    expect(matches({ ...card, durationMin: 150 }, { ...none, duration: 'short' })).toBe(false);
  });

  it('영어 표지판 필터는 미확인(null)을 통과시키지 않는다', () => {
    expect(matches({ ...card, signageEn: null }, { ...none, signageEn: true })).toBe(false);
  });

  it('조건을 끄면 미확인도 통과한다', () => {
    expect(matches({ ...card, signageEn: null }, none)).toBe(true);
  });

  it('난이도 필터가 동작한다', () => {
    expect(matches(card, { ...none, difficulty: '2' })).toBe(false);
    expect(matches(card, { ...none, difficulty: '1' })).toBe(true);
  });

  it('화장실 필터는 미확인(null)을 통과시키지 않는다', () => {
    expect(matches({ ...card, restroom: null }, { ...none, restroom: true })).toBe(false);
  });
});

describe('duration encode/decode round-trip', () => {
  it('짧은 산행(90분)은 인코드/디코드 후에도 같다', () => {
    const original = 90;
    const decoded = encodeDecodeDuration(original);
    expect(decoded).toBe(original);

    // Verify filter works the same before and after round-trip
    const cardBefore = { ...card, durationMin: original };
    const cardAfter = { ...card, durationMin: decoded };
    expect(matches(cardBefore, { ...none, duration: 'short' })).toBe(matches(cardAfter, { ...none, duration: 'short' }));
  });

  it('중간 산행(150분)은 인코드/디코드 후에도 같다', () => {
    const original = 150;
    const decoded = encodeDecodeDuration(original);
    expect(decoded).toBe(original);

    const cardBefore = { ...card, durationMin: original };
    const cardAfter = { ...card, durationMin: decoded };
    expect(matches(cardBefore, { ...none, duration: 'mid' })).toBe(matches(cardAfter, { ...none, duration: 'mid' }));
  });

  it('긴 산행(200분)은 인코드/디코드 후에도 같다', () => {
    const original = 200;
    const decoded = encodeDecodeDuration(original);
    expect(decoded).toBe(original);

    const cardBefore = { ...card, durationMin: original };
    const cardAfter = { ...card, durationMin: decoded };
    expect(matches(cardBefore, { ...none, duration: 'long' })).toBe(matches(cardAfter, { ...none, duration: 'long' }));
  });
});
