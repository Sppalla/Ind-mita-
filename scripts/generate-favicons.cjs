const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Tabela CRC32 padrão para PNG
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  typeBuf.copy(chunk, 4);
  data.copy(chunk, 8);
  const crcBuf = Buffer.concat([typeBuf, data]);
  chunk.writeUInt32BE(crc32(crcBuf), 8 + len);
  return chunk;
}

function encodePNG(w, h, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const stride = w * 4;
  const rawScanlines = Buffer.alloc(h * (stride + 1));
  let dst = 0;
  for (let y = 0; y < h; y++) {
    rawScanlines[dst++] = 0; // filter type None
    rgba.copy(rawScanlines, dst, y * stride, (y + 1) * stride);
    dst += stride;
  }

  const idatData = zlib.deflateSync(rawScanlines, { level: 9 });
  return Buffer.concat([
    sig,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', idatData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

function readPNG(filePath) {
  const buf = fs.readFileSync(filePath);
  let pos = 8;
  let idats = [];
  let w = 0, h = 0;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    if (type === 'IHDR') {
      w = buf.readUInt32BE(pos + 8);
      h = buf.readUInt32BE(pos + 12);
    } else if (type === 'IDAT') {
      idats.push(buf.slice(pos + 8, pos + 8 + len));
    }
    pos += 12 + len;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idats));
  const stride = w * 4;
  const raw = Buffer.alloc(w * h * 4);
  let srcPos = 0;
  for (let y = 0; y < h; y++) {
    const filter = decompressed[srcPos++];
    for (let x = 0; x < stride; x++) {
      const b = decompressed[srcPos++];
      let a = x >= 4 ? raw[y * stride + x - 4] : 0;
      let c = y > 0 ? raw[(y - 1) * stride + x] : 0;
      let d = (y > 0 && x >= 4) ? raw[(y - 1) * stride + x - 4] : 0;
      let val = b;
      if (filter === 1) val = (b + a) & 0xff;
      else if (filter === 2) val = (b + c) & 0xff;
      else if (filter === 3) val = (b + Math.floor((a + c) / 2)) & 0xff;
      else if (filter === 4) {
        const p = a + c - d;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - c);
        const pc = Math.abs(p - d);
        let pr = (pa <= pb && pa <= pc) ? a : (pb <= pc ? c : d);
        val = (b + pr) & 0xff;
      }
      raw[y * stride + x] = val;
    }
  }
  return { w, h, raw };
}

// Area averaging preserves thin illustration strokes when reducing 900px to 32px.
// Premultiplied alpha avoids pale fringes on transparent edges.
function resizeRGBA(src, sw, sh, dw, dh) {
  const dst = Buffer.alloc(dw * dh * 4);
  for (let y=0;y<dh;y++) for(let x=0;x<dw;x++) {
    const x0=x*sw/dw,x1=(x+1)*sw/dw,y0=y*sh/dh,y1=(y+1)*sh/dh;
    let alpha=0, weight=0; const rgb=[0,0,0];
    for(let sy=Math.floor(y0);sy<Math.ceil(y1);sy++) for(let sx=Math.floor(x0);sx<Math.ceil(x1);sx++) {
      const w=(Math.min(x1,sx+1)-Math.max(x0,sx))*(Math.min(y1,sy+1)-Math.max(y0,sy));
      const i=(sy*sw+sx)*4, aw=w*src[i+3]/255;
      weight+=w; alpha+=aw;
      for(let c=0;c<3;c++) rgb[c]+=src[i+c]*aw;
    }
    const i=(y*dw+x)*4;
    for(let c=0;c<3;c++) dst[i+c]=alpha ? Math.round(rgb[c]/alpha) : 0;
    dst[i+3]=Math.round(255*alpha/weight);
  }
  return dst;
}

// Distância euclidiana de cor RGB
function colorDist(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

// Gera versão transparente para a loja com halo sutil dourado/iluminado para dark mode
function makeStorefrontFavicon(srcRaw, w, h) {
  const out = Buffer.from(srcRaw);
  const bgR = 250, bgG = 240, bgB = 230; // #FAF0E6

  // Passo 1: Remoção de fundo por distância com feathering
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    const r = out[idx];
    const g = out[idx + 1];
    const b = out[idx + 2];
    // Recover coverage between the known cream background and brown ink.
    // Replace contaminated edge RGB with ink rather than leaving JPEG background colors.
    const ink = [69, 57, 45], bg = [bgR,bgG,bgB];
    const observed = [r,g,b];
    let numerator=0,denominator=0;
    for(let c=0;c<3;c++) { numerator+=(bg[c]-observed[c])*(bg[c]-ink[c]); denominator+=(bg[c]-ink[c])**2; }
    const coverage=Math.max(0,Math.min(1,(numerator/denominator-0.015)/0.985));
    out[idx]=ink[0]; out[idx+1]=ink[1]; out[idx+2]=ink[2];
    out[idx+3]=Math.round(out[idx+3]*coverage);
  }

  // Passo 2: Adiciona halo dourado suave (#CDA06B) para contraste em abas escuras
  // Cria uma cópia para ler a máscara
  const mask = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) {
    mask[i] = out[i * 4 + 3];
  }

  // Dilatação de 1-2 pixels para gerar o contorno de suporte no dark mode
  const halo = Buffer.alloc(w * h * 4);
  const radius = Math.max(1, Math.round(w / 64));

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const currentAlpha = out[idx + 3];

      if (currentAlpha > 0) {
        // Pixel do traço original - preserva cor original
        halo[idx] = out[idx];
        halo[idx + 1] = out[idx + 1];
        halo[idx + 2] = out[idx + 2];
        halo[idx + 3] = out[idx + 3];
      } else {
        // Verifica se é vizinho de um traço para colocar o halo sutil
        let maxNeighbor = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          const ny = y + dy;
          if (ny < 0 || ny >= h) continue;
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            if (nx < 0 || nx >= w) continue;
            const distSq = dx * dx + dy * dy;
            if (distSq <= radius * radius) {
              const a = mask[ny * w + nx];
              if (a > maxNeighbor) maxNeighbor = a;
            }
          }
        }

        if (maxNeighbor > 40) {
          // Halo dourado acetinado (#E6D0BD misturado com #CDA06B)
          halo[idx] = 205;   // #CD
          halo[idx + 1] = 160; // #A0
          halo[idx + 2] = 107; // #6B
          halo[idx + 3] = Math.round((maxNeighbor / 255) * 110); // opacidade moderada suave
        }
      }
    }
  }

  return halo;
}

