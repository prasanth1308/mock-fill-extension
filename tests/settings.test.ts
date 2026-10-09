import { describe, expect, it } from 'vitest';
import { defaultSettings, importSettings, matchesUrl, profileForUrl, validateSettings } from '../src/settings';
import type { Profile, Rule } from '../src/types';

const rule: Rule = { id: 'one', matchType: 'name', match: 'employeeId', generator: 'pattern', value: 'EMP-####' };
describe('settings and site matching', () => {
  it('round-trips a portable profile without prototype pollution', () => {
    const settings = importSettings(JSON.stringify({ ...defaultSettings, rules: [rule], __proto__: { polluted: true } }));
    expect(settings.rules[0]).toEqual({ ...rule, min: undefined, max: undefined });
    expect(Object.getPrototypeOf(settings)).toBe(Object.prototype);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('rejects malformed, unsupported, and oversized imports', () => {
    expect(() => importSettings('{broken')).toThrow('JSON');
    expect(() => validateSettings({ ...defaultSettings, version: 2 })).toThrow('version');
    expect(() => importSettings('x'.repeat(1_000_001))).toThrow('1 MB');
    expect(() => validateSettings({ ...defaultSettings, rules: [{ ...rule, generator: 'eval' }] })).toThrow('generator');
    expect(() => validateSettings({ ...defaultSettings, rules: [{ ...rule, matchType: 'selector', match: '[' }] })).toThrow('selector');
  });
  it('bounds generation rather than accepting expensive or impossible requests', () => {
    expect(() => validateSettings({ ...defaultSettings, rules: [{ ...rule, min: 10, max: 1 }] })).toThrow('Minimum');
    expect(() => validateSettings({ ...defaultSettings, rules: [{ ...rule, generator: 'digits', min: 100000 }] })).toThrow('256');
  });
  it('escapes glob metacharacters and prevents accidental domain matches', () => {
    expect(matchesUrl('https://example.com/*', 'https://exampleXcom/signup')).toBe(false);
    expect(matchesUrl('https://example.com/*', 'https://example.com/signup?next=(home)')).toBe(true);
    expect(matchesUrl('https://example.com/*', 'https://example.com.evil/signup')).toBe(false);
  });
  it('uses the most specific profile, including disabled profiles', () => {
    const profiles: Profile[] = [{ id: 'all', name: 'all', urlPattern: '*', enabled: true, rules: [] }, { id: 'site', name: 'site', urlPattern: 'https://example.com/private/*', enabled: false, rules: [] }];
    expect(profileForUrl({ ...defaultSettings, profiles }, 'https://example.com/private/edit')?.id).toBe('site');
  });
});
