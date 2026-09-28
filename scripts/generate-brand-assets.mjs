import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const appDir = path.join(rootDir, 'src', 'app');
const brandDir = path.join(publicDir, 'brand');

async function createOgImage() {
  const width = 1200;
  const height = 630;

  const bgSvg = Buffer.from(`
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg-grad" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="100%" stop-color="#FAFAF7"/>
        </radialGradient>
        <linearGradient id="border-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#F4511E"/>
          <stop offset="100%" stop-color="#FF8A65"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bg-grad)"/>
      <rect x="24" y="24" width="${width - 48}" height="${height - 48}" rx="24" fill="#FFFFFF" stroke="#E5E7EB" stroke-width="2"/>
      <rect x="24" y="24" width="${width - 48}" height="8" rx="4" fill="url(#border-grad)"/>
    </svg>
  `);

  const logoResized = await sharp(path.join(brandDir, 'topveda-logo-transparent.png'))
    .resize(760)
    .png()
    .toBuffer({ resolveWithObject: true });

  const logoLeft = Math.round((width - logoResized.info.width) / 2);
  const logoTop = Math.round((height - logoResized.info.height) / 2);

  const ogBuffer = await sharp(bgSvg)
    .composite([
      {
        input: logoResized.data,
        left: logoLeft,
        top: logoTop
      }
    ])
    .png()
    .toBuffer();

  fs.writeFileSync(path.join(publicDir, 'og-image.png'), ogBuffer);
  fs.writeFileSync(path.join(appDir, 'opengraph-image.png'), ogBuffer);
  console.log('Successfully created og-image.png (1200x630)');
}

createOgImage();
