import { execFileSync } from 'node:child_process';
for (const browser of ['chrome', 'firefox', 'edge', 'safari', 'opera']) {
  execFileSync(process.execPath, ['node_modules/wxt/bin/wxt.mjs', 'build', '-b', browser, '--mv3'], { stdio: 'inherit' });
}
execFileSync(process.execPath, ['scripts/validate-packages.mjs'], { stdio: 'inherit' });