// Gera versão com selo circular (para o Admin)
function makeAdminBadgeFavicon(srcRaw, w, h) {
  const out = Buffer.from(srcRaw);
  const cx = w / 2;
  const cy = h / 2;
  const r = (w / 2) - 2;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > r) {
        if (dist > r + 1.5) {
          out[idx + 3] = 0;
        } else {
          out[idx + 3] = Math.round(255 * (1 - (dist - r) / 1.5));
        }
      }
    }
  }
  return out;
}

// Execução principal
const logoPath = path.resolve(__dirname, '../indomita-loja/public/logo-mark.png');
const { w, h, raw } = readPNG(logoPath);
console.log('Lendo imagem base:', w, 'x', h);

// 1. Loja: Silhueta com transparência + halo de dark mode
const storeSource = makeStorefrontFavicon(raw, w, h);
const storeWithHalo = resizeRGBA(storeSource, w, h, 64, 64);
const store32 = resizeRGBA(storeWithHalo, 64, 64, 32, 32);

fs.writeFileSync(
  path.resolve(__dirname, '../indomita-loja/public/favicon.png'),
  encodePNG(64, 64, storeWithHalo)
);
fs.writeFileSync(
  path.resolve(__dirname, '../indomita-loja/public/favicon-32.png'),
  encodePNG(32, 32, store32)
);
console.log('✓ Favicons da loja (transparente com suporte a dark mode) gerados com sucesso!');

// 2. Admin: Selo circular com fundo
const admin64 = resizeRGBA(raw, w, h, 64, 64);
const adminBadge = makeAdminBadgeFavicon(admin64, 64, 64);
const admin32 = resizeRGBA(adminBadge, 64, 64, 32, 32);

fs.writeFileSync(
  path.resolve(__dirname, '../indomita-painel/public/favicon.png'),
  encodePNG(64, 64, adminBadge)
);
fs.writeFileSync(
  path.resolve(__dirname, '../indomita-painel/public/favicon-32.png'),
  encodePNG(32, 32, admin32)
);
console.log('✓ Favicons do painel (selo circular completo) gerados com sucesso!');

// 3. Gera favicon.svg para ambos os projetos
const storeDark = Buffer.from(storeWithHalo);
for(let i=0;i<64*64;i++) { storeDark[i*4]=205;storeDark[i*4+1]=160;storeDark[i*4+2]=107;storeDark[i*4+3]=Math.min(255,Math.round(storeDark[i*4+3]*2)); }
const darkBase64=encodePNG(64,64,storeDark).toString('base64');
const lojaBase64 = fs.readFileSync(path.resolve(__dirname, '../indomita-loja/public/favicon.png')).toString('base64');
const lojaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><style>.dark{display:none}@media(prefers-color-scheme:dark){.light{display:none}.dark{display:block}}</style><image class="light" href="data:image/png;base64,${lojaBase64}" width="64" height="64"/><image class="dark" href="data:image/png;base64,${darkBase64}" width="64" height="64"/></svg>`;
fs.writeFileSync(path.resolve(__dirname, '../indomita-loja/public/favicon.svg'), lojaSvg);

const adminBase64 = fs.readFileSync(path.resolve(__dirname, '../indomita-painel/public/favicon.png')).toString('base64');
const adminSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><image href="data:image/png;base64,${adminBase64}" width="64" height="64"/></svg>`;
fs.writeFileSync(path.resolve(__dirname, '../indomita-painel/public/favicon.svg'), adminSvg);
console.log('✓ favicon.svg atualizado para loja e painel!');

// Visual QA contact sheet: columns are store/panel, rows light/dark, at 16/32/64px.
const preview = Buffer.alloc(400*240*4);
for(let y=0;y<240;y++) for(let x=0;x<400;x++) {
 const c=y<120 ? [250,240,230] : [32,33,36], i=(y*400+x)*4;
 preview[i]=c[0];preview[i+1]=c[1];preview[i+2]=c[2];preview[i+3]=255;
}
for(let row=0;row<2;row++) for(let col=0;col<2;col++) for(const [n,size] of [16,32,64].entries()) {
 const src=resizeRGBA(col===0?(row===0?storeWithHalo:storeDark):adminBadge,64,64,size,size);
 const ox=col*200+12+n*55, oy=row*120+25;
 for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
  const si=(y*size+x)*4,di=((oy+y)*400+ox+x)*4,a=src[si+3]/255;
  for(let c=0;c<3;c++) preview[di+c]=Math.round(src[si+c]*a+preview[di+c]*(1-a));
 }
}
fs.writeFileSync(path.resolve(__dirname,'favicon-preview.png'),encodePNG(400,240,preview));
