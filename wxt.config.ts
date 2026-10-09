import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  // scripts/package.mjs creates a reviewer archive from tracked source files only.
  zip: { zipSources: false },
  manifest: ({ browser }) => ({
    name: 'FormSeed — Mock Form Filler',
    description: 'Fill forms with realistic test data. Custom rules, site profiles, repeatable seeds, and undo. Works offline.',
    homepage_url: 'https://github.com/prasanth1308/mock-fill-extension',
    permissions: ['activeTab', 'scripting', 'storage', 'contextMenus'],
    icons: { 16: 'icons/16.png', 32: 'icons/32.png', 48: 'icons/48.png', 128: 'icons/128.png' },
    action: { default_title: 'FormSeed', default_icon: { 16: 'icons/16.png', 32: 'icons/32.png' } },
    commands: {
      'fill-page': {
        suggested_key: { default: 'Alt+Shift+F', mac: 'Alt+Shift+F' },
        description: 'Fill empty fields on this page',
      },
      'fill-field': { description: 'Fill the focused field' },
      'undo-fill': { description: 'Undo the last fill on this page' },
    },
    ...(browser === 'firefox' ? {
      browser_specific_settings: {
        gecko: {
          id: 'formseed@prasanth1308.github.io',
          strict_min_version: '140.0',
          data_collection_permissions: { required: ['none'] },
        },
        gecko_android: { strict_min_version: '142.0' },
      },
    } : {}),
  }),
});
