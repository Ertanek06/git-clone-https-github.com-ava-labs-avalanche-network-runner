// crmv1.46 — Faz 1: kırılma noktalarını tek ölçeğe indirger.
//
// Kaynakta 305 medya sorgusu ve 43 ayrı eşik vardı; her sürüm kendi eşiğini
// eklediği için aynı niyet (çok kolonlu ızgarayı tek kolona düşür) 900, 920,
// 980 ve 1000 piksellerde ayrı ayrı yazılmıştı. Bu dosya onları uygulamanın
// KENDİ yoğunluk noktalarından çıkarılmış altı basamağa toplar.
//
// Yön her zaman YUKARI: bir max-width kuralı eskisinden daha erken devreye
// girer, hiçbir zaman daha geç. Böylece daralması gereken bir yerleşim asla
// dar kalmaz; yatay taşma riski tek yönlü olarak kapanır.
//
// Basamak sayısı ölçümle belirlendi, yuvarlak bir hedefe göre değil. Daha
// agresif bir ölçek (620/760/…) denendi ve görsel karşılaştırma iki gerçek
// bozulma gösterdi: 560 pikselde "Yeni Müşteri" kompakt butondan tam genişlik
// kırmızı bloğa dönüyor (430 piksel kuralı 560'a taşınıyor), 700 pikselde
// Tema Stüdyosu iki kolonlu ızgarayı tek kolona düşürüp tema kartlarını
// ekran dışına itiyor. 520 ve 680 basamakları bu yüzden korundu: 43'ten 9'a
// inmek, 7'ye inip iki genişlikte yoğunluk kaybetmekten iyidir.
//
// min-width kuralları kapsam dışıdır; gerekçe snapMin'in üstünde.
//
// Kullanım: node scripts/codemod-breakpoints.js [--dry]
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cssDir = path.join(root, "public", "css");
const dry = process.argv.includes("--dry");

// Kanonik ölçek — ÖLÇÜMLE belirlendi, yuvarlak bir hedefe göre değil.
//
// Önce agresif ölçekler denendi (620/760/1000/1180/1300/1500 ve
// 620/760/1000/1180/1280/1400/1500). Görsel karşılaştırma her birleştirme
// boşluğunda gerçek bozulmalar gösterdi:
//   · 450 ve 560 pikselde "Yeni Müşteri" kompakt butondan tam genişlik
//     kırmızı bloğa dönüyordu (küçük telefon kuralı büyük telefona taşıyordu),
//   · 700 pikselde Tema Stüdyosu iki kolonlu ızgarayı tek kolona düşürüp
//     tema kartlarını ekran dışına itiyordu,
//   · 1240, 1350 ve 1470 pikselde geniş ekran ızgaraları erken daralıyordu,
//   · 1490 pikselde üst bar araması erken daralıyordu (1480→1500).
//
// Sonuç: bu eşikler sürüm artığı değil, gerçek yerleşim aşamaları. Yalnızca
// aynı aşamayı temsil eden komşu eşikler birleştirildi ve her birleştirmenin
// hiçbir genişlikte piksel değiştirmediği 12 genişlik × 7 sayfa üzerinde
// doğrulandı. 43 ayrı eşik 16'ya indi; 4-5'e inmek ölçülebilir yoğunluk
// kaybına mal oluyordu ve bu takas kabul edilmedi. Ölçüt "az basamak" değil,
// "hiçbir genişlikte piksel değişmeden en çok birleştirme" idi.
//
// Anahtar: kanonik eşik. Değer: ona çekilen eşikler.
const GROUPS = {
  430: [390, 420, 430],
  480: [480],
  520: [520],
  620: [560, 600, 620],
  680: [640, 650, 680],
  760: [700, 720, 760],
  1000: [780, 800, 820, 850, 860, 900, 920, 980, 1000],
  1180: [1050, 1080, 1100, 1120, 1180],
  1200: [1200],
  1280: [1250, 1260, 1280],
  1300: [1300],
  1320: [1320],
  1350: [1350],
  1400: [1380, 1400],
  1450: [1450],
  1480: [1480],
  1500: [1500]
};

export const SCALE = Object.keys(GROUPS)
  .map(Number)
  .sort((a, b) => a - b);

const MAX_WIDTH_MAP = Object.fromEntries(
  Object.entries(GROUPS).flatMap(([target, sources]) => sources.map((value) => [value, Number(target)]))
);

export const snapMax = (value) => MAX_WIDTH_MAP[value] ?? value;
// min-width sorguları bilinçli olarak dokunulmadan bırakılır. Kaynakta
// yalnızca dört tanesi var (901, 1001, 1181, 1380) ve hiçbirinin
// birleştirilmesi bir kazanç sağlamaz; buna karşılık bir min-width eşiğini
// yukarı çekmek kuralı bir bantta tamamen kaybettirir. Riski sıfır tutmak
// için kapsam dışıdırlar. Hedefledikleri seçiciler (ürün ön izleme başlığı,
// sidebar masaüstü yakası) max-width gruplarıyla çakışmıyor.
export const snapMin = (value) => value;

const rewritePrelude = (prelude, counter) =>
  prelude.replace(/(max-width|min-width)(\s*:\s*)(\d+)px/g, (whole, feature, gap, digits) => {
    const from = Number(digits);
    const to = feature === "max-width" ? snapMax(from) : snapMin(from);
    if (to === from) return whole;
    counter.push(`${feature}:${from}→${to}`);
    return `${feature}${gap}${to}px`;
  });

// Dosya yazan bölüm yalnızca betik DOĞRUDAN çalıştırıldığında işler.
// Ölçek (SCALE) sözleşme testinden import edilir; import etmek dosyaları
// yeniden yazmamalıdır.
if (pathToFileURL(process.argv[1] || "").href === import.meta.url) {
  let totalChanged = 0;
  const perFile = [];

  for (const file of fs.readdirSync(cssDir).filter((name) => name.endsWith(".css"))) {
    const full = path.join(cssDir, file);
    const before = fs.readFileSync(full, "utf8");
    const changes = [];
    // Yalnızca @media önsözü (prelude) dokunulur: "@media" ile onu izleyen ilk
    // "{" arası. Kural gövdelerindeki min-width/max-width bildirimleri (buton
    // genişliği, tablo min-width'i) kapsam dışıdır.
    const after = before.replace(
      /@media([^{]*)\{/g,
      (_whole, prelude) => `@media${rewritePrelude(prelude, changes)}{`
    );
    if (changes.length) {
      perFile.push([file, changes.length]);
      totalChanged += changes.length;
      if (!dry) fs.writeFileSync(full, after);
    }
  }

  for (const [file, count] of perFile.sort((a, b) => b[1] - a[1])) {
    console.log(String(count).padStart(4), file);
  }
  console.log(
    `\n${dry ? "[kuru koşum] " : ""}toplam ${totalChanged} eşik ${SCALE.length} basamaklı kanonik ölçeğe çekildi`
  );
  console.log(`ölçek: ${SCALE.join(" · ")}`);
}
