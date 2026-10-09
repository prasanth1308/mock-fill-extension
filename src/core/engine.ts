import { FIELD_SELECTOR, detect, isField, metadata, ruleFor, type Field } from './detection';
import { Generator } from './generation';
import { profileForUrl } from '../settings';
import type { Action, FillResult, Settings } from '../types';

type State = { value: string; checked?: boolean; selected?: boolean[] };
type Snapshot = { field: Field; before: State; after: State };
const ignoredTypes = new Set(['hidden', 'file', 'submit', 'button', 'reset', 'image']);

export function discover(root: Document | ShadowRoot | Element): Field[] {
  const result: Field[] = [];
  if (isField(root)) result.push(root);
  result.push(...Array.from(root.querySelectorAll<Field>(FIELD_SELECTOR)));
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) result.push(...discover(el.shadowRoot));
    if (el.tagName === 'IFRAME') {
      try { const doc = (el as HTMLIFrameElement).contentDocument; if (doc) result.push(...discover(doc)); } catch { /* Cross-origin frames are outside activeTab's scope. */ }
    }
  }
  return [...new Set(result)];
}
export function eligible(field: Field): boolean {
  const input = field as HTMLInputElement;
  if (field.disabled || field.matches(':disabled') || input.readOnly || ignoredTypes.has(input.type)) return false;
  if (/\b(captcha|recaptcha|honeypot|honey pot|turnstile)\b/.test(metadata(field))) return false;
  let element: Element | null = field;
  while (element) {
    const style = element.ownerDocument.defaultView?.getComputedStyle(element);
    if (element.hasAttribute('hidden') || element.hasAttribute('inert') || element.getAttribute('aria-hidden') === 'true' || style?.display === 'none' || ['hidden', 'collapse'].includes(style?.visibility ?? '') || style?.opacity === '0') return false;
    element = element.parentElement ?? (element.getRootNode() as ShadowRoot).host ?? element.ownerDocument.defaultView?.frameElement ?? null;
  }
  return true;
}
function read(field: Field): State {
  if (field.tagName === 'SELECT') return { value: field.value, selected: Array.from((field as HTMLSelectElement).options).map(o => o.selected) };
  if (field.tagName === 'INPUT' && ['checkbox', 'radio'].includes((field as HTMLInputElement).type)) return { value: field.value, checked: (field as HTMLInputElement).checked };
  return { value: field.value };
}
function write(field: Field, state: State): void {
  if (state.selected) {
    Array.from((field as HTMLSelectElement).options).forEach((option, i) => { option.selected = state.selected?.[i] ?? false; });
  } else {
    const win = field.ownerDocument.defaultView!;
    const constructor = field.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement : field.tagName === 'SELECT' ? win.HTMLSelectElement : win.HTMLInputElement;
    const key = state.checked === undefined ? 'value' : 'checked';
    Object.getOwnPropertyDescriptor(constructor.prototype, key)?.set?.call(field, state.checked === undefined ? state.value : state.checked);
  }
}
function emit(field: Field): void {
  const EventClass = field.ownerDocument.defaultView!.Event;
  field.dispatchEvent(new EventClass('input', { bubbles: true, composed: true }));
  field.dispatchEvent(new EventClass('change', { bubbles: true, composed: true }));
}
function same(a: State, b: State): boolean { return JSON.stringify(a) === JSON.stringify(b); }
function nonempty(field: Field): boolean {
  const input = field as HTMLInputElement;
  if (input.type === 'checkbox' || input.type === 'radio') return input.checked;
  return field.value.trim() !== '';
}
function validityIssue(field: Field): string | undefined {
  if (!field.validity.valid) return 'Generated value does not satisfy this field’s constraints. Add a custom rule.';
  if ('minLength' in field && field.minLength > field.value.length && field.value.length > 0) return 'Generated value is too short.';
  if ('maxLength' in field && field.maxLength >= 0 && field.value.length > field.maxLength) return 'Generated value is too long.';
  return undefined;
}
export class FillEngine {
  private snapshots: Snapshot[] = [];
  private location = '';
  private busy = false;
  lastContextField?: Field;
  constructor(private document: Document) {}

