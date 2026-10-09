import { browser } from 'wxt/browser';
import { FillEngine } from '../src/core/engine';
import { isField, type Field } from '../src/core/detection';
import type { ContentRequest, FillResult } from '../src/types';

export default defineUnlistedScript(() => {
    const state = globalThis as typeof globalThis & { __formseedReady?: boolean };
    if (state.__formseedReady) return;
    state.__formseedReady = true;
    const engine = new FillEngine(document);
    let stopPicker: (() => void) | undefined;
    document.addEventListener('contextmenu', event => {
      engine.lastContextField = event.composedPath().find(isField);
    }, true);
    function focused(): Field | undefined {
      let el: Element | null = document.activeElement;
      while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
      return isField(el) ? el : undefined;
    }
    function pick(request: ContentRequest): FillResult {
      stopPicker?.();
      const host = document.createElement('div');
      host.style.cssText = 'position:fixed;left:50%;top:16px;transform:translateX(-50%);z-index:2147483647;';
      const shadow = host.attachShadow({ mode: 'open' });
      const bar = document.createElement('div');
      bar.style.cssText = 'background:#173f35;color:white;padding:14px 20px;border-radius:12px;font:14px system-ui;box-shadow:0 8px 30px #0003;';
      bar.textContent = 'FormSeed: click a field to fill it. Press Esc to cancel.';
      shadow.append(bar); document.documentElement.append(host);
      const controller = new AbortController();
      stopPicker = () => { controller.abort(); host.remove(); stopPicker = undefined; };
      document.addEventListener('keydown', event => { if (event.key === 'Escape') stopPicker?.(); }, { capture: true, signal: controller.signal });
      document.addEventListener('click', event => {
        const target = event.composedPath().find(isField);
        if (!target) return;
        event.preventDefault(); event.stopImmediatePropagation(); stopPicker?.();
        void engine.run(request.action === 'form' ? 'form' : 'field', request.settings, target).then(result => {
          const toast = document.createElement('div');
          toast.style.cssText = host.style.cssText;
          const toastRoot = toast.attachShadow({ mode: 'open' });
          const text = document.createElement('div'); text.style.cssText = bar.style.cssText;
          text.textContent = result.message || `${result.filled} filled, ${result.skipped} skipped${result.issues.length ? ` — ${result.issues[0]}` : ''}`;
          toastRoot.append(text); document.documentElement.append(toast); setTimeout(() => toast.remove(), 5000);
        });
      }, { capture: true, signal: controller.signal });
      return { filled: 0, skipped: 0, issues: [], message: 'Click the field on the page. Press Esc to cancel.' };
    }
    browser.runtime.onMessage.addListener((message: ContentRequest, sender, sendResponse) => {
      if (sender.id !== browser.runtime.id || message?.kind !== 'fill') return;
      let target = message.contextMenu ? engine.lastContextField : focused();
      const menus = browser.contextMenus as typeof browser.contextMenus & { getTargetElement?: (id: number) => Element };
      if (message.targetElementId !== undefined && menus.getTargetElement) {
        const element = menus.getTargetElement(message.targetElementId);
        if (isField(element)) target = element;
      }
      if (message.action === 'pick' || (message.contextMenu && ['form', 'field'].includes(message.action) && !target)) {
        sendResponse(pick(message)); return;
      }
      // Avoid treating the hidden text input of a React Select widget as an ordinary field.
      if (target?.matches('[role="combobox"]')) { sendResponse({ filled: 0, skipped: 1, issues: ['Use Fill page/form for custom dropdowns.'] }); return; }
      engine.run(message.action, message.settings, target).then(sendResponse, error => sendResponse({ filled: 0, skipped: 0, issues: [String(error)] }));
      return true;
    });
});
