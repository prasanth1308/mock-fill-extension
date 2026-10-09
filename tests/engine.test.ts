import { beforeEach, describe, expect, it } from 'vitest';
import { detect, labelFor } from '../src/core/detection';
import { discover, eligible, FillEngine } from '../src/core/engine';
import { defaultSettings } from '../src/settings';
import type { Settings } from '../src/types';

const settings = (): Settings => ({ ...structuredClone(defaultSettings), seed: 'regression' });
const input = (name: string) => document.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
beforeEach(() => { document.body.innerHTML = ''; });
describe('form filling behavior', () => {
  it('uses labels, autocomplete, and explicit input types', () => {
    document.body.innerHTML = '<label for="x">Given name</label><input id="x"><input name="misc" autocomplete="family-name"><input name="amount" type="email"><span id="city-label">City</span><input aria-labelledby="city-label">';
    const fields = discover(document);
    expect(fields.map(detect)).toEqual(['firstName', 'lastName', 'email', 'city']);
    expect(labelFor(fields[0]!)).toContain('Given name');
  });
  it('leaves protected fields and existing values untouched and does not submit', async () => {
    document.body.innerHTML = '<form><input name="firstName"><input name="email" type="email"><input name="existing" value="mine"><input type="hidden" name="secret" value="token"><input name="readonly" readonly><fieldset disabled><input name="disabled"></fieldset><div style="display:none"><input name="offscreen"></div><input name="captcha"><button>Submit</button></form>';
    let submissions = 0, events = 0;
    document.querySelector('form')!.addEventListener('submit', () => submissions++);
    input('firstName').addEventListener('input', () => events++);
    const result = await new FillEngine(document).run('page', settings());
    expect(result.filled).toBe(2); expect(events).toBe(1); expect(submissions).toBe(0);
    expect(input('existing').value).toBe('mine'); expect(input('secret').value).toBe('token');
    for (const name of ['readonly', 'disabled', 'offscreen', 'captcha']) expect(input(name).value).toBe('');
  });
  it('satisfies supported numeric, pattern, text, and select constraints', async () => {
    document.body.innerHTML = '<input name="amount" type="number" min="2.5" max="4" step="0.5"><input name="code" pattern="EMP-[0-9]{4}"><textarea name="notes" minlength="80" maxlength="90"></textarea><select name="plan"><option value="">Select</option><optgroup disabled><option value="bad">Bad</option></optgroup><option value="good">Good</option></select>';
    const result = await new FillEngine(document).run('page', settings());
    expect(result.issues).toEqual([]);
    expect(input('amount').validity.valid).toBe(true); expect(input('code').value).toMatch(/^EMP-\d{4}$/);
    expect(document.querySelector('textarea')!.value.length).toBeGreaterThanOrEqual(80);
    expect(document.querySelector('select')!.value).toBe('good');
  });
  it('handles one-sided dates outside the default range and sub-unit numeric maxima', async () => {
    document.body.innerHTML = '<input name="future" type="date" min="2030-01-01"><input name="historic" type="date" max="1990-12-31"><input name="fraction" type="number" max="0.5" step="0.1"><input name="meeting" type="datetime-local" min="2030-01-01T09:00" max="2030-02-01T17:00">';
    const result = await new FillEngine(document).run('page', settings());
    expect(result.issues).toEqual([]); expect(result.filled).toBe(4);
    for (const name of ['future', 'historic', 'fraction', 'meeting']) expect(input(name).validity.valid).toBe(true);
  });
  it('does not activate custom dropdown options implemented as submit controls', async () => {
    document.body.innerHTML = '<form><input name="department" role="combobox" aria-haspopup="listbox" aria-controls="choices"><div id="choices"><button role="option">Engineering</button></div></form>';
    let clicks = 0;
    document.querySelector('button')!.addEventListener('click', () => clicks++);
    const result = await new FillEngine(document).run('page', settings());
    expect(clicks).toBe(0); expect(result.filled).toBe(0);
    expect(result.issues.join(' ')).toContain('submit or navigation');
  });
  it('reports unsupported constraints and restores the original field value', async () => {
    document.body.innerHTML = '<input name="custom" pattern="foo|bar"><input name="short" type="email" maxlength="3">';
    const result = await new FillEngine(document).run('page', settings());
    expect(result.filled).toBe(0); expect(result.issues).toHaveLength(2); expect(input('custom').value).toBe('');
  });
  it('keeps related fields coherent and generation repeatable', async () => {
    document.body.innerHTML = '<input name="firstName"><input name="lastName"><input name="fullName"><input type="password" name="password"><input type="password" name="confirmPassword">';
    const engine = new FillEngine(document); await engine.run('page', settings());
    const first = discover(document).map(f => f.value);
    expect(input('fullName').value).toBe(`${input('firstName').value} ${input('lastName').value}`);
    expect(input('password').value).toBe(input('confirmPassword').value);
    engine.undo(); await engine.run('page', settings());
    expect(discover(document).map(f => f.value)).toEqual(first);
  });
  it('undo preserves manual edits and works across overwrite operations', async () => {
    document.body.innerHTML = '<input name="firstName" value="original"><input name="city">';
    const engine = new FillEngine(document); await engine.run('page', { ...settings(), overwrite: true });
    input('city').value = 'My edit';
    const result = engine.undo();
    expect(input('firstName').value).toBe('original'); expect(input('city').value).toBe('My edit'); expect(result.skipped).toBe(1);
  });
  it('preserves checked radio peers during single-field filling and restores groups on undo', async () => {
    document.body.innerHTML = '<form><input type="radio" name="plan" value="a" checked><input type="radio" name="plan" value="b"></form>';
    const engine = new FillEngine(document), second = document.querySelectorAll<HTMLInputElement>('input')[1]!;
    expect((await engine.run('field', settings(), second)).filled).toBe(0);
    await engine.run('field', { ...settings(), overwrite: true }, second);
    expect(second.checked).toBe(true); engine.undo();
    expect(document.querySelector<HTMLInputElement>('input')!.checked).toBe(true); expect(second.checked).toBe(false);
  });
  it('fills the containing form without touching unrelated forms', async () => {
    document.body.innerHTML = '<form><input name="firstName"></form><form><input name="city"></form>';
    await new FillEngine(document).run('form', settings(), input('firstName'));
    expect(input('firstName').value).not.toBe(''); expect(input('city').value).toBe('');
  });
  it('applies site rules before global rules and respects paused sites', async () => {
    document.body.innerHTML = '<input name="employeeId">';
    const config = settings();
    config.rules = [{ id: 'global', matchType: 'name', match: 'employeeId', generator: 'fixed', value: 'global' }];
    config.profiles = [{ id: 'site', name: 'site', urlPattern: '*', enabled: true, rules: [{ ...config.rules[0]!, id: 'local', value: 'local' }] }];
    const engine = new FillEngine(document); await engine.run('page', config); expect(input('employeeId').value).toBe('local');
    engine.undo(); config.profiles[0]!.enabled = false;
    expect((await engine.run('page', config)).message).toContain('paused'); expect(input('employeeId').value).toBe('');
  });
  it('discovers open shadow roots and excludes hidden shadow hosts', async () => {
    const host = document.createElement('div'); document.body.append(host); const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<input name="firstName">';
    expect(discover(document)).toHaveLength(1); await new FillEngine(document).run('page', settings());
    expect(shadow.querySelector('input')!.value).not.toBe(''); host.hidden = true; expect(eligible(shadow.querySelector('input')!)).toBe(false);
  });
  it('pauses an entire origin even when a more specific enabled profile matches', async () => {
    document.body.innerHTML = '<input name="firstName">';
    const config = settings(); config.pausedOrigins = [document.location.origin];
    config.profiles = [{ id: 'specific', name: 'specific', urlPattern: document.location.href, enabled: true, rules: [] }];
    expect((await new FillEngine(document).run('page', config)).message).toContain('paused');
    expect(input('firstName').value).toBe('');
  });
});
