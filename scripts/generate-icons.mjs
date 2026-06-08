import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const iconsDir = join(root, 'public', 'icons');

mkdirSync(iconsDir, { recursive: true });

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="115" fill="#f97316"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
    font-family="Georgia,serif" font-weight="700" font-size="300" fill="white">N</text>
</svg>`;

const svgBuf = Buffer.from(SVG);

// PNG sizes
const sizes = [16, 32, 48, 64, 128, 256, 512];
const pngBuffers = {};

for (const size of sizes) {
  const buf = await sharp(svgBuf, { density: 300 })
    .resize(size, size)
    .png()
    .toBuffer();
  pngBuffers[size] = buf;
  writeFileSync(join(iconsDir, `icon-${size}.png`), buf);
  console.log(`  icon-${size}.png`);
}

// Main PNG for Mac (512x512)
writeFileSync(join(iconsDir, 'icon-512.png'), pngBuffers[512]);
writeFileSync(join(iconsDir, 'icon-192.png'), pngBuffers[256]);

// ICO for Windows (contains 16, 32, 48, 256)
const icoSizes = [16, 32, 48, 256].map(s => pngBuffers[s]);
const ico = await pngToIco(icoSizes);
writeFileSync(join(iconsDir, 'icon.ico'), ico);
console.log('  icon.ico');

console.log('\nIkony vygenerované!');
