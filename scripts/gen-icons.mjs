// Regenerate the raster icons from the single source of truth, public/favicon.svg.
//
//   node scripts/gen-icons.mjs
//
// Produces:
//   public/favicon.ico   — real multi-resolution ICO (16/32/48 px, PNG-encoded
//                          frames) used as the legacy fallback for browsers that
//                          don't take the SVG favicon.
//   assets/profile.png   — 512x512 PNG for the GitHub org profile avatar and
//                          README badge. (assets/ is outside the Astro build, so
//                          it is not published to the website.)
//
// Run this whenever favicon.svg changes so the rasters stay in sync.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public', 'favicon.svg'));

// The mark has a transparent background (each shape carries its own thin dark
// outline for legibility), so the rasters keep the alpha channel intact.
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

const png = (size) =>
  sharp(svg, { density: 384 }) // high density so the vector is crisp when scaled
    .resize(size, size, { fit: 'contain', background: TRANSPARENT })
    .png()
    .toBuffer();

// Pack PNG frames into a real ICO container. Browsers and Windows (Vista+)
// accept PNG-encoded ICO entries, so we embed the PNGs verbatim.
function buildIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(frames.length, 4);

  const dir = Buffer.alloc(16 * frames.length);
  let offset = 6 + dir.length;
  frames.forEach((f, i) => {
    const e = i * 16;
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, e + 0); // 0 means 256
    dir.writeUInt8(f.size >= 256 ? 0 : f.size, e + 1);
    dir.writeUInt8(0, e + 2); // palette count
    dir.writeUInt8(0, e + 3); // reserved
    dir.writeUInt16LE(1, e + 4); // color planes
    dir.writeUInt16LE(32, e + 6); // bits per pixel
    dir.writeUInt32LE(f.data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += f.data.length;
  });

  return Buffer.concat([header, dir, ...frames.map((f) => f.data)]);
}

const icoSizes = [16, 32, 48];
const frames = await Promise.all(
  icoSizes.map(async (size) => ({ size, data: await png(size) }))
);
writeFileSync(join(root, 'public', 'favicon.ico'), buildIco(frames));
writeFileSync(join(root, 'assets', 'profile.png'), await png(512));

console.log(`Wrote public/favicon.ico (${icoSizes.join('/')} px) and assets/profile.png (512 px)`);
