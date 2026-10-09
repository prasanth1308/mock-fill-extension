import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
const pkg = JSON.parse(await readFile('package.json', 'utf8'));
for (const browser of ['chrome', 'firefox', 'edge', 'safari', 'opera']) {
  const root = path.join('.output', `${browser}-mv3`);
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.version, pkg.version);
  assert.deepEqual([...manifest.permissions].sort(), ['activeTab', 'contextMenus', 'scripting', 'storage'].sort());
  assert.equal(manifest.host_permissions?.length ?? 0, 0, 'Do not request persistent access to every website.');
  assert.equal(manifest.content_scripts?.length ?? 0, 0, 'Filler must be invoked through activeTab.');
  for (const file of ['filler.js', 'background.js', 'popup.html', 'options.html', 'THIRD_PARTY_NOTICES.txt', ...Object.values(manifest.icons)]) await access(path.join(root, file));
  if (browser === 'firefox') {
    assert.equal(manifest.browser_specific_settings.gecko.id, 'formseed@prasanth1308.github.io');
    assert.deepEqual(manifest.browser_specific_settings.gecko.data_collection_permissions.required, ['none']);
    assert.ok(manifest.background.scripts, 'Firefox needs a background-script build.');
  }
}
console.log('Five packages validated: versions, permissions, resources, Firefox metadata.');
