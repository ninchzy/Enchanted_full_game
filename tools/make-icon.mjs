// Makes the app icon from the skeleton's skull (SKULL_FRONT in src/gfx/characters.js):
// build/icon.png (256px) and build/icon.ico (16 to 256px), each pixel scaled up by a whole
// number so it stays crisp. Run it again after changing the skull:
//   node tools/make-icon.mjs
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { SKULL_FRONT, BONE } from '../src/gfx/characters.js';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'build');
const GRID = 16; // the skull is centred on a 16x16 grid, then scaled up
const SHADE_FROM = 15; // as in the game: bones right of this column catch less light (shadeRight)
const SIZES = [16, 32, 48, 64, 128, 256];

const rgb = (css) => [1, 3, 5].map((i) => parseInt(css.slice(i, i + 2), 16));

/** the skull as a GRID x GRID array of [r, g, b, a] */
function skullPixels() {
  const cols = SKULL_FRONT.map((row) => [...row].map((ch, x) => (ch === '.' ? -1 : x)).filter((x) => x >= 0));
  const minX = Math.min(...cols.flat());
  const maxX = Math.max(...cols.flat());
  const ox = Math.floor((GRID - (maxX - minX + 1)) / 2) - minX;
  const oy = Math.floor((GRID - SKULL_FRONT.length) / 2);
  const px = Array.from({ length: GRID * GRID }, () => [0, 0, 0, 0]);
  SKULL_FRONT.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      let ch = row[x];
      if (ch === '.') continue;
      if (ch === 'w' && x >= SHADE_FROM) ch = 'l';
      px[(y + oy) * GRID + x + ox] = [...rgb(BONE[ch]), 255];
    }
  });
  return px;
}

const CRC = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function png(pixels, size) {
  const scale = size / GRID;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 4 + 1);
    for (let x = 0; x < size; x++) {
      const p = pixels[Math.floor(y / scale) * GRID + Math.floor(x / scale)];
      for (let i = 0; i < 4; i++) raw[row + 1 + x * 4 + i] = p[i];
    }
  }
  const head = Buffer.alloc(13);
  head.writeUInt32BE(size, 0);
  head.writeUInt32BE(size, 4);
  head[8] = 8; // bit depth
  head[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', head),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** an .ico holding one PNG per size (fine for every Windows since Vista) */
function ico(images) {
  const dir = Buffer.alloc(6 + 16 * images.length);
  dir.writeUInt16LE(1, 2); // type: icon
  dir.writeUInt16LE(images.length, 4);
  let offset = dir.length;
  images.forEach(({ size, data }, i) => {
    const e = 6 + 16 * i;
    dir[e] = size % 256; // 0 means 256
    dir[e + 1] = size % 256;
    dir.writeUInt16LE(1, e + 4); // planes
    dir.writeUInt16LE(32, e + 6); // bits per pixel
    dir.writeUInt32LE(data.length, e + 8);
    dir.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });
  return Buffer.concat([dir, ...images.map((im) => im.data)]);
}

const pixels = skullPixels();
const images = SIZES.map((size) => ({ size, data: png(pixels, size) }));
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), images.at(-1).data);
fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico(images));
console.log('wrote build/icon.png and build/icon.ico');
