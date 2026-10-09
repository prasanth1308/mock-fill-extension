import type { GeneratorType, Rule } from '../types';

export type Field = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export const FIELD_SELECTOR = 'input, textarea, select';
export function words(value: string): string { return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[^a-zA-Z0-9]+/g, ' ').toLowerCase().trim(); }
export function labelFor(field: Field): string {
  const ids = (field.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  const root = field.getRootNode() as Document | ShadowRoot;
  return [...Array.from(field.labels ?? []).map(l => l.textContent ?? ''), field.getAttribute('aria-label') ?? '', ...ids.map(id => root.getElementById(id)?.textContent ?? '')].join(' ').trim();
}
export function metadata(field: Field): string {
  return words([labelFor(field), field.name, field.id, field.getAttribute('placeholder') ?? '', field.getAttribute('autocomplete') ?? ''].join(' '));
}
export function ruleFor(field: Field, rules: Rule[]): Rule | undefined {
  return rules.find(rule => {
    if (rule.matchType === 'selector') { try { return field.matches(rule.match); } catch { return false; } }
    const value = rule.matchType === 'name' ? `${field.name} ${field.id}` : labelFor(field);
    return words(value).includes(words(rule.match));
  });
}
export function detect(field: Field): GeneratorType {
  const autocomplete = field.autocomplete?.split(/\s+/).at(-1) ?? '';
  const tokens: Record<string, GeneratorType> = { 'given-name': 'firstName', 'family-name': 'lastName', name: 'fullName', email: 'email', username: 'username', 'new-password': 'password', 'current-password': 'password', tel: 'phone', organization: 'company', 'street-address': 'street', 'address-line1': 'street', 'address-level2': 'city', 'address-level1': 'state', 'country-name': 'country', country: 'country', 'postal-code': 'postalCode', url: 'url', bday: 'date' };
  const type = field.tagName === 'INPUT' ? (field as HTMLInputElement).type : '';
  if (['email', 'password', 'url'].includes(type)) return type as GeneratorType;
  if (type === 'tel') return 'phone';
  if (['number', 'range'].includes(type)) return 'number';
  if (['date', 'datetime-local', 'month', 'week', 'time'].includes(type)) return 'date';
  if (tokens[autocomplete]) return tokens[autocomplete];
  const info = metadata(field);
  const patterns: [RegExp, GeneratorType][] = [
    [/\b(first|given|forename)\s*(name)?\b/, 'firstName'], [/\b(last|family|sur)\s*name\b/, 'lastName'],
    [/\b(email|e mail)\b/, 'email'], [/\b(password|passwd|pwd|confirm password)\b/, 'password'],
    [/\b(user\s*name|login|handle)\b/, 'username'], [/\b(phone|mobile|telephone|tel)\b/, 'phone'],
    [/\b(zip|postal|pin code|pincode)\b/, 'postalCode'], [/\b(country)\b/, 'country'],
    [/\b(city|town)\b/, 'city'], [/\b(state|province|region)\b/, 'state'],
    [/\b(company|organization|organisation|business)\b/, 'company'], [/\b(address|street)\b/, 'street'],
    [/\b(website|url|homepage|link)\b/, 'url'], [/\b(name)\b/, 'fullName'],
    [/\b(age|quantity|amount|price|count|total|salary)\b/, 'number'],
  ];
  return patterns.find(([pattern]) => pattern.test(info))?.[1] ?? 'text';
}
export function isField(value: unknown): value is Field {
  return !!value && typeof value === 'object' && 'tagName' in value && ['INPUT', 'TEXTAREA', 'SELECT'].includes(String(value.tagName));
}
