import './style.css';
import { generatorTypes, type Rule, type Settings, type Profile } from '../../src/types';
import { importSettings, validateSettings } from '../../src/settings';
import { loadSettings, saveSettings } from '../../src/storage';

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let settings: Settings;
let editingRule: string | undefined;
let pendingImport: Settings | undefined;
function status(message: string, error = false) { el('status').textContent = message; el('status').classList.toggle('error', error); }
function profile(): Profile | undefined { return settings.profiles.find(p => p.id === el<HTMLSelectElement>('profile').value); }
function rules(): Rule[] { return profile()?.rules ?? settings.rules; }
async function persist(message: string) { settings = validateSettings(settings); await saveSettings(settings); status(message); render(); }
function ruleReset() { editingRule = undefined; el<HTMLFormElement>('rule-form').reset(); el('rule-heading').textContent = 'Add a rule'; el('save-rule').textContent = 'Add rule'; el('cancel-rule').hidden = true; generatorChanged(); }
function generatorChanged() {
  const value = el<HTMLSelectElement>('generator').value;
  el('value-label').hidden = !['fixed', 'pattern'].includes(value);
  el('bounds').hidden = !['digits', 'number'].includes(value);
  el('value-label').firstChild!.textContent = value === 'pattern' ? 'Pattern template' : 'Fixed value';
}
function render() {
  const pausedSites = el('paused-sites'); pausedSites.replaceChildren(); el('paused-section').hidden = settings.pausedOrigins.length === 0;
  for (const origin of settings.pausedOrigins) {
    const row = document.createElement('div'); row.className = 'row between';
    const name = document.createElement('span'); name.textContent = new URL(origin).host; name.className = 'help';
    const enable = document.createElement('button'); enable.textContent = 'Enable'; enable.className = 'quiet';
    enable.addEventListener('click', () => { settings.pausedOrigins = settings.pausedOrigins.filter(value => value !== origin); void persist('Site enabled.').catch(error => status(String(error), true)); });
    row.append(name, enable); pausedSites.append(row);
  }
  const selected = el<HTMLSelectElement>('profile').value || 'global';
  const selector = el<HTMLSelectElement>('profile'); selector.replaceChildren(new Option('All sites · global rules', 'global'));
  for (const p of settings.profiles) selector.add(new Option(`${p.enabled ? '' : 'Paused · '}${p.name}`, p.id));
  selector.value = settings.profiles.some(p => p.id === selected) ? selected : 'global';
  el<HTMLSelectElement>('locale').value = settings.locale;
  el<HTMLInputElement>('overwrite').checked = settings.overwrite;
  el<HTMLInputElement>('seed').value = settings.seed;
  const p = profile(); el('profile-form').hidden = !p;
  if (p) { el<HTMLInputElement>('profile-name').value = p.name; el<HTMLInputElement>('profile-url').value = p.urlPattern; el<HTMLInputElement>('profile-enabled').checked = p.enabled; }
  const list = el('rules'); list.replaceChildren(); el('rule-count').textContent = `${rules().length} rules`;
  if (!rules().length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Smart defaults are ready. Add a rule when a field needs something specific.'; list.append(empty); }
  rules().forEach((rule, index) => {
    const row = document.createElement('div'); row.className = 'rule';
    const description = document.createElement('div'), title = document.createElement('strong'), detail = document.createElement('p');
    title.textContent = rule.match; detail.textContent = `${rule.matchType} → ${rule.generator}${rule.value ? ` · ${rule.value}` : ''}`; description.append(title, detail);
    const actions = document.createElement('div'); actions.className = 'rule-actions';
    for (const [label, run] of [
      ['↑', async () => { if (index === 0) return; const list = rules(); [list[index - 1], list[index]] = [list[index]!, list[index - 1]!]; await persist('Rule order saved.'); }],
      ['Edit', () => { editingRule = rule.id; el('rule-heading').textContent = 'Edit rule'; el('save-rule').textContent = 'Save rule'; el('cancel-rule').hidden = false; el<HTMLSelectElement>('match-type').value = rule.matchType; el<HTMLInputElement>('match').value = rule.match; el<HTMLSelectElement>('generator').value = rule.generator; el<HTMLInputElement>('value').value = rule.value; el<HTMLInputElement>('min').value = rule.min === undefined ? '' : String(rule.min); el<HTMLInputElement>('max').value = rule.max === undefined ? '' : String(rule.max); generatorChanged(); el('match').focus(); }],
      ['Delete', async () => { rules().splice(index, 1); ruleReset(); await persist('Rule deleted.'); }],
    ] as const) { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; if (label === '↑') button.setAttribute('aria-label', `Move ${rule.match} earlier`); button.addEventListener('click', () => { Promise.resolve(run()).catch(error => status(String(error), true)); }); actions.append(button); }
    row.append(description, actions); list.append(row);
  });
}
for (const type of generatorTypes) el<HTMLSelectElement>('generator').add(new Option(type.replace(/([a-z])([A-Z])/g, '$1 $2'), type));
el('generator').addEventListener('change', generatorChanged);
el('cancel-rule').addEventListener('click', ruleReset);
el('profile').addEventListener('change', () => { ruleReset(); render(); });
el('save-defaults').addEventListener('click', async () => {
  try { settings.locale = el<HTMLSelectElement>('locale').value as Settings['locale']; settings.overwrite = el<HTMLInputElement>('overwrite').checked; settings.seed = el<HTMLInputElement>('seed').value; await persist('Defaults saved.'); } catch (error) { status(String(error), true); }
});
el('new-profile').addEventListener('click', async () => {
  try { const p: Profile = { id: crypto.randomUUID(), name: 'New site', urlPattern: 'https://example.com/*', enabled: true, rules: [] }; settings.profiles.push(p); await persist('New profile added. Update its URL pattern below.'); el<HTMLSelectElement>('profile').value = p.id; ruleReset(); render(); el('profile-name').focus(); } catch (error) { status(String(error), true); }
});
el('profile-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { const p = profile(); if (!p) return; const updated = { ...p, name: el<HTMLInputElement>('profile-name').value, urlPattern: el<HTMLInputElement>('profile-url').value, enabled: el<HTMLInputElement>('profile-enabled').checked }; const next = structuredClone(settings); next.profiles[next.profiles.findIndex(item => item.id === p.id)] = updated; await saveSettings(next); settings = validateSettings(next); status('Site profile saved.'); render(); } catch (error) { status(String(error), true); }
});
el('delete-profile').addEventListener('click', () => el<HTMLDialogElement>('delete-dialog').showModal());
el('cancel-delete').addEventListener('click', () => el<HTMLDialogElement>('delete-dialog').close());
el('confirm-delete').addEventListener('click', async () => {
  try { const p = profile(); if (!p) return; settings.profiles = settings.profiles.filter(item => item.id !== p.id); await persist('Profile deleted.'); ruleReset(); el<HTMLDialogElement>('delete-dialog').close(); } catch (error) { status(String(error), true); }
});
el('rule-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const number = (id: string) => el<HTMLInputElement>(id).value === '' ? undefined : Number(el<HTMLInputElement>(id).value);
    const rule: Rule = { id: editingRule ?? crypto.randomUUID(), matchType: el<HTMLSelectElement>('match-type').value as Rule['matchType'], match: el<HTMLInputElement>('match').value, generator: el<HTMLSelectElement>('generator').value as Rule['generator'], value: el<HTMLInputElement>('value').value, min: number('min'), max: number('max') };
    const next = structuredClone(settings), selected = profile();
    const target = selected ? next.profiles.find(p => p.id === selected.id)!.rules : next.rules;
    const index = target.findIndex(item => item.id === editingRule);
    if (index === -1) target.push(rule); else target[index] = rule;
    const validated = validateSettings(next); await saveSettings(validated); settings = validated; ruleReset(); render(); status('Custom rule saved.');
  } catch (error) { status(error instanceof Error ? error.message : String(error), true); }
});
el('export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'formseed-settings.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status('Settings exported.');
});
el('import').addEventListener('change', async () => {
  try { const file = el<HTMLInputElement>('import').files?.[0]; if (!file) return; if (file.size > 1_000_000) throw new Error('Use a file smaller than 1 MB.'); pendingImport = importSettings(await file.text()); el('import-summary').textContent = `Import ${pendingImport.profiles.length} site profiles and ${pendingImport.rules.length} global rules.`; el<HTMLDialogElement>('import-dialog').showModal(); } catch (error) { status(String(error), true); } finally { el<HTMLInputElement>('import').value = ''; }
});
el('cancel-import').addEventListener('click', () => { pendingImport = undefined; el<HTMLDialogElement>('import-dialog').close(); });
el('confirm-import').addEventListener('click', async () => {
  try { if (!pendingImport) return; await saveSettings(pendingImport); settings = pendingImport; pendingImport = undefined; el<HTMLDialogElement>('import-dialog').close(); ruleReset(); render(); status('Settings imported.'); } catch (error) { status(String(error), true); }
});
void loadSettings().then(value => { settings = value; render(); generatorChanged(); }).catch(error => status(String(error), true));
