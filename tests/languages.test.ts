import { describe, it, expect } from 'vitest';
import { LANGUAGES, LIVE_LANGUAGES, isLive, scriptFor } from '../src/config/languages';

describe('language registry', () => {
  it('Phase 1 출시 언어는 en, ko 두 개뿐이다', () => {
    expect(LIVE_LANGUAGES.map((l) => l.code)).toEqual(['en', 'ko']);
  });

  it('스펙에 정의된 8개 언어를 모두 등록한다', () => {
    expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'ko', 'mn', 'zh', 'ja', 'ms', 'si', 'ru']);
  });

  it('몽골어는 키릴 스크립트를 사용한다', () => {
    expect(scriptFor('mn')).toBe('cyrillic');
  });

  it('아직 출시하지 않은 언어는 live가 아니다', () => {
    expect(isLive('mn')).toBe(false);
  });

  it('영어는 폴백 언어이므로 항상 live여야 한다', () => {
    expect(isLive('en')).toBe(true);
  });

  it('등록되지 않은 코드는 조용히 넘기지 않고 실패시킨다', () => {
    expect(() => scriptFor('xx')).toThrow(/unknown language/i);
  });
});
