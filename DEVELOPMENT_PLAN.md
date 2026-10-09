# Cross-browser mock form filler: development and publishing plan

Prepared 8 October 2026. This is a planning deliverable; implementation and remote repository creation have not started.

## 1. Product and scope

Build an independently implemented, open-source extension for developers and QA teams that fills web forms with realistic synthetic data. Reproduce the useful workflows described by the reference products, with an original name, interface, icons, and store copy.

- Working product name: **FormSeed**, subject to a name-availability check before release.
- Proposed public repository: **mock-fill-extension** on the user's personal GitHub account.
- Proposed license: **MIT**, with dependency notices included.
- First release: free, runs offline, no accounts, analytics, remote generation API, or subscriptions.
- Settings remain local by default. Browser sync is a separately disclosed follow-up feature.

The reference assessment uses the public listings and product websites; it is not an audit of their installed extensions. Marketing claims such as “works on any website” are not acceptance criteria for this project.

## 2. Reference features and release scope

Fake Filler advertises bulk generation, configurable fields, and exclusion of CAPTCHA, hidden, disabled, and read-only fields. Its website also describes URL-specific profiles and settings sync. Sources: [Chrome listing](https://chromewebstore.google.com/detail/fake-filler/bnjjngeaknajbdcgpfkgnonkmififhfo?hl=en), [product website](https://fakefiller.com/).

MockFill advertises single-field and bulk filling, contextual field detection, local generation, framework compatibility, and dropdown support. Its website describes shortcuts, custom length/format/value rules, and site controls. Sources: [Chrome listing](https://chromewebstore.google.com/detail/mockfill-%E2%80%93-autofill-forms/ibaokjdbkpcihbpbpnlilmegbaaijghf?hl=en), [product website](https://www.mockfill.com/).

| Capability | Planned delivery |
| --- | --- |
| Fill all eligible fields on a page | First release, from popup, shortcut, and context menu where supported |
| Fill the current field or containing form | First release, including first-use context-menu targeting |
| Detect field meaning | Use input type, autocomplete, labels, name/id, placeholder, and ARIA metadata |
| Realistic mock data | Names, usernames, email, password, phone, URL, company, address, postal code, text, numbers, and dates |
| Native controls | Inputs, textareas, select/multiselect, checkbox, radio groups, range, and date/time variants |
| Framework forms | Verified fixtures for React, Vue, and Angular state and validation updates |
| Custom dropdowns | A tested React Select adapter in the first release; additional widgets through later adapters |
| Custom rules | Match by selector or field metadata; choose fixed value, generator, bounded length, numeric range, or supported pattern template |
| Site-specific profiles | Domain/path matching, per-site enable/disable, and ordered rule precedence |
| Existing values | Fill empty fields by default; explicit overwrite option |
| Exclusions | Skip hidden, disabled, read-only, file, submit/button, CAPTCHA, and identified anti-bot honeypot fields |
| Consistent related fields | A generated identity per operation; matching password-confirmation fields |
| Preferences and portability | Local persistence plus validated JSON import/export |
| Settings sync | Follow-up: opt-in browser-provided sync where supported; disclose what leaves the device |
| Undo and deterministic seed | First-release additions, useful for repeatable testing and recovery |

The extension will not submit forms. A page may react to normal input/change events, so filling can still trigger that site's own validation or requests. Privacy copy must describe the extension's behavior precisely rather than claim that no website can transmit the filled values.

Supported patterns will be documented. Arbitrary executable rules and unrestricted regular-expression synthesis are outside the first release. Unsupported constraints will be reported instead of claiming a valid value was generated.

## 3. Browser support and distribution

| Target | Package and marketplace | Release position |
| --- | --- | --- |
| Chrome desktop | Manifest V3 ZIP, Chrome Web Store | Primary |
| Edge desktop | Tested Chromium build, Microsoft Edge Add-ons | Primary |
| Firefox desktop | Dedicated Manifest V3 build, Mozilla Add-ons (AMO) | Primary |
| Safari on macOS | Safari web-extension resources packaged into an app, Mac App Store | Required release target |
| Opera desktop | Tested Chromium build, Opera Add-ons | Required release target; validate current submission acceptance |
| Brave desktop | Chrome package through Chrome Web Store | Compatibility smoke test |
| Vivaldi desktop | Chrome package through Chrome Web Store | Compatibility smoke test |
| Other Chromium browsers | Same package when their extension APIs and installation paths support it | Add to supported list only after testing |
| Safari on iPhone/iPad | iOS app containing the extension, App Store | Follow-up, with touch-friendly controls and device testing |
| Firefox on Android | AMO Android compatibility declaration and mobile testing | Follow-up, with popup-based fallbacks |

Brave and Vivaldi support installation through the Chrome Web Store, so separate listings are unnecessary for those targets. Sources: [Brave installation guide](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave), [Vivaldi extension guide](https://help.vivaldi.com/desktop/appearance-customization/extensions/).

Desktop compatibility does not establish mobile compatibility. Keyboard shortcuts, context menus, browser API availability, and permissions need platform-specific handling.

## 4. Technical approach

Use **TypeScript + WXT**, lightweight HTML/CSS for the popup/options UI, and selected locally bundled **Faker** locales for synthetic data. WXT supports browser-specific builds and manifests. Explicitly request Manifest V3 rather than relying on its Firefox/Safari defaults. Sources: [WXT browser targeting](https://wxt.dev/guide/essentials/target-different-browsers.html), [Faker usage](https://fakerjs.dev/guide/usage.html), [Faker localization](https://fakerjs.dev/guide/localization.html).

Build a browser-independent form engine with small adapters for extension APIs and custom controls:

1. Discover eligible fields in the current document, permitted frames, and open shadow roots.
2. Resolve a field's meaning and apply the highest-priority matching profile/rule.
3. Generate a coherent data set, respecting supported HTML length/range/step constraints.
4. Apply values through native setters and appropriate events so framework state updates.
5. Return counts and useful explanations for skipped or unsupported fields.
6. Keep a bounded in-memory undo snapshot for the current page; invalidate on navigation and avoid overwriting subsequent user edits.

Starting permissions: `activeTab`, `scripting`, `storage`, and `contextMenus`. Invoke the filler on an explicit user action. Add optional, per-origin host permissions only when cross-origin frames or a later feature requires them. `activeTab` provides temporary access after invocation. Source: [Chrome activeTab documentation](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab).

The browser adapter must resolve the actual clicked/focused field even before a content script has previously run. Test this during the compatibility spike; do not assume a right-clicked field is the active element. Mobile platforms will use available popup controls.

Browser-generated manifests must handle background execution differences rather than assume one Chrome manifest works everywhere. Source: [WebExtension background documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/background).

All extension code, fonts, and generation data are packaged locally. Store only preferences/rules, not page contents or filled-form histories. Document protected browser/store pages, inaccessible cross-origin frames, closed shadow roots, file controls, and unsupported custom widgets as known limits.

Proposed source layout:

```text
entrypoints/           background, injected filler, popup, options
src/core/             discovery, detection, generation, filling, undo
src/rules/            profiles, matching, import/export, validation
src/adapters/         browser APIs and custom controls
src/ui/               shared accessible UI components and styles
public/               original icons and packaged assets
tests/                engine tests and representative browser fixtures
docs/                 install, architecture, privacy, publishing guides
store-assets/         descriptions, screenshots, permission justifications
scripts/              release packaging and reviewer-source preparation
.github/workflows/    validation, browser builds, release artifacts
```

## 5. Implementation milestones

### Milestone A: foundation and browser feasibility

- Select original branding and freeze a stable Firefox add-on ID.
- Scaffold the project, pin dependencies, and define explicit browser build commands.
- Prove user-action injection, background messaging, local storage, context-menu field targeting, and framework event handling in Chrome, Firefox, and Safari.
- Exercise Safari packaging early; resolve API limitations before expanding features.

Exit: a small working form-fill operation in each browser family and a documented compatibility matrix.

### Milestone B: core filler and interface

- Implement semantic detection, local generators, coherent identities, and supported HTML constraints.
- Build the popup with fill-page, fill-form, overwrite, profile, and undo controls.
- Add supported shortcuts/context menus and accessible keyboard navigation.
- Implement exclusions and actionable feedback for protected pages or unavailable permissions.

Exit: core flows work on representative HTML and framework forms, including first invocation and repeat fills.

### Milestone C: custom rules and parity

- Build the options page, site profiles, generator settings, and rule editor.
- Add fixed values, bounded formats, rule priority, locale selection, and JSON import/export.
- Add the React Select adapter and record supported widget versions.
- Add repeatable seeds and protect undo against later manual edits.

Exit: custom rules survive restart, profiles apply only to intended sites, imports are validated, and unsupported widgets are explained.

### Milestone D: validation and release preparation

- Run meaningful unit tests for detection precedence, rules, constraints, seed behavior, and exclusions.
- Test browser behavior on fixtures for React/Vue/Angular, multiple forms, radios/selects, dynamic fields, permitted frames, and open shadow roots.
- Automate supported Chromium extension checks. Load the real extension in Firefox and Safari for their platform tests; a Playwright WebKit page alone does not validate a Safari extension.
- Smoke-test Edge, Opera, Brave, and Vivaldi before claiming support.
- Run TypeScript checks, package validation, Firefox `web-ext lint`, and inspect generated manifests and release ZIPs.
- Benchmark a representative 100-field form and report measured performance and package sizes.

Exit: release packages pass their validators, framework fixtures retain the generated values, protected fields remain untouched, forms are not submitted, and extension-initiated telemetry/generation traffic is absent.

### Milestone E: public repository and release

- Recheck GitHub CLI authentication outside any restricted execution context and use `gh auth login -h github.com` if necessary.
- Verify the authenticated personal account with `gh api user`; check whether the proposed repository already exists.
- Initialize local Git on `main`, add a targeted `.gitignore`, and commit implementation, license, documentation, and source assets.
- Create the public personal repository and push. The locally configured candidate account is `prasanth1308`; confirm it before choosing the owner.
- Add CI for checks and browser builds, plus a tagged `v1.0.0` release with browser ZIPs, reviewer source, checksums, and release notes.
- Supply marketplace submission instructions and ready-to-use listing materials.

Example command after confirming the owner and ensuring local commits exist:

```sh
gh repo create OWNER/mock-fill-extension --public --source=. --remote=origin --push
```

GitHub CLI's local help confirms these options. As of planning, its auth check reports an invalid token; no remote repository has been created. Publishing the source is already requested by the user and does not need a separate product-scope approval once implementation starts. Any necessary tool-level access prompt must still be honored.

## 6. Marketplace publishing steps

Before submitting anywhere, prepare an original icon set, actual product screenshots, concise and full descriptions, a support address, a public privacy-policy URL, permission explanations, reviewer test instructions, and matching version numbers. The repository can provide the support/issues URL and public privacy documentation initially.

### Chrome Web Store

1. Register the developer account and complete account requirements, including the one-time registration payment.
2. Build the Chrome Manifest V3 package and upload the ZIP from the developer dashboard.
3. Complete the store listing and Privacy fields: single purpose, permission reasons, remote-code declaration, and accurate data practices.
4. Add screenshots, icon, support/privacy links, and instructions for reviewers.
5. Submit for review, address feedback, and publish when accepted.

Google documents a one-time registration fee; confirm the current charged amount in the dashboard rather than fixing it in project documentation. Sources: [registration](https://developer.chrome.com/docs/webstore/register/), [publishing](https://developer.chrome.com/docs/webstore/publish).

### Firefox / Mozilla Add-ons

1. Create an AMO developer account and choose the public “on this site” distribution channel.
2. Include a stable `browser_specific_settings.gecko.id` in the Manifest V3 build.
3. Declare the initial no-transmission design with `browser_specific_settings.gecko.data_collection_permissions.required: ["none"]`.
4. Run `web-ext lint`, upload the Firefox package, and address validator findings.
5. Provide the original TypeScript sources, lockfile, and reproducible build instructions for transformed/bundled code, along with listing metadata and reviewer notes.
6. Submit and follow AMO signing/publication and review status. Upload updates to the same add-on listing.

Mozilla requires new extensions to use its built-in data declarations from 3 November 2025. Reassess the declaration if settings sync or any external transfer is introduced. Sources: [add-on ID](https://extensionworkshop.com/documentation/develop/extensions-and-the-add-on-id/), [data declarations](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/), [submission](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/).

### Microsoft Edge Add-ons

1. Register in the Microsoft Edge program through Partner Center and complete verification.
2. Create a new extension entry and upload the tested Edge package.
3. Complete properties, listing images/text, and privacy/permission declarations.
4. Add reviewer instructions, submit for certification, and release when accepted.

Microsoft states that Edge extension registration has no fee. Sources: [registration](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/create-dev-account), [publishing](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).

### Safari / Apple App Store

1. Enroll in the Apple Developer Program; Apple lists USD 99 per membership year, with region-specific pricing.
2. Create an App Store Connect app record with a stable bundle ID, initially targeting macOS.
3. Use the **Safari Web Extension Packager** under the app's Xcode Cloud tab to upload the complete Safari extension resources. It creates the containing app; use TestFlight for beta testing.
4. Alternatively, package locally with Apple's tools and Xcode for a custom containing app and signing workflow. Xcode 27.0 is installed in this workspace's host environment.
5. Test the packaged extension in real Safari, including permission prompts and enablement.
6. Complete app metadata, screenshots, privacy information, support links, and review notes; select the packaged build and submit for App Store review.

The browser-based packager can create macOS and iOS apps without requiring a local Mac or Xcode. Its compute use draws from the included Xcode Cloud allocation. Sources: [Apple enrollment](https://developer.apple.com/programs/enroll/), [Safari packager](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect), [Safari distribution](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension).

### Opera Add-ons

1. Sign in to the Opera developer submission site.
2. Validate the current supported package/manifest format against the tested Chromium build.
3. Upload the extension and supply original listing text, icons, screenshots, and support/privacy links.
4. Submit for moderation, track feedback, and resubmit fixes as required.

Treat current submission-format acceptance as a release check rather than assume Chrome store acceptance transfers to Opera. Source: [Opera publishing guide](https://help.opera.com/en/extensions/publishing-guidelines/).

## 7. Deliverables and dependencies

Expected deliverables:

- Working, independently branded extension source and browser packages.
- Public personal GitHub repository with CI and tagged downloadable releases.
- README, MIT license, dependency notices, changelog, privacy policy, and architecture notes.
- Local installation instructions for every target browser.
- Marketplace-specific publishing guides, listing copy, screenshots, and reviewer-source package.
- An honest browser/feature test matrix and known limitations.

Account dependencies: working personal GitHub authentication, publisher access for each store, Chrome registration payment, Apple membership, chosen support contact, and completed store-required identity/account information. Development and packaging can proceed while these are arranged. Store approval times are external and are not part of an engineering completion estimate.

Suggested rollout: Chrome, Firefox, and Edge first; Safari and Opera after their packages pass platform checks. Add mobile targets and opt-in browser sync in a subsequent release. Every claimed marketplace release remains dependent on the store's own acceptance.
