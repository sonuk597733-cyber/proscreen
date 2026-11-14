import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[i] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const c = crc32(typeAndData);
  chunk.writeUInt32BE(c, 8 + len);
  return chunk;
}

function createPng(width, height, getPixel) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // Deflate
  ihdrData[11] = 0; // Filter method
  ihdrData[12] = 0; // No interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // Raw image data: height rows, each with 1 filter byte (0) + width * 4 bytes
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // Filter byte: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const idat = makeChunk('IDAT', compressed);
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

// Generate 512x512 ProScreen Icon
const size = 512;
const pngBuf = createPng(size, size, (x, y, w, h) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = 220; // Corner radius squircle

  // Normalize -1 to 1
  const nx = (x - cx) / (w / 2);
  const ny = (y - cy) / (h / 2);
  // Squircle equation: |x|^3.5 + |y|^3.5 <= 0.82
  const d = Math.pow(Math.abs(nx), 3.5) + Math.pow(Math.abs(ny), 3.5);

  if (d > 0.85) {
    return [0, 0, 0, 0]; // Transparent background
  }

  // Border gradient
  if (d > 0.78) {
    const t = (x + y) / (w + h);
    // Cyan to Violet
    const r = Math.round(14 + t * (99 - 14));
    const g = Math.round(165 + t * (102 - 165));
    const b = Math.round(233 + t * (241 - 233));
    return [r, g, b, 255];
  }

  // Dark interior surface
  const grad = Math.round(18 + ((y / h) * 12));
  let baseR = grad, baseG = grad + 4, baseB = grad + 12;

  // Stylus / Pen icon drawing across center
  // Line from (140, 372) to (372, 140)
  const px = x - 140;
  const py = y - 372;
  const lineLen = Math.hypot(232, -232);
  const dirX = 232 / lineLen;
  const dirY = -232 / lineLen;
  const proj = px * dirX + py * dirY;
  const perp = Math.abs(px * -dirY + py * dirX);

  if (proj >= -10 && proj <= lineLen + 20 && perp <= 28) {
    // Stylus body
    if (perp <= 18) {
      return [14, 165, 233, 255]; // Vivid Sky Blue
    } else {
      return [99, 102, 241, 255]; // Indigo rim
    }
  }

  // Stylus tip nib
  if (proj >= -36 && proj < -10 && perp <= (proj + 36) * 0.7) {
    return [248, 250, 252, 255]; // Bright white nib
  }

  // Stylus laser dot at nib tip
  const distTip = Math.hypot(x - 120, y - 392);
  if (distTip <= 16) {
    return [239, 68, 68, 255]; // Laser Red
  }

  return [baseR, baseG, baseB, 255];
});

const iconsDir = path.resolve('public/icons');
fs.writeFileSync(path.join(iconsDir, 'icon512.png'), pngBuf);
fs.writeFileSync(path.join(iconsDir, 'icon256.png'), pngBuf);
console.log('Generated icon256.png and icon512.png successfully!');
