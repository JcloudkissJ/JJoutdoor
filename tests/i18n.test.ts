import { describe, it, expect } from 'vitest';
import { resolveText, makeTranslator } from '../src/lib/i18n';

const text = {
  en: { summary: 'A short city ridge walk.', caution1: 'Stairs near the top.', caution2: 'No water on route.' },
  ko: { summary: '도심 성곽 능선길.', caution1: '정상부 계단 구간.', caution2: '식수 없음.' },
};

describe('resolveText', () => {
  it('요청한 언어가 있으면 그대로 쓴다', () => {
    const r = resolveText(text, 'ko');
    expect(r.value.summary).toBe('도심 성곽 능선길.');
    expect(r.isFallback).toBe(false);
  });

  it('요청한 언어가 없으면 영어로 폴백한다', () => {
    const r = resolveText(text, 'mn');
    expect(r.value.summary).toBe('A short city ridge walk.');
    expect(r.isFallback).toBe(true);
  });

  it('요청한 언어가 영어면 isFallback은 false다', () => {
    const r = resolveText(text, 'en');
    expect(r.value.summary).toBe('A short city ridge walk.');
    expect(r.isFallback).toBe(false);
  });

  it('영어조차 없으면 실패시킨다 — 조용히 빈 화면을 내지 않는다', () => {
    expect(() => resolveText({ ko: text.ko }, 'ja')).toThrow(/fallback/i);
  });
});

describe('makeTranslator', () => {
  const en = { 'filter.difficulty': 'Difficulty', 'filter.region': 'Region' };
  const t = makeTranslator(en, { 'filter.difficulty': '난이도' });

  it('사전에서 라벨을 찾는다', () => {
    expect(t('filter.difficulty')).toBe('난이도');
  });

  it('해당 언어에 없으면 영어로 폴백한다', () => {
    expect(t('filter.region')).toBe('Region');
  });

  it('어디에도 없으면 키 자체를 돌려줘 누락이 화면에서 드러나게 한다', () => {
    expect(t('filter.missing')).toBe('filter.missing');
  });
});