  async run(action: Action, settings: Settings, target?: Field): Promise<FillResult> {
    if (this.busy) return { filled: 0, skipped: 0, issues: [], message: 'A fill is already running.' };
    const url = this.document.location.href;
    if (url !== this.location) { this.snapshots = []; this.location = url; }
    if (action === 'undo') return this.undo();
    const profile = profileForUrl(settings, url);
    if ((profile && !profile.enabled) || settings.pausedOrigins.includes(this.document.location.origin)) return { filled: 0, skipped: 0, issues: [], message: 'FormSeed is paused for this site. Enable it in settings.' };
    if ((action === 'field' || action === 'form') && !target) return { filled: 0, skipped: 0, issues: [], message: 'Focus a field first, or use “Choose a field”.' };
    if (action === 'form' && !target?.form) return { filled: 0, skipped: 0, issues: [], message: 'The chosen field is not inside a form.' };
    this.busy = true;
    try {
      const root = action === 'form' ? target!.form! : this.document;
      const fields = action === 'field' ? [target!] : discover(root);
      const generator = new Generator(settings.locale, settings.seed);
      const rules = [...(profile?.rules ?? []), ...settings.rules];
      const result: FillResult = { filled: 0, skipped: 0, issues: [] };
      const snapshots: Snapshot[] = [];
      const processedRadios = new Set<Field>();
      for (const field of fields) {
        if (!field.isConnected || !eligible(field)) { result.skipped++; continue; }
        const input = field as HTMLInputElement;
        if (field.matches('[role="combobox"]')) continue;
        if (input.type === 'radio') {
          if (processedRadios.has(field)) continue;
          const group = fields.filter(f => (f as HTMLInputElement).type === 'radio' && (input.name ? f.name === input.name && f.form === input.form && f.getRootNode() === input.getRootNode() : f === field));
          group.forEach(f => processedRadios.add(f));
          // Selecting a radio must not overwrite a checked peer outside a single-field scope.
          const peers = discover(field.getRootNode() as Document | ShadowRoot).filter(f => (f as HTMLInputElement).type === 'radio' && input.name && f.name === input.name && f.form === input.form);
          if ((!settings.overwrite && [...group, ...peers].some(nonempty)) || peers.some(f => nonempty(f) && !eligible(f))) { result.skipped++; continue; }
          const options = group.filter(eligible);
          const rule = ruleFor(field, rules);
          const chosen = rule?.generator === 'fixed' ? options.find(f => f.value === rule.value) : options[generator.integer(0, options.length - 1)];
          if (!chosen) { result.skipped++; result.issues.push('No radio option matches the fixed rule.'); continue; }
          const states = [...new Set([...group, ...peers])].map(f => ({ field: f, before: read(f) }));
          write(chosen, { value: chosen.value, checked: true });
          for (const state of states) if (!same(state.before, read(state.field))) snapshots.push({ ...state, after: read(state.field) });
          emit(chosen); result.filled++; continue;
        }
        if (!settings.overwrite && nonempty(field)) { result.skipped++; continue; }
        const before = read(field), rule = ruleFor(field, rules);
        try {
          if (field.tagName === 'SELECT') {
            const select = field as HTMLSelectElement;
            const options = Array.from(select.options).filter(o => o.value !== '' && !o.disabled && !o.parentElement?.matches('optgroup:disabled'));
            if (!options.length) throw new Error('Dropdown has no enabled, non-placeholder options.');
            const desired = rule && rule.generator !== 'auto' ? generator.value(rule.generator, field, rule) : undefined;
            const chosen = desired !== undefined ? options.find(o => o.value === desired || o.textContent?.trim() === desired) : options[generator.integer(0, options.length - 1)];
            if (!chosen) throw new Error('No dropdown option matches the rule.');
            for (const option of select.options) option.selected = option === chosen;
          } else if (input.type === 'checkbox') {
            write(field, { value: field.value, checked: rule?.generator === 'fixed' ? ['true', '1', 'yes', 'on'].includes(rule.value.toLowerCase()) : true });
          } else if (input.type === 'color') {
            write(field, { value: `#${generator.faker.string.hexadecimal({ length: 6, prefix: '', casing: 'lower' })}` });
          } else {
            const type = rule && rule.generator !== 'auto' ? rule.generator : detect(field);
            const value = generator.value(type, field, rule);
            write(field, { value });
            if (field.value !== value) throw new Error('The browser rejected this value. Add a matching custom rule.');
            const issue = validityIssue(field);
            if (issue) throw new Error(issue);
          }
          const after = read(field);
          if (same(before, after)) { result.skipped++; continue; }
          snapshots.push({ field, before, after });
          emit(field); result.filled++;
        } catch (error) {
          write(field, before); result.skipped++;
          result.issues.push(`${field.name || field.id || 'Field'}: ${error instanceof Error ? error.message : 'Unable to fill.'}`);
        }
      }
      // React Select and similar ARIA listboxes use their own state; never assign a fake text value.
      if (action !== 'field') await this.fillComboboxes(root, settings, generator, result);
      if (snapshots.length) this.snapshots = snapshots.slice(-1000);
      result.issues = [...new Set(result.issues)].slice(0, 10);
      return result;
    } finally { this.busy = false; }
  }
  private async fillComboboxes(root: Document | Element, settings: Settings, generator: Generator, result: FillResult): Promise<void> {
    for (const combo of root.querySelectorAll<HTMLInputElement>('input[role="combobox"][aria-haspopup="listbox"], input[role="combobox"][aria-haspopup="true"]')) {
      if (!eligible(combo) || (!settings.overwrite && combo.closest('[class*="container"]')?.querySelector('[class*="singleValue"], [class*="multiValue"]'))) continue;
      const win = combo.ownerDocument.defaultView!;
      combo.focus();
      combo.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 60));
      const rootNode = combo.getRootNode() as Document | ShadowRoot;
      const listId = combo.getAttribute('aria-controls') || combo.getAttribute('aria-owns');
      const list = listId ? rootNode.getElementById(listId) : null;
      const choices = Array.from(list?.querySelectorAll<HTMLElement>('[role="option"]:not([aria-disabled="true"])') ?? []);
      if (!choices.length) {
        combo.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        result.issues.push('Custom dropdown could not be opened. Choose its option manually.');
        continue;
      }
      const rule = ruleFor(combo, [...(profileForUrl(settings, this.document.location.href)?.rules ?? []), ...settings.rules]);
      const chosen = rule?.generator === 'fixed' ? choices.find(o => o.textContent?.trim() === rule.value) : choices[generator.integer(0, choices.length - 1)];
      if (!chosen) { result.issues.push('No custom dropdown option matches the fixed rule.'); continue; }
      if ((chosen.tagName === 'BUTTON' && (chosen as HTMLButtonElement).type === 'submit') || chosen.matches('a[href], input[type="submit"]')) {
        combo.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        result.issues.push('Custom dropdown option uses a submit or navigation control. Choose it manually.');
        continue;
      }
      chosen.dispatchEvent(new win.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      chosen.click();
      combo.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      result.filled++;
      result.issues.push('Undo does not restore custom dropdown component state.');
    }
  }
  undo(): FillResult {
    const result: FillResult = { filled: 0, skipped: 0, issues: [] };
    const changed = this.snapshots.filter(snapshot => !snapshot.field.isConnected || !same(read(snapshot.field), snapshot.after));
    const blockedRadioGroups = changed.filter(snapshot => (snapshot.field as HTMLInputElement).type === 'radio');
    const allowed = this.snapshots.filter(snapshot => !changed.includes(snapshot) && !blockedRadioGroups.some(blocked => blocked.field.name && blocked.field.name === snapshot.field.name && blocked.field.form === snapshot.field.form && blocked.field.getRootNode() === snapshot.field.getRootNode()));
    result.skipped = this.snapshots.length - allowed.length;
    for (const snapshot of allowed) {
      write(snapshot.field, snapshot.before); emit(snapshot.field); result.filled++;
    }
    this.snapshots = [];
    if (result.skipped) result.issues.push('Some fields changed after filling and were left as you edited them.');
    if (!result.filled && !result.skipped) result.message = 'There is no fill to undo on this page.';
    return result;
  }
}
