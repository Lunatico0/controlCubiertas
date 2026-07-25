/**
 * gen-installer-bmp.js
 * ---------------------------------------------------------------------------
 * Genera los bitmaps branded del instalador NSIS de TireOps SIN dependencias
 * externas (solo `fs` + `zlib`, ambos nativos de Node). electron-builder /
 * NSIS exige estos bitmaps en formato BMP3 de 24-bit, bottom-up, sin canal
 * alfa:
 *
 *   - desktop/installerSidebar.bmp  -> 164x314  (welcome/finish page, MUI_WELCOMEFINISHPAGE_BITMAP)
 *   - desktop/installerHeader.bmp   -> 150x57   (header de paginas internas, MUI_HEADERIMAGE_BITMAP)
 *
 * En vez del feo sidebar gris "nsis3-metro" por defecto, componemos un fondo
 * oscuro de marca (#0A0C0D -> #0f1216) con un glow lima (#C4ED2B) que sube
 * desde abajo y el logo real de TireOps (extraido del PNG 256x256 embebido en
 * desktop/build/TireOps.ico) centrado arriba.
 *
 * Como no hay `sharp` disponible en node_modules, implementamos a mano:
 *   1. Un decoder de PNG (colorType 2/3/6, bitDepth 8) via zlib.inflateSync.
 *   2. Un downscale RGBA por promediado de area con alpha premultiplicado
 *      (evita halos oscuros en los bordes del logo).
 *   3. Composicion alpha del logo sobre el fondo.
 *   4. Un encoder BMP3 de 24-bit.
 *
 * (Extra) Si se pasa `--png`, tambien exporta previews PNG a scratchpad para
 * inspeccion visual. No es necesario para el build.
 *
 * Regenerar:  node desktop/scripts/gen-installer-bmp.js
 * ---------------------------------------------------------------------------
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.resolve(__dirname, '..', '..'); // repo root (donde vive package.json)
const DESKTOP = path.join(ROOT, 'desktop');
const ICO = path.join(DESKTOP, 'build', 'TireOps.ico');

// -------- Paleta de marca --------
const TOP = [10, 12, 13];      // #0A0C0D
const MID = [15, 18, 22];      // #0f1216
const BOTTOM = [12, 16, 14];   // dark con leve tinte verde
const LIME = [196, 237, 43];   // #C4ED2B

const clamp = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------------
// 1) Extraer el PNG embebido dentro de un .ico (type 1, primera entrada PNG)
// ---------------------------------------------------------------------------
function extractPngFromIco(icoPath) {
  const b = fs.readFileSync(icoPath);
  const count = b.readUInt16LE(4);
  for (let i = 0; i < count; i++) {
    const e = 6 + i * 16;
    const bytes = b.readUInt32LE(e + 8);
    const off = b.readUInt32LE(e + 12);
    const slice = b.subarray(off, off + bytes);
    if (slice.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return slice;
  }
  throw new Error('No se encontro un PNG embebido en ' + icoPath);
}

// ---------------------------------------------------------------------------
// 2) Decoder PNG minimal -> {width, height, data:RGBA}
// ---------------------------------------------------------------------------
function decodePNG(buf) {
  if (buf.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('firma PNG invalida');
  let p = 8;
  let width, height, bitDepth, colorType;
  let palette = null, trns = null;
  const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.subarray(p + 4, p + 8).toString('ascii');
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === 'PLTE') palette = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    p += 12 + len;
  }
  if (bitDepth !== 8) throw new Error('solo bitDepth 8 soportado, se recibio ' + bitDepth);

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : colorType === 3 ? 1 : 0;
  if (!channels) throw new Error('colorType no soportado: ' + colorType);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const out = Buffer.alloc(width * height * 4);
  let prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  let pos = 0;

  for (let y = 0; y < height; y++) {
    const filter = raw[pos++];
    for (let i = 0; i < stride; i++) {
      const x = raw[pos++];
      const a = i >= channels ? cur[i - channels] : 0; // izquierda
      const b = prev[i];                                // arriba
      const c = i >= channels ? prev[i - channels] : 0; // arriba-izquierda
      let val;
      switch (filter) {
        case 0: val = x; break;
        case 1: val = x + a; break;
        case 2: val = x + b; break;
        case 3: val = x + ((a + b) >> 1); break;
        case 4: {
          const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
          const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
          val = x + pred; break;
        }
        default: throw new Error('filtro PNG desconocido: ' + filter);
      }
      cur[i] = val & 0xff;
    }
    for (let x = 0; x < width; x++) {
      let r, g, bl, al;
      if (colorType === 6) { r = cur[x * 4]; g = cur[x * 4 + 1]; bl = cur[x * 4 + 2]; al = cur[x * 4 + 3]; }
      else if (colorType === 2) { r = cur[x * 3]; g = cur[x * 3 + 1]; bl = cur[x * 3 + 2]; al = 255; }
      else if (colorType === 0) { r = g = bl = cur[x]; al = 255; }
      else { const idx = cur[x]; r = palette[idx * 3]; g = palette[idx * 3 + 1]; bl = palette[idx * 3 + 2]; al = trns && idx < trns.length ? trns[idx] : 255; }
      const o = (y * width + x) * 4;
      out[o] = r; out[o + 1] = g; out[o + 2] = bl; out[o + 3] = al;
    }
    cur.copy(prev);
  }
  return { width, height, data: out };
}

// ---------------------------------------------------------------------------
// 3) Downscale RGBA por promediado de area con alpha premultiplicado
// ---------------------------------------------------------------------------
function resizeRGBA(src, sw, sh, dw, dh) {
  const out = Buffer.alloc(dw * dh * 4);
  for (let dy = 0; dy < dh; dy++) {
    const sy0 = Math.floor((dy * sh) / dh);
    const sy1 = Math.max(sy0 + 1, Math.floor(((dy + 1) * sh) / dh));
    for (let dx = 0; dx < dw; dx++) {
      const sx0 = Math.floor((dx * sw) / dw);
      const sx1 = Math.max(sx0 + 1, Math.floor(((dx + 1) * sw) / dw));
      let rs = 0, gs = 0, bs = 0, asum = 0, n = 0;
      for (let sy = sy0; sy < sy1; sy++) {
        for (let sx = sx0; sx < sx1; sx++) {
          const o = (sy * sw + sx) * 4;
          const af = src[o + 3] / 255;
          rs += src[o] * af; gs += src[o + 1] * af; bs += src[o + 2] * af;
          asum += src[o + 3]; n++;
        }
      }
      const aw = asum / 255; // peso alpha total
      const o = (dy * dw + dx) * 4;
      out[o] = aw > 0 ? Math.round(rs / aw) : 0;
      out[o + 1] = aw > 0 ? Math.round(gs / aw) : 0;
      out[o + 2] = aw > 0 ? Math.round(bs / aw) : 0;
      out[o + 3] = Math.round(asum / n);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4) Canvas RGB (Float) con gradiente + glows, luego composicion del logo
// ---------------------------------------------------------------------------
function buildSidebar(logo) {
  const W = 164, H = 314;
  const px = new Float64Array(W * H * 3);

  // gradiente vertical: TOP -> MID (60%) -> BOTTOM (resto)
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1);
    let base;
    if (t < 0.6) { const k = t / 0.6; base = [lerp(TOP[0], MID[0], k), lerp(TOP[1], MID[1], k), lerp(TOP[2], MID[2], k)]; }
    else { const k = (t - 0.6) / 0.4; base = [lerp(MID[0], BOTTOM[0], k), lerp(MID[1], BOTTOM[1], k), lerp(MID[2], BOTTOM[2], k)]; }
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 3;
      px[o] = base[0]; px[o + 1] = base[1]; px[o + 2] = base[2];
    }
  }

  // glow lima que sube desde abajo-centro
  const gcx = W / 2, gcy = 300, gR = 150, gStrength = 0.28;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - gcx, dy = y - gcy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const g = Math.exp(-(d * d) / (gR * gR)) * gStrength;
      if (g > 0.001) {
        const o = (y * W + x) * 3;
        px[o] = clamp(px[o] + LIME[0] * g);
        px[o + 1] = clamp(px[o + 1] + LIME[1] * g);
        px[o + 2] = clamp(px[o + 2] + LIME[2] * g);
      }
    }
  }

  // halo suave frio detras del logo (leve realce)
  const hcx = W / 2, hcy = 122, hR = 96, hStr = 0.05;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dx = x - hcx, dy = y - hcy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const h = Math.exp(-(d * d) / (hR * hR)) * hStr;
      if (h > 0.001) {
        const o = (y * W + x) * 3;
        px[o] = clamp(px[o] + 210 * h);
        px[o + 1] = clamp(px[o + 1] + 230 * h);
        px[o + 2] = clamp(px[o + 2] + 200 * h);
      }
    }
  }

  // logo centrado arriba
  const LW = 116, LH = 116;
  const small = resizeRGBA(logo.data, logo.width, logo.height, LW, LH);
  const lx = Math.round((W - LW) / 2), ly = 60;
  for (let y = 0; y < LH; y++) {
    for (let x = 0; x < LW; x++) {
      const s = (y * LW + x) * 4;
      const a = small[s + 3] / 255;
      if (a <= 0) continue;
      const o = ((ly + y) * W + (lx + x)) * 3;
      px[o] = clamp(small[s] * a + px[o] * (1 - a));
      px[o + 1] = clamp(small[s + 1] * a + px[o + 1] * (1 - a));
      px[o + 2] = clamp(small[s + 2] * a + px[o + 2] * (1 - a));
    }
  }

  // linea de acento lima debajo del logo (fade horizontal en los extremos)
  const accY = 196, accX0 = 24, accX1 = W - 24;
  for (let yy = accY; yy < accY + 2; yy++) {
    for (let x = accX0; x < accX1; x++) {
      const mid = (accX0 + accX1) / 2;
      const fade = 1 - Math.abs(x - mid) / (mid - accX0); // 1 al centro -> 0 en extremos
      const a = Math.max(0, fade) * 0.9;
      const o = (yy * W + x) * 3;
      px[o] = clamp(LIME[0] * a + px[o] * (1 - a));
      px[o + 1] = clamp(LIME[1] * a + px[o + 1] * (1 - a));
      px[o + 2] = clamp(LIME[2] * a + px[o + 2] * (1 - a));
    }
  }

  return { W, H, px };
}

function buildHeader(logo) {
  const W = 150, H = 57;
  const px = new Float64Array(W * H * 3);
  // gradiente horizontal oscuro
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = x / (W - 1);
      const o = (y * W + x) * 3;
      px[o] = lerp(TOP[0], MID[0], t);
      px[o + 1] = lerp(TOP[1], MID[1], t);
      px[o + 2] = lerp(TOP[2], MID[2], t);
    }
  }
  // logo chico a la derecha (MUI header es right-aligned por defecto)
  const LW = 44, LH = 44;
  const small = resizeRGBA(logo.data, logo.width, logo.height, LW, LH);
  const lx = W - LW - 8, ly = Math.round((H - LH) / 2);
  for (let y = 0; y < LH; y++) {
    for (let x = 0; x < LW; x++) {
      const s = (y * LW + x) * 4;
      const a = small[s + 3] / 255;
      if (a <= 0) continue;
      const o = ((ly + y) * W + (lx + x)) * 3;
      px[o] = clamp(small[s] * a + px[o] * (1 - a));
      px[o + 1] = clamp(small[s + 1] * a + px[o + 1] * (1 - a));
      px[o + 2] = clamp(small[s + 2] * a + px[o + 2] * (1 - a));
    }
  }
  // linea de acento lima en el borde inferior
  for (let x = 0; x < W; x++) {
    const o = ((H - 1) * W + x) * 3;
    px[o] = LIME[0]; px[o + 1] = LIME[1]; px[o + 2] = LIME[2];
  }
  return { W, H, px };
}

// ---------------------------------------------------------------------------
// 5) Encoder BMP3 24-bit (bottom-up, filas con padding a multiplo de 4)
// ---------------------------------------------------------------------------
function writeBMP24(px, W, H, outPath) {
  const rowSize = Math.ceil((W * 3) / 4) * 4; // padding a 4 bytes
  const pixelArraySize = rowSize * H;
  const fileSize = 54 + pixelArraySize;
  const buf = Buffer.alloc(fileSize);
  // BITMAPFILEHEADER (14)
  buf.write('BM', 0, 'ascii');
  buf.writeUInt32LE(fileSize, 2);
  buf.writeUInt32LE(0, 6);
  buf.writeUInt32LE(54, 10);
  // BITMAPINFOHEADER (40)
  buf.writeUInt32LE(40, 14);
  buf.writeInt32LE(W, 18);
  buf.writeInt32LE(H, 22); // positivo => bottom-up
  buf.writeUInt16LE(1, 26);
  buf.writeUInt16LE(24, 28);
  buf.writeUInt32LE(0, 30); // BI_RGB
  buf.writeUInt32LE(pixelArraySize, 34);
  buf.writeInt32LE(2835, 38); // ~72 DPI
  buf.writeInt32LE(2835, 42);
  buf.writeUInt32LE(0, 46);
  buf.writeUInt32LE(0, 50);
  // pixel array: primera fila del archivo = fila inferior de la imagen
  for (let r = 0; r < H; r++) {
    const y = H - 1 - r;
    let off = 54 + r * rowSize;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      buf[off++] = clamp(Math.round(px[i + 2])); // B
      buf[off++] = clamp(Math.round(px[i + 1])); // G
      buf[off++] = clamp(Math.round(px[i]));     // R
    }
  }
  fs.writeFileSync(outPath, buf);
  return { rowSize, fileSize };
}

// -------- (opcional) encoder PNG para preview visual --------
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function writePNGpreview(px, W, H, outPath) {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  let p = 0;
  for (let y = 0; y < H; y++) {
    raw[p++] = 0; // filter none
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 3;
      raw[p++] = clamp(Math.round(px[i]));
      raw[p++] = clamp(Math.round(px[i + 1]));
      raw[p++] = clamp(Math.round(px[i + 2]));
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  const png = Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(outPath, png);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
function main() {
  const wantPng = process.argv.includes('--png');
  const logo = decodePNG(extractPngFromIco(ICO));
  console.log(`Logo extraido de TireOps.ico: ${logo.width}x${logo.height} RGBA`);

  const sidebar = buildSidebar(logo);
  const sPath = path.join(DESKTOP, 'installerSidebar.bmp');
  const sInfo = writeBMP24(sidebar.px, sidebar.W, sidebar.H, sPath);
  console.log(`OK  ${sPath}  (${sidebar.W}x${sidebar.H}, 24-bit, ${sInfo.fileSize} bytes)`);

  const header = buildHeader(logo);
  const hPath = path.join(DESKTOP, 'installerHeader.bmp');
  const hInfo = writeBMP24(header.px, header.W, header.H, hPath);
  console.log(`OK  ${hPath}  (${header.W}x${header.H}, 24-bit, ${hInfo.fileSize} bytes)`);

  if (wantPng) {
    const dir = process.env.PREVIEW_DIR || DESKTOP;
    writePNGpreview(sidebar.px, sidebar.W, sidebar.H, path.join(dir, 'installerSidebar.preview.png'));
    writePNGpreview(header.px, header.W, header.H, path.join(dir, 'installerHeader.preview.png'));
    console.log('Previews PNG escritos en ' + dir);
  }
}

main();
