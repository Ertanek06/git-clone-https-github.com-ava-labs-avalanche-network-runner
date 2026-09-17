// crmv1.46 — Faz 0: görsel regresyon taban çizgisi.
//
// Amaç piksel avcılığı değil, sökümün fark ettirmeden bozduğu yerleşimi
// yakalamak. İlk koşu referansları üretir (`--update`), sonraki koşular aynı
// sayfaları aynı genişliklerde çekip referansla karşılaştırır. Eşik bir avuç
// pikseli tolere eder; kayan bir kolon veya çöken bir kabuk bu eşiği kat kat
// aşar.
import fs from "fs";
import path from "path";
import { startApp, openBrowser, login, freezeVolatile, reporter, root } from "./harness.js";
import { decodePng, pixelDiff } from "./png.js";

const BASELINE_DIR = path.join(root, "tests", "visual-baseline");
const DIFF_DIR = path.join(root, "tests", "visual-diff");
const UPDATE = process.argv.includes("--update") || process.env.VISUAL_UPDATE === "1";
// Yüzde olarak izin verilen piksel farkı. Antialias ve yazı tipi
// pürüzlendirmesi binde birkaç pikseli hep oynatır; kayan bir kolon veya çöken
// bir kabuk bu eşiği kat kat aşar.
const TOLERANCE = 0.35;

// Genişlikler rastgele değil. Bir max-width eşiği v'den v'ye çekildiğinde
// davranış TAM OLARAK (v, v'] aralığında değişir; başka hiçbir genişlikte
// değişmez. Bu liste her birleştirme boşluğundan en az bir genişlik içerir,
// yani ölçek değişikliğinin etkileyebileceği her aralık gerçekten ölçülür.
// Geri kalanlar bant temsilcisidir.
const VIEWPORTS = [
  { name: "390", width: 390, height: 844 }, // telefon (bant temsilcisi)
  { name: "410", width: 410, height: 900 }, // (390,430] birleşme aralığı
  { name: "560", width: 560, height: 900 }, // büyük telefon (bant temsilcisi)
  { name: "590", width: 590, height: 900 }, // (560,620]
  { name: "660", width: 660, height: 900 }, // (640,680]
  { name: "750", width: 750, height: 900 }, // (700,760]
  { name: "950", width: 950, height: 900 }, // (780,1000]
  { name: "1100", width: 1100, height: 900 }, // (1050,1180]
  { name: "1270", width: 1270, height: 900 }, // (1250,1280]
  { name: "1390", width: 1390, height: 900 }, // (1380,1400]
  { name: "1490", width: 1490, height: 900 }, // (1480,1500]
  { name: "1600", width: 1600, height: 1000 } // geniş ekran (bant temsilcisi)
];

const ROUTES = [
  ["dashboard", "/"],
  ["customers", "/customers"],
  ["products", "/products"],
  ["quotes", "/quotes"],
  ["quote-new", "/quotes/new"],
  ["settings", "/settings"],
  ["theme-studio", "/settings/theme"]
];

// Tam sayfa yüksekliği geç yüklenen içerikle oynar; ölçüm o oynamayı bitmeden
// alırsa iki koşu farklı boyda görüntü üretir ve karşılaştırma anlamsızlaşır.
// Bu yüzden yükseklik iki ardışık okumada aynı kalana kadar beklenir.
async function settle(page) {
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.evaluate(() => window.scrollTo(0, 0));
  let previous = -1;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    if (height === previous) return height;
    previous = height;
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return previous;
}

const shotBuffer = (page) => page.screenshot({ fullPage: true, type: "png" });

fs.mkdirSync(BASELINE_DIR, { recursive: true });

const app = await startApp();
const report = reporter("E2E_VISUAL");
let updated = 0;

try {
  // Tek oturum, çok görünüm: her genişlik için yeniden giriş yapmak
  // uygulamanın giriş hız sınırına (15 dakikada 10) takılır. Görünüm
  // boyutlandırılıp sayfa yeniden yükleniyor, yani ölçüm hâlâ o genişlikte
  // yapılmış temiz bir yükleme üzerinden alınıyor.
  const { browser, page } = await openBrowser({
    width: VIEWPORTS[0].width,
    height: VIEWPORTS[0].height
  });
  await login(page, app.base);
  for (const viewport of VIEWPORTS) {
    {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      for (const [name, route] of ROUTES) {
        await page.goto(app.base + route, { waitUntil: "networkidle" });
        // Her kare bağımsız olmalı. Kenar çubuğunun açık menü durumu ve tablo
        // tercihleri localStorage'da saklanır; tek tarayıcıda gezilince bu
        // durum genişlikler arasında taşınır ve aynı sayfa farklı menü
        // vurgusuyla çekilir. Tarayıcı deposu temizlenip sayfa yeniden
        // yükleniyor, böylece ölçülen şey her zaman aynı başlangıç durumu.
        await page.evaluate(() => {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {
            /* özel pencerede erişilemeyebilir */
          }
        });
        await page.reload({ waitUntil: "networkidle" });
        await freezeVolatile(page);
        const height = await settle(page);
        const file = path.join(BASELINE_DIR, `${name}-${viewport.name}.png`);
        const current = await shotBuffer(page);

        if (UPDATE || !fs.existsSync(file)) {
          fs.writeFileSync(file, current);
          updated += 1;
          report.check(
            `${name} @${viewport.name} referans yazıldı`,
            true,
            `${height}px · ${current.length} bayt`
          );
          continue;
        }

        const { ratio, reason } = pixelDiff(decodePng(fs.readFileSync(file)), decodePng(current));
        const ok = ratio <= TOLERANCE;
        if (!ok) {
          fs.mkdirSync(DIFF_DIR, { recursive: true });
          fs.writeFileSync(path.join(DIFF_DIR, `${name}-${viewport.name}.png`), current);
        }
        report.check(
          `${name} @${viewport.name} yerleşimi değişmedi`,
          ok,
          `fark=%${ratio.toFixed(3)} · ${reason} · ${height}px`
        );
      }
    }
  }
  await browser.close();
} catch (error) {
  report.fail("koşum", String(error).split("\n")[0]);
} finally {
  await app.stop();
}

if (updated) console.log(`\n${updated} referans görüntü yazıldı: tests/visual-baseline/`);
process.exit(report.finish() ? 1 : 0);
