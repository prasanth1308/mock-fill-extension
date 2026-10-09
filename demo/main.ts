import { createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Select from 'react-select';
import { createApp, h as vh, ref } from 'vue';
import '@angular/compiler';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

function ReactForm() {
  const [name, setName] = useState(''), [email, setEmail] = useState(''), [department, setDepartment] = useState('');
  return h('form', { id: 'react-form', onSubmit: (e: React.FormEvent) => e.preventDefault() },
    h('label', null, 'Full name', h('input', { name: 'fullName', value: name, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value) })),
    h('label', null, 'Email', h('input', { name: 'email', type: 'email', value: email, onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value) })),
    h('label', { htmlFor: 'department' }, 'Department'),
    h(Select, { inputId: 'department', name: 'department', classNamePrefix: 'garden-select', options: [{ label: 'Engineering', value: 'engineering' }, { label: 'Design', value: 'design' }, { label: 'Quality', value: 'quality' }], onChange: (option: unknown) => setDepartment((option as { value: string } | null)?.value ?? '') }),
    h('output', { id: 'react-state' }, JSON.stringify({ name, email, department })),
  );
}
createRoot(document.getElementById('react')!).render(h(ReactForm));
createApp({
  setup() {
    const firstName = ref(''), city = ref('');
    return () => vh('form', { id: 'vue-form' }, [
      vh('label', null, ['First name', vh('input', { name: 'firstName', value: firstName.value, onInput: (e: Event) => { firstName.value = (e.target as HTMLInputElement).value; } })]),
      vh('label', null, ['City', vh('input', { name: 'city', value: city.value, onInput: (e: Event) => { city.value = (e.target as HTMLInputElement).value; } })]),
      vh('output', { id: 'vue-state' }, JSON.stringify({ firstName: firstName.value, city: city.value })),
    ]);
  },
}).mount('#vue');
class AngularForm { name = ''; email = ''; }
Component({
  selector: 'formseed-angular', standalone: true,
  template: '<form id="angular-form"><label>Full name<input name="fullName" [value]="name" (input)="name=$any($event.target).value"></label><label>Email<input name="email" type="email" [value]="email" (input)="email=$any($event.target).value"></label><output id="angular-state">{{name}} / {{email}}</output></form>',
})(AngularForm);
void bootstrapApplication(AngularForm, { providers: [provideZonelessChangeDetection()] });
const shadow = document.getElementById('shadow-host')!.attachShadow({ mode: 'open' });
shadow.innerHTML = '<style>label{display:grid;gap:5px;font:13px system-ui}input{padding:10px;border:1px solid #dfe5d9;border-radius:8px}</style><label>Shadow first name<input name="firstName" autocomplete="given-name"></label>';
const native = document.getElementById('native')!;
let events = 0;
native.addEventListener('input', () => { document.getElementById('native-events')!.textContent = `${++events} input events received`; });
native.addEventListener('submit', event => { event.preventDefault(); document.body.dataset.submitted = 'true'; });
const benchmark = document.querySelector('#benchmark form')!;
for (let i = 0; i < 100; i++) { const input = document.createElement('input'); input.name = `firstName${i}`; input.setAttribute('aria-label', `First name ${i}`); benchmark.append(input); }
document.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => event.preventDefault()));
