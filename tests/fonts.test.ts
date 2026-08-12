import { describe, it, expect } from 'vitest';
import { fontHrefFor, BASE_FAMILIES } from '../src/lib/fonts';

describe('fontHrefFor', () => {
  it('모든 언어에 공통 서체(디스플레이·본문·모노)를 싣는다', () => {
    const href = fontHrefFor('en');
    for (const family of BASE_FAMILIES) {
      expect(href).toContain(family.split(':')[0].replace(/ /g, '+'));
    }
  });

  it('한국어 페이지에만 한글 서체를 싣는다', () => {
    expect(fontHrefFor('ko')).toContain('Noto+Sans+KR');
    expect(fontHrefFor('en')).not.toContain('Noto+Sans+KR');
  });

  it('키릴 언어는 추가 서체 없이 공통 서체로 처리한다', () => {
    const href = fontHrefFor('mn');
    expect(href).not.toContain('Noto+Sans+Mongolian');
    expect(href).toContain('Inter');
  });

  it('싱할라는 전용 서체가 필요하다', () => {
    expect(fontHrefFor('si')).toContain('Noto+Sans+Sinhala');
  });

  it('FOIT를 피하려면 display=swap이어야 한다', () => {
    expect(fontHrefFor('en')).toContain('display=swap');
  });

  it('등록되지 않은 언어 코드는 throw한다', () => {
    expect(() => fontHrefFor('xx')).toThrow(/unknown language/i);
  });
});
