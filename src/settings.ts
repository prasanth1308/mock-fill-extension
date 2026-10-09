import { generatorTypes, type Settings, type Rule, type Profile } from './types';

export const defaultSettings: Settings = { version: 1, locale: 'en', overwrite: false, seed: '', rules: [], profiles: [], pausedOrigins: [] };
export const STORAGE_KEY = 'formseed.settings.v1';
const MAX_RULES = 200;

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a settings object.');
  return value as Record<string, unknown>;
}
function string(value: unknown, name: string, limit = 512): string {
  if (typeof value !== 'string' || value.length > limit) throw new Error(`${name} must be text with at most ${limit} characters.`);
  return value;
}
function bound(value: unknown): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || Math.abs(value) > 1e12) throw new Error('Rule bounds must be finite numbers.');
  return value;
}
function parseRule(value: unknown): Rule {
  const r = record(value);
  if (!['selector', 'name', 'label'].includes(String(r.matchType))) throw new Error('Unknown rule matcher.');
  if (!generatorTypes.includes(r.generator as Rule['generator'])) throw new Error('Unknown generator.');
  const match = string(r.match, 'Rule match').trim();
  if (!match) throw new Error('A rule needs a field selector, name, or label.');
  if (r.matchType !== 'selector' && !/[a-zA-Z0-9]/.test(match)) throw new Error('Name and label matches must contain letters or digits.');
  if (r.matchType === 'selector' && typeof document !== 'undefined') {
    try { document.createDocumentFragment().querySelector(match); } catch { throw new Error(`Invalid selector: ${match}`); }
  }
  const min = bound(r.min), max = bound(r.max);
  if (min !== undefined && max !== undefined && min > max) throw new Error('Minimum cannot exceed maximum.');
  if (r.generator === 'digits' && [min, max].some(v => v !== undefined && (!Number.isInteger(v) || v < 1 || v > 256))) throw new Error('Digit lengths must be integers from 1 to 256.');
  return { id: string(r.id, 'Rule ID', 100), matchType: r.matchType as Rule['matchType'], match, generator: r.generator as Rule['generator'], value: string(r.value, 'Rule value', 2000), min, max };
}
function rules(value: unknown): Rule[] {
  if (!Array.isArray(value) || value.length > MAX_RULES) throw new Error(`Use at most ${MAX_RULES} rules per profile.`);
  return value.map(parseRule);
}
export function validateSettings(value: unknown): Settings {
  const s = record(value);
  if (s.version !== 1) throw new Error('Unsupported settings version.');
  if (s.locale !== 'en' && s.locale !== 'en_IN') throw new Error('Choose English (US) or English (India).');
  if (typeof s.overwrite !== 'boolean') throw new Error('Overwrite must be true or false.');
  if (!Array.isArray(s.profiles) || s.profiles.length > 100) throw new Error('Use at most 100 site profiles.');
  const profiles = s.profiles.map(value => {
    const p = record(value);
    if (typeof p.enabled !== 'boolean') throw new Error('Profile enabled must be true or false.');
    const urlPattern = string(p.urlPattern, 'Site URL pattern').trim();
    if (!urlPattern || (!/^https?:\/\//.test(urlPattern) && urlPattern !== '*')) throw new Error('Site patterns must start with http:// or https:// (or use * for all sites).');
    return { id: string(p.id, 'Profile ID', 100), name: string(p.name, 'Profile name', 100), urlPattern, enabled: p.enabled, rules: rules(p.rules) };
  });
  const origins = s.pausedOrigins ?? [];
  if (!Array.isArray(origins) || origins.length > 100) throw new Error('Use at most 100 paused sites.');
  const pausedOrigins = origins.map(value => {
    const origin = string(value, 'Paused site');
    const url = new URL(origin);
    if (!/^https?:$/.test(url.protocol) || url.origin !== origin) throw new Error('Paused sites must be http/https origins.');
    return origin;
  });
  return { version: 1, locale: s.locale, overwrite: s.overwrite, seed: string(s.seed, 'Seed', 100), rules: rules(s.rules), profiles, pausedOrigins: [...new Set(pausedOrigins)] };
}
export function importSettings(text: string): Settings {
  if (text.length > 1_000_000) throw new Error('The settings file must be smaller than 1 MB.');
  try { return validateSettings(JSON.parse(text)); } catch (error) {
    if (error instanceof SyntaxError) throw new Error('The file is not valid JSON.');
    throw error;
  }
}
export function matchesUrl(pattern: string, url: string): boolean {
  // A glob is data, never executable code. Escape every regular-expression operator.
  const escaped = pattern.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp(`^${escaped}$`, 'i').test(url);
}
export function profileForUrl(settings: Settings, url: string): Profile | undefined {
  return settings.profiles.filter(p => matchesUrl(p.urlPattern, url)).sort((a, b) => b.urlPattern.replaceAll('*', '').length - a.urlPattern.replaceAll('*', '').length)[0];
}
