# FormSeed

**Realistic test data, one click away.** An open-source browser extension for developers and QA teams. Fill forms, tailor individual fields, and undo a fill without sending form data to a generation service.

![FormSeed icon](public/icons/128.png)

## What it does

- Fill a page, the focused form, or a focused/chosen field.
- Detect fields from labels, input types, autocomplete, names, and placeholders.
- Generate coherent names, emails, passwords, addresses, phones, dates, and numeric values.
- Fill native dropdowns, checkboxes, radios, open shadow roots, and accessible same-origin frames.
- Update React, Vue, and Angular form state through native setters and normal events.
- Select options in supported React Select / ARIA listbox widgets.
- Override defaults with fixed values, generators, bounded digits/numbers, and pattern templates.
- Set site profiles, pause sites, and import/export your settings.
- Use a seed for repeatable data, preserve existing values by default, and undo the last native-field fill.
- Work offline with no account, analytics, or remote code.

FormSeed skips hidden, disabled, read-only, CAPTCHA/honeypot, file, and button fields. It never submits forms. Websites may still react to normal input/change events.

## Browser packages

| Browser | Build target | Distribution |
| --- | --- | --- |
| Chrome | `chrome-mv3` | Chrome Web Store |
| Edge | `edge-mv3` | Microsoft Edge Add-ons |
| Firefox 140+ | `firefox-mv3` | Mozilla Add-ons |
| Safari on Mac | `safari-mv3` | Packaged containing app / Mac App Store |
| Opera | `opera-mv3` | Opera Add-ons, subject to current submission acceptance |
| Brave / Vivaldi | Chrome package | Chrome Web Store |

Packages are generated from a shared TypeScript/WXT codebase. Build support is separate from live browser verification; see [validation status](docs/TESTING.md). Mobile support and browser-native settings sync are follow-up work.

## Run locally

Requires Node.js 22.12+ and npm. Node.js 24 LTS is recommended.

```sh
npm ci
npx wxt prepare
npm run dev
```

Firefox development: `npm run dev:firefox`.

Production builds:

```sh
npm run check
npm run build:all
npm run lint:firefox
npm run package
```

The package command expects tracked sources in a Git checkout. It writes the five browser ZIPs, a reviewer-source ZIP, and SHA-256 checksums to `artifacts/`.

### Load a browser build

Chrome/Edge/Opera/Brave/Vivaldi: open the browser's extensions page, enable Developer mode, choose **Load unpacked**, and select `.output/chrome-mv3` (or the browser-specific build).

Firefox: open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `.output/firefox-mv3/manifest.json`. Temporary add-ons are removed when Firefox restarts. Public Firefox packages require AMO signing.

Safari: use Apple's packager to create the containing app. See [Safari publishing and local packaging](docs/PUBLISHING.md#safari--apple-app-store). The resource ZIP is not directly installable as a Safari app.

## Use it

1. Open a normal web page with a form.
2. Click the FormSeed toolbar button and choose **Fill this page**.
3. To fill one field, focus it and use **Fill focused field**, or use **Choose a field** and click it on the page.
4. To fill one form, focus a field inside it and use **Fill focused form**.
5. Use **Settings & custom rules** for site profiles and overrides.

The default shortcut is **Alt+Shift+F** (Option+Shift+F on Mac). Browser/OS conflicts may prevent it from being assigned; configure shortcuts on your browser's extension-shortcut page. Field filling and undo commands are also available for assigning custom shortcuts.

On the first context-menu use, Chrome may need an additional click to identify the exact field. Subsequent context clicks on the same page can use the captured target. This avoids guessing which input you meant.

### Rules

First matching site rule wins, then the global rules apply. The most specific URL pattern selects the site profile. Use `*` as a URL wildcard.

Examples:

| Match | Generator | Configuration |
| --- | --- | --- |
| Name contains `employeeId` | Pattern | `EMP-####` |
| CSS selector `input[name="routing"]` | Digits | Minimum 9, maximum 9 |
| Label contains `Email` | Fixed | `tester@example.com` |
| Name contains `quantity` | Number | Minimum 1, maximum 10 |

Pattern template tokens: `#` = digit, `@` = uppercase letter, `~` = lowercase letter. Escape tokens with a backslash for literal characters.

Automatic HTML pattern generation supports bounded numeric/letter classes such as `[0-9]{4}`, `\d{6}`, `[A-Z]{3}`, and literal prefixes/suffixes like `EMP-[0-9]{4}`. Other constraints are checked and unsupported values are skipped with an explanation. Rules contain data, not executable JavaScript.

## Tests and demo forms

```sh
npm test
npx playwright install chromium
npm run build
npm run test:e2e
npm run demo
```

The demo at `http://127.0.0.1:4173/demo/` includes real React + React Select, Vue, Angular, shadow-root, iframe, and 100-field fixtures. Browser tests use a dedicated temporary Chromium profile. They do not alter your personal browser profile.

## Known limits

- Browser settings pages, store pages, inaccessible cross-origin frames, closed shadow roots, and file controls cannot be filled.
- Custom dropdown support is adapter-based. It does not cover every component library.
- Undo restores native fields whose values still match the last fill. It preserves manual edits and does not restore custom dropdown component state.
- A seed is repeatable with the same form, settings, locale, and generator version; dependency updates can change generated data.
- Email data uses `example.com`; generated passwords are test fixtures rather than production credentials.
- Browser settings sync, mobile releases, and payment features are not included.

## Publish and contribute

- [Marketplace publishing guide](docs/PUBLISHING.md)
- [Store listing text and permission explanations](store-assets/LISTING.md)
- [Privacy policy](docs/PRIVACY.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Validation status](docs/TESTING.md)
- [Original development plan](DEVELOPMENT_PLAN.md)

Report bugs through [GitHub Issues](https://github.com/prasanth1308/mock-fill-extension/issues). Please include the browser, field markup, and minimal reproduction without real personal information.

MIT licensed. See [LICENSE](LICENSE) and [dependency notices](THIRD_PARTY_NOTICES.md).
