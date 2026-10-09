# Validation status

Initial preview: FormSeed 0.1.0. Build/package support must not be presented as completed marketplace publication or full browser certification.

## Automated checks

- TypeScript: strict type checking passes.
- Unit tests: 18 tests pass for detection, settings validation, profile precedence, paused origins, protected fields, numeric/date/pattern/text constraints, radio groups, coherent identities, repeatable seeds, scoped fills, shadow roots, undo preserving manual edits, and avoiding submit controls in custom dropdowns.
- Chromium: three end-to-end tests pass in Playwright's dedicated Chrome for Testing 156 browser profile.
- The browser tests invoke the real toolbar action through Chrome's browser-level `Extensions.triggerAction` debugging API. They use the production manifest and do not add test-only host permissions.
- Native fields, React 19 controlled inputs, Vue 3 state, Angular 21 bindings, React Select 5.10.2 selection, same-origin frames, and open shadow roots pass their fixture checks.
- The complete fixture, including a 100-field benchmark, filled in about 165 ms in the local check. This is one environment-specific measurement, not a performance guarantee.
- Custom-rule persistence/application, malformed-import rejection, protected-page feedback, and native-field undo are covered by the browser tests.
- All five Manifest V3 builds are generated. The package validator checks versions, resource paths, minimal permissions, and Firefox metadata.
- Firefox's Mozilla add-on validator passes with zero errors, notices, or warnings.
- npm dependency audit reported zero vulnerabilities after resolving the development runner's transitive dependency issues.

## Platform matrix

| Target | Completed | Still needed before marketplace release |
| --- | --- | --- |
| Chrome / Chromium | Automated runtime/UI/permission checks | Smoke-test user toolbar/shortcut/context-menu behavior on supported Chrome versions |
| Firefox desktop | Dedicated build and Mozilla validation | Real Firefox runtime checks, first-use context target behavior, AMO signing/review |
| Safari on Mac | Resources build, local containing-app project generation, and unsigned native app compilation | Safari runtime enablement and site-access checks, signing, Apple review |
| Edge | Dedicated Chromium build | Edge-specific smoke test and certification |
| Opera | Dedicated Chromium build | Live browser smoke test, submission-format acceptance, moderation |
| Brave / Vivaldi | Shared Chromium-compatible package | Live browser smoke tests |
| Mobile targets | Planned only | Touch UI, runtime/API tests, mobile store declarations |

## Manual checklist

For each browser, load the actual extension package and:

1. Invoke the toolbar on the demo fixture and a representative staging form. Confirm that temporary permissions are sufficient and no blanket host access is requested.
2. Fill page, focused form, focused field, and click-selected field. Test the first context-menu invocation and a subsequent context click.
3. Configure and invoke each shortcut. Browser/OS conflicts can leave a suggested command unassigned.
4. Check native selects/radios/checkboxes, dynamic forms, and application validation after input/change events.
5. Confirm that hidden/read-only/disabled/CAPTCHA/file controls remain untouched and no submit action occurs.
6. Add a fixed rule and a pattern rule, create a specific site profile, pause/resume the site, and restart the browser to check persistence.
7. Export/import settings, review the confirmation dialog, and reject a malformed file.
8. Fill, manually edit a value, and undo. Confirm the manual edit is preserved. Custom dropdown state is intentionally outside undo.
9. Try protected pages and inaccessible frames and confirm helpful feedback.
10. Check keyboard navigation, narrow UI, store screenshots, privacy/support URLs, and release version consistency.

## Known limits

Arbitrary regular-expression synthesis, every custom widget library, cross-origin frame access, closed shadow roots, file controls, mobile support, browser-native sync, and custom-dropdown undo are not claimed in this preview.

Safari's locally generated wrapper is a development artifact, not a signed App Store submission. Store accounts, signing, reviewer acceptance, and listing publication remain publisher-controlled release steps.
