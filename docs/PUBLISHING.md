# Publish FormSeed to browser marketplaces

These steps were checked against the publishers' documentation on 8 October 2026. Publisher dashboards, fees, and review requirements can change; check the linked official pages before submission.

## Prepare one release

1. Choose the final public product name and support contact. The current working name is FormSeed.
2. Run the checks and complete the manual platform checks in [TESTING.md](TESTING.md). Do not claim untested browsers or features in listings.
3. Build and package from a committed Git checkout:

   ```sh
   npm ci
   npx wxt prepare
   npm run check
   npm run build:all
   npm run lint:firefox
   npm run test:e2e
   npm run package
   ```

4. Use the assets and copy in [store-assets/LISTING.md](../store-assets/LISTING.md). Capture any additional store-specific screenshots from the actual extension.
5. Use the public [privacy policy](https://github.com/prasanth1308/mock-fill-extension/blob/main/docs/PRIVACY.md) and [support issues page](https://github.com/prasanth1308/mock-fill-extension/issues). Supply your own email where the store requires one.
6. Match store privacy answers to the implementation: local-only generation/settings, no analytics, no remote code, and user-initiated access. Describe page reading/editing accurately even though the developer receives no form data.

## Chrome Web Store

1. Visit the [developer dashboard](https://chrome.google.com/webstore/devconsole), register, complete account/security requirements, and pay the one-time registration charge shown there.
2. Add a new item and upload `artifacts/formseed-0.1.0-chrome.zip`.
3. Complete the name, summary, description, category, language, screenshots, icon, support URL, and privacy-policy URL.
4. In Privacy, state the single purpose and explain each requested permission using [LISTING.md](../store-assets/LISTING.md). Declare no remotely hosted code and accurately describe the data practices.
5. Add reviewer instructions for loading the included demo or using a simple public form.
6. Choose distribution settings, submit for review, address feedback, and publish after approval.

Updates: increment the extension version, build a new ZIP, and upload it to the existing listing.

Official sources: [register](https://developer.chrome.com/docs/webstore/register/), [publish](https://developer.chrome.com/docs/webstore/publish).

## Firefox / Mozilla Add-ons

1. Create a Mozilla account at [AMO Developer Hub](https://addons.mozilla.org/developers/).
2. Choose **Submit a New Add-on** and public distribution **On this site**.
3. Upload `artifacts/formseed-0.1.0-firefox.zip`. Keep the stable ID `formseed@prasanth1308.github.io` across all releases.
4. Address validator findings. The build includes `data_collection_permissions.required: ["none"]` because the initial release does not transmit data outside the local browser.
5. Upload `artifacts/formseed-0.1.0-sources.zip` for transformed/bundled code. State: Node 24 LTS, `npm ci`, `npx wxt prepare`, then `npm run build:firefox`. The lockfile and sources are included.
6. Complete listing information, license, supported desktop platforms, screenshots, support/privacy URLs, and reviewer notes.
7. Submit, follow signing/publication and review status, and resolve any feedback. Do not list Android compatibility until mobile behavior has been tested.

Official sources: [submission](https://extensionworkshop.com/documentation/publish/submitting-an-add-on/), [source requirements](https://extensionworkshop.com/documentation/publish/source-code-submission/), [add-on IDs](https://extensionworkshop.com/documentation/develop/extensions-and-the-add-on-id/), [data declarations](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/).

## Microsoft Edge Add-ons

1. Register an individual publisher in the Edge program at [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview) and complete verification. Microsoft documents no Edge extension registration fee.
2. Create a new extension and upload `artifacts/formseed-0.1.0-edge.zip`.
3. Complete properties, purpose, permission reasons, remote-code declaration, privacy/data details, and localized store listing.
4. Supply icons/screenshots, support/privacy links, and reviewer instructions.
5. Submit for certification and release after acceptance. Use the same listing for updates.

Official sources: [registration](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/create-dev-account), [publication](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension).

## Safari / Apple App Store

Safari needs an app containing the web extension. The Safari resource ZIP is input to the packager, not a directly installable App Store binary.

### App Store Connect packager

1. Enroll your Apple account in the Apple Developer Program. Apple lists USD 99 per year, with regional pricing and possible eligible waivers.
2. Create an app record in [App Store Connect](https://appstoreconnect.apple.com/), initially for macOS. Select an appropriate stable bundle identifier, such as `io.github.prasanth1308.formseed`.
3. Open the app's **Xcode Cloud** tab. Under **Safari Web Extension Packager**, upload `artifacts/formseed-0.1.0-safari.zip`.
4. Review packaging/compatibility exceptions. Use the produced build with TestFlight and test the actual extension in Safari, including enablement and site-access prompts.
5. Complete app screenshots, product metadata, privacy information, support contact/URLs, age-rating questions, and reviewer instructions.
6. Select the tested build, submit for App Store review, and release after approval.

The packager can also create an iOS app, but mobile functionality must be tested before choosing those platforms. Its compute usage counts against the membership's included Xcode Cloud allocation.

### Local Xcode route

With Xcode installed, generate the project without opening it:

```sh
npm run build:safari
npm run safari:project
```

Open `safari-build/generated/FormSeed/FormSeed.xcodeproj`, choose your signing team, build/run the containing app, and enable the extension in Safari. The script normalizes the generated app/extension bundle identifiers to avoid case-mismatch failures. Unsigned local development requires Safari's developer setting for unsigned extensions. For public distribution, use an appropriately signed archive and App Store Connect.

The project generator does not overwrite an existing project. To generate a separate project, use `node scripts/safari-project.mjs safari-build/another-project`.

Official sources: [membership](https://developer.apple.com/programs/enroll/), [web packager](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect), [distribution](https://developer.apple.com/documentation/safariservices/distributing-your-safari-web-extension).

## Opera Add-ons

1. Sign in at [Opera's developer portal](https://addons.opera.com/developer/).
2. Check its current upload/manifest acceptance requirements and smoke-test the production build in Opera.
3. Upload the tested `artifacts/formseed-0.1.0-opera.zip` using the accepted format. If a different archive format is required, follow the portal's instructions.
4. Supply original descriptions, screenshots/icons, support links, privacy documentation, and test instructions.
5. Submit for moderation, track feedback, and upload corrections as needed. Chrome approval does not transfer to this store.

Official source: [Opera publishing guide](https://help.opera.com/en/extensions/publishing-guidelines/).

## Brave, Vivaldi, and other browsers

Brave and Vivaldi install compatible extensions from the Chrome Web Store. Share the Chrome listing after smoke-testing FormSeed in those browsers. Other Chromium browsers can use it when their WebExtension APIs and installation paths support it. Do not promise mobile support from desktop tests.

Sources: [Brave](https://support.brave.com/hc/en-us/articles/360017909112-How-can-I-add-extensions-to-Brave), [Vivaldi](https://help.vivaldi.com/desktop/appearance-customization/extensions/).

## Account work the publisher must complete

Each store requires its own account, identity/contact information, policy acceptance, and sometimes payment. GitHub authentication does not grant marketplace publishing access. Initial submission can be completed manually using these packages; automated update uploads can be added later using each publisher's API and repository secrets.
