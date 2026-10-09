# Architecture

FormSeed separates the browser adapter from the DOM and generation engine.

## Browser invocation

The popup, extension command, or context menu calls the background adapter. The adapter loads local settings, obtains the active tab, and injects the unlisted `filler.js` script with `scripting.executeScript`. It then sends a typed request to the injected listener.

An unlisted script is intentional: declaring URL-matched content scripts can make the build tool add broad host permissions. The production manifests use only `activeTab`, `scripting`, `storage`, and `contextMenus`, with no persistent host permissions.

Listeners are registered synchronously at background startup. Requests use `sendResponse`/`return true` for compatibility across browser messaging implementations. Only extension-origin UI messages can start a background fill. The filler accepts messages from its own extension ID.

The injected script is initialized once per frame. It captures subsequent context-menu targets, tracks focused fields through open shadow roots, and provides an explicit click-to-select fallback on first use. Firefox's target-element API is used when available.

## Detection and generation

- `src/core/detection.ts`: field recognition, associated/ARIA labels, semantic detection, ordered rule matching.
- `src/core/generation.ts`: bounded local Faker generation, a coherent identity per operation, deterministic seeds, supported HTML patterns, numeric steps, date/length constraints.
- `src/core/engine.ts`: eligibility, open shadow roots/same-origin frames, native setters/events, native controls, ARIA listbox adapter, and bounded undo snapshots.
- `src/settings.ts`: versioned settings validation, glob matching, and profile precedence.
- `src/storage.ts`: local extension storage only.

Native setters are taken from each field's own window so same-origin frame controls use the correct realm. Values are checked before notifying the application. Generated values that the browser rejects are rolled back.

Undo records before/after values and restores only fields that have not subsequently changed. Radio-group eligibility is evaluated before restoration because selecting a peer changes the group's state. Native-field snapshots are bounded to 1,000 changed fields.

Custom dropdowns use their keyboard/listbox interaction API rather than assigning arbitrary text to component-owned inputs. Their component state is not part of native-field undo.

## UI and packaging

The popup and options page use static HTML/CSS and TypeScript with DOM-created rule rows. User-entered rule text is rendered as text, not HTML. The demo's React, Vue, Angular, and React Select dependencies are development-only and are not shipped in extension UI packages.

WXT generates independent Manifest V3 outputs for Chrome, Firefox, Edge, Safari, and Opera. Firefox receives a stable add-on ID and a no-data-transmission declaration. Safari resources must be packaged into a containing app by Apple's tools before installation or store submission.

The release script creates browser archives and a source archive from Git-tracked files, excluding credentials and ignored output. CI performs checks and generates downloadable artifacts; no marketplace credentials are committed or required for builds.
