// Generates assets/icon.png and assets/icon.ico for DropCode.
//
// Pure Node, no external dependencies: it hand-encodes a 256x256 RGBA PNG of a
// simple "drop" glyph and wraps the PNG bytes into an ICO container (Windows
// accepts PNG-encoded ICO entries). Run with: `npm run icon`.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 256;
const BG = [11, 11, 18, 255];
const ACCENT = [137, 180, 250, 255];
const RADIUS = 44;

const cx = SIZE / 2;
const cy = SIZE / 2;
// Downward "drop" triangle.
const tri = [
  [cx - 86, cy - 46],
  [cx + 86, cy - 46],
  [cx, cy + 84],
];

function sign(ax, ay, bx, by, px, py) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}

function inTriangle(px, py) {
  const d1 = sign(tri[0][0], tri[0][1], tri[1][0], tri[1][1], px, py);
  const d2 = sign(tri[1][0], tri[1][1], tri[2][0], tri[2][1], px, py);
  const d3 = sign(tri[2][0], tri[2][1], tri[0][0], tri[0][1], px, py);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

function pixel(x, y) {
  // Rounded-rectangle clip using distance from the nearest corner.
  const cornerX = Math.min(x, SIZE - 1 - x);
  const cornerY = Math.min(y, SIZE - 1 - y);
  if (cornerX < RADIUS && cornerY < RADIUS) {
    const dx = RADIUS - cornerX;
    const dy = RADIUS - cornerY;
    if (dx * dx + dy * dy > RADIUS * RADIUS) {
      return [0, 0, 0, 0]; // transparent outside the rounded corner
    }
  }
  return inTriangle(x, y) ? ACCENT : BG;
}

// ---- PNG encoding ----
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);
for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0; // filter: none
  for (let x = 0; x < SIZE; x++) {
    const [r, g, b, a] = pixel(x, y);
    const o = rowStart + 1 + x * 4;
    raw[o] = r;
    raw[o + 1] = g;
    raw[o + 2] = b;
    raw[o + 3] = a;
  }
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type RGBA
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const idat = deflateSync(raw);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
]);

// ---- ICO wrapping ----
const icondir = Buffer.alloc(6);
icondir.writeUInt16LE(0, 0); // reserved
icondir.writeUInt16LE(1, 2); // image type: icon
icondir.writeUInt16LE(1, 4); // count

const entry = Buffer.alloc(16);
entry.writeUInt8(0, 0); // width  (0 means 256)
entry.writeUInt8(0, 1); // height (0 means 256)
entry.writeUInt8(0, 2); // colours
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // colour planes
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(png.length, 8); // bytes in resource
entry.writeUInt32LE(22, 12); // offset to image data
const ico = Buffer.concat([icondir, entry, png]);

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'icon.png'), png);
writeFileSync(join(outDir, 'icon.ico'), ico);
console.log(`Wrote ${join(outDir, 'icon.png')} and ${join(outDir, 'icon.ico')}`);
