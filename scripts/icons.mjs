import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
await mkdir('public/icons', { recursive: true });
for (const size of [16, 32, 48, 128, 256, 512, 1024]) {
  await sharp('public/icon.svg').resize(size, size).png().toFile(`public/icons/${size}.png`);
}
console.log('Generated original FormSeed icons.');
