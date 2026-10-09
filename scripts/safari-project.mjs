import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const location = process.argv[2] ?? 'safari-build/generated';
const bundleId = 'io.github.prasanth1308.formseed';
execFileSync('xcrun', ['safari-web-extension-packager', '.output/safari-mv3', '--project-location', location, '--app-name', 'FormSeed', '--bundle-identifier', bundleId, '--macos-only', '--swift', '--copy-resources', '--no-open', '--no-prompt'], { stdio: 'inherit' });
const project = path.join(location, 'FormSeed', 'FormSeed.xcodeproj', 'project.pbxproj');
const source = await readFile(project, 'utf8');
// Apple's generated app can capitalize the app-name segment while leaving the extension
// identifier lowercase. Normalize both targets so embedded-binary prefix validation succeeds.
const updated = source.replace(/PRODUCT_BUNDLE_IDENTIFIER = ([^;]+);/g, (_, id) => `PRODUCT_BUNDLE_IDENTIFIER = ${bundleId}${id.endsWith('.Extension') ? '.Extension' : ''};`);
await writeFile(project, updated);
console.log(`Safari app project: ${project}`);
