import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const version = JSON.parse(await readFile('package.json', 'utf8')).version;
await mkdir('artifacts', { recursive: true });
for (const browser of ['chrome', 'firefox', 'edge', 'safari', 'opera']) {
  execFileSync(process.execPath, ['node_modules/wxt/bin/wxt.mjs', 'zip', '-b', browser, '--mv3'], { stdio: 'inherit' });
  const candidates = (await readdir('.output')).filter(f => f.endsWith('.zip') && f.includes(browser) && !f.includes('sources'));
  const filename = candidates.find(f => f.includes(version));
  if (!filename) throw new Error(`No ${browser} ZIP produced.`);
  await writeFile(path.join('artifacts', `formseed-${version}-${browser}.zip`), await readFile(path.join('.output', filename)));
}
// Reviewer archive contains original sources and a lockfile, excluding credentials and output.
const sourceFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
if (!sourceFiles.includes('package-lock.json')) throw new Error('Commit sources before preparing the reviewer archive.');
const sourceArchive = path.resolve('artifacts', `formseed-${version}-sources.zip`);
// Build a fresh archive so removed files cannot survive from a previous run.
await writeFile(sourceArchive, execFileSync('zip', ['-q', '-', ...sourceFiles], { maxBuffer: 64 * 1024 * 1024 }));
const files = (await readdir('artifacts')).filter(f => f.endsWith('.zip') && f.includes(version)).sort();
const checksums = await Promise.all(files.map(async f => `${createHash('sha256').update(await readFile(path.join('artifacts', f))).digest('hex')}  ${f}`));
await writeFile('artifacts/SHA256SUMS.txt', checksums.join('\n') + '\n');
console.log(`Packaged ${files.length} archives with SHA-256 checksums.`);
