// crmv1.46 — Faz 0: görsel karşılaştırma için asgari PNG çözücü.
//
// Neden gerekli: sıkıştırılmış PNG baytlarını karşılaştırmak yanlış sonuç
// verir. Aynı görüntü farklı uzunlukta kodlanabilir, tek piksellik bir
// değişiklik ise bütün akışı kaydırır. Ölçüm ancak ham piksel üzerinde
// anlamlıdır.
//
// Kapsam bilinçli olarak dar tutulmuştur: Chromium'un ürettiği PNG her zaman
// 8 bit, taramasız (non-interlaced) ve RGB/RGBA'dır. Desteklenmeyen bir
// biçimle karşılaşılırsa sessizce yanlış sonuç üretmek yerine hata atılır.
import zlib from "zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CHANNELS = { 0: 1, 2: 3, 4: 2, 6: 4 };

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("PNG imzası geçersiz.");

  let offset = 8;
  let header = null;
  const data = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      header = {
        width: body.readUInt32BE(0),
        height: body.readUInt32BE(4),
        depth: body[8],
        colorType: body[9],
        interlace: body[12]
      };
    } else if (type === "IDAT") {
      data.push(body);
    } else if (type === "IEND") {
      break;
    }
  }

  if (!header) throw new Error("PNG başlığı (IHDR) bulunamadı.");
  if (header.depth !== 8) throw new Error(`Desteklenmeyen bit derinliği: ${header.depth}`);
  if (header.interlace !== 0) throw new Error("Taramalı (interlaced) PNG desteklenmiyor.");

  const channels = CHANNELS[header.colorType];
  if (!channels) throw new Error(`Desteklenmeyen renk tipi: ${header.colorType}`);

  const raw = zlib.inflateSync(Buffer.concat(data));
  const stride = header.width * channels;
  const pixels = Buffer.alloc(stride * header.height);

  // Her tarama satırı kendi filtre baytıyla başlar; filtre bir önceki satıra ve
  // aynı satırdaki önceki piksele göre çözülür.
  for (let y = 0; y < header.height; y += 1) {
    const filter = raw[y * (stride + 1)];
    const source = raw.subarray(y * (stride + 1) + 1, y * (stride + 1) + 1 + stride);
    const target = pixels.subarray(y * stride, (y + 1) * stride);
    const above = y > 0 ? pixels.subarray((y - 1) * stride, y * stride) : null;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= channels ? target[x - channels] : 0;
      const up = above ? above[x] : 0;
      const upLeft = above && x >= channels ? above[x - channels] : 0;
      const value = source[x];
      if (filter === 0) target[x] = value;
      else if (filter === 1) target[x] = (value + left) & 255;
      else if (filter === 2) target[x] = (value + up) & 255;
      else if (filter === 3) target[x] = (value + ((left + up) >> 1)) & 255;
      else if (filter === 4) target[x] = (value + paeth(left, up, upLeft)) & 255;
      else throw new Error(`Bilinmeyen tarama filtresi: ${filter}`);
    }
  }

  return { width: header.width, height: header.height, channels, pixels };
}

// Farklı boyuttaki iki görüntü karşılaştırılamaz; bu durum yerleşimin
// değiştiğinin kendisi zaten kanıtıdır ve %100 fark olarak raporlanır.
export function pixelDiff(a, b, threshold = 12) {
  if (a.width !== b.width || a.height !== b.height || a.channels !== b.channels) {
    return { ratio: 100, reason: `${a.width}×${a.height} ≠ ${b.width}×${b.height}` };
  }
  const total = a.width * a.height;
  let differing = 0;
  for (let index = 0; index < total; index += 1) {
    const base = index * a.channels;
    let delta = 0;
    // Alfa kanalı dışındaki kanallarda en büyük sapma alınır; yazı tipi
    // pürüzlendirmesinin bıraktığı birkaç tonluk oynama eşiğin altında kalır.
    for (let channel = 0; channel < Math.min(3, a.channels); channel += 1) {
      delta = Math.max(delta, Math.abs(a.pixels[base + channel] - b.pixels[base + channel]));
    }
    if (delta > threshold) differing += 1;
  }
  return { ratio: (differing / total) * 100, reason: `${differing}/${total} piksel` };
}
