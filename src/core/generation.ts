import { Faker, en, en_IN } from '@faker-js/faker';
import type { GeneratorType, Locale, Rule } from '../types';
import type { Field } from './detection';

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}
export class Generator {
  readonly faker: Faker;
  private identity: Record<string, string>;
  constructor(locale: Locale, seed: string) {
    this.faker = new Faker({ locale: locale === 'en_IN' ? [en_IN, en] : [en] });
    const randomSeed = new Uint32Array(1);
    globalThis.crypto.getRandomValues(randomSeed);
    this.faker.seed(seed ? hashSeed(seed) : randomSeed[0]!);
    this.faker.setDefaultRefDate('2026-01-01T00:00:00.000Z');
    const firstName = this.faker.person.firstName(), lastName = this.faker.person.lastName();
    this.identity = {
      firstName, lastName, fullName: `${firstName} ${lastName}`,
      email: this.faker.internet.email({ firstName, lastName, provider: 'example.com' }),
      username: this.faker.internet.username({ firstName, lastName }),
      password: `Fs!${this.faker.string.alphanumeric(12)}9`,
      phone: locale === 'en_IN' ? `9${this.faker.string.numeric(9)}` : `202555${this.faker.string.numeric(4)}`,
      company: this.faker.company.name(), street: this.faker.location.streetAddress(),
      city: this.faker.location.city(), state: this.faker.location.state(),
      country: locale === 'en_IN' ? 'India' : 'United States',
      postalCode: locale === 'en_IN' ? this.faker.string.numeric({ length: 6, allowLeadingZeros: false }) : this.faker.string.numeric(5),
      url: `https://example.com/${this.faker.string.alpha(8)}`,
    };
  }
  integer(min: number, max: number): number { return this.faker.number.int({ min, max }); }
  template(value: string): string {
    if (value.length > 2000) throw new Error('Pattern template is too long.');
    return value.replace(/\\(.)|[#@~]/g, (token, escaped: string | undefined) => escaped ?? (token === '#' ? this.faker.string.numeric(1) : this.faker.string.alpha({ length: 1, casing: token === '@' ? 'upper' : 'lower' })));
  }
  htmlPattern(pattern: string): string | undefined {
    const p = pattern.replace(/^\^/, '').replace(/\$$/, '');
    const match = /^(.*?)(\\d|\[0-9\]|\[A-Z\]|\[a-z\]|\[A-Za-z\])\{(\d+)(?:,(\d+))?\}(.*?)$/.exec(p);
    if (!match) return undefined;
    const [, prefix = '', token, low, high, suffix = ''] = match;
    if (/[\[\]{}()+*?|\\.^$]/.test(prefix + suffix)) return undefined;
    const min = Number(low), max = Number(high ?? low);
    if (min < 1 || max < min || max > 256) return undefined;
    const length = this.integer(min, max);
    const middle = token === '\\d' || token === '[0-9]' ? this.faker.string.numeric(length) : this.faker.string.alpha({ length, casing: token === '[A-Z]' ? 'upper' : token === '[a-z]' ? 'lower' : 'mixed' });
    return prefix + middle + suffix;
  }
  value(type: GeneratorType, field: Field, rule?: Rule): string {
    if (type === 'fixed') return rule?.value ?? '';
    if (type === 'pattern') return this.template(rule?.value ?? '####');
    if (type === 'digits') return this.faker.string.numeric(this.integer(rule?.min ?? 8, rule?.max ?? rule?.min ?? 8));
    const input = field.tagName === 'INPUT' ? field as HTMLInputElement : undefined;
    if (input?.pattern && !rule) {
      const value = this.htmlPattern(input.pattern);
      if (value !== undefined) return value;
    }
    if (type === 'number') {
      const min = rule?.min ?? (input?.min !== '' && input?.min !== undefined ? Number(input.min) : input?.max ? Math.min(0, Number(input.max)) : 1);
      const max = rule?.max ?? (input?.max !== '' && input?.max !== undefined ? Number(input.max) : Math.max(100, min + 99));
      const step = input?.step && input.step !== 'any' ? Number(input.step) : input?.step === 'any' ? 0.01 : 1;
      if (![min, max, step].every(Number.isFinite) || min > max || step <= 0) throw new Error('Unsupported numeric bounds.');
      const base = input?.min ? Number(input.min) : input?.getAttribute('value') ? Number(input.getAttribute('value')) : 0;
      const first = Math.ceil((min - base) / step - 1e-8), last = Math.floor((max - base) / step + 1e-8);
      if (first > last) throw new Error('No number satisfies this range and step.');
      return String(Number((base + this.integer(first, last) * step).toFixed(8)));
    }
    if (type === 'date') {
      const kind = input?.type ?? 'date';
      const defaults: Record<string, [string, string]> = { date: ['2000-01-01', '2025-12-31'], 'datetime-local': ['2025-01-01T09:00', '2025-12-31T17:00'], month: ['2025-01', '2025-12'], week: ['2025-W01', '2025-W52'], time: ['09:00', '17:00'] };
      const [start, end] = defaults[kind] ?? defaults.date!;
      if (kind === 'month' || kind === 'week' || kind === 'time') {
        if (input?.min && input?.max && input.min > input.max) throw new Error('Unsupported date range.');
        const candidate = input?.min || start;
        return input?.max && candidate > input.max ? input.max : candidate;
      }
      // datetime-local has no timezone: preserve its wall-clock components.
      const parse = (value: string) => new Date(kind === 'datetime-local' ? `${value}Z` : value).getTime();
      let low = parse(input?.min || start), high = parse(input?.max || end);
      if (input?.min && !input.max) high = Math.max(high, low + 365 * 86400000);
      if (input?.max && !input.min) low = Math.min(low, high - 365 * 86400000);
      if (!Number.isFinite(low) || !Number.isFinite(high) || low > high) throw new Error('Unsupported date range.');
      const value = new Date(low + this.integer(0, Math.floor((high - low) / 86400000)) * 86400000).toISOString();
      return kind === 'datetime-local' ? value.slice(0, 16) : value.slice(0, 10);
    }
    if (this.identity[type]) return this.fit(this.identity[type], field, type);
    return this.fit(this.faker.lorem.sentence(8), field, 'text');
  }
  private fit(value: string, field: Field, type: GeneratorType): string {
    const max = 'maxLength' in field && field.maxLength >= 0 ? field.maxLength : 2000;
    const min = 'minLength' in field && field.minLength >= 0 ? field.minLength : 0;
    if (min > max) throw new Error('Conflicting length constraints.');
    // Truncating a structured email/URL/password silently produces invalid test data.
    if (['email', 'url', 'password'].includes(type) && (value.length > max || value.length < min)) throw new Error('Use a custom rule for this structured field’s length constraints.');
    let result = value.slice(0, max);
    if (result.length < min) result += this.faker.string.alpha(min - result.length);
    return result;
  }
}
