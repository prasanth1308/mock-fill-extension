# FormSeed privacy policy

Effective date: 8 October 2026. Applies to FormSeed 0.1.x.

FormSeed generates synthetic form data locally in your browser. It has no user accounts, analytics, advertising, telemetry, remote generation API, or remotely loaded executable code.

## Information processed locally

When you invoke FormSeed, it reads the active page's form metadata, such as labels, field types, names, constraints, and current values, to choose appropriate mock data and preserve existing values. It uses the current page URL locally to match site profiles.

Your preferences, custom rules, fixed values, and site profiles are stored in your browser's local extension storage. They are not automatically synced or transmitted to the developer. An undo snapshot temporarily keeps previous native-field values in memory for the current page. Navigation, page closure, or extension reload may clear it.

Import/export is user initiated. Exported settings files can contain site URLs and fixed values entered into rules. You choose where to save them and whom to share them with.

## Website behavior

FormSeed changes form values and dispatches normal input/change events. It never submits forms. The website itself can react to those events, save values, or send requests under its own privacy policy. FormSeed does not control that website behavior.

## Permissions

- **activeTab:** temporary access to a page when you invoke the extension.
- **scripting:** run the locally packaged form filler on that page.
- **storage:** save your preferences and rules locally.
- **contextMenus:** offer form-fill actions in the browser's context menu.

FormSeed does not request blanket, persistent access to every website. Some pages are protected by the browser and cannot be filled.

## External services and deletion

Opening the support or privacy links navigates to GitHub; GitHub's privacy policy applies to that visit. Those links are not telemetry requests.

The developer receives only information you voluntarily provide in a GitHub issue or another support interaction. To remove locally stored extension data, uninstall the extension. Delete any exported files separately.

## Contact and changes

Privacy questions: [open an issue](https://github.com/prasanth1308/mock-fill-extension/issues). Do not include real form contents, credentials, or personal information in public issues. If a future release adds sync or other data transfer, the policy and store declarations will be updated before release.
