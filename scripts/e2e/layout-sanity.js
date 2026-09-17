// crmv1.46 — Faz 1: yerleşim sağlamlığı, genişlik süpürmesiyle.
//
// Görsel regresyon "değişti mi" sorusunu yanıtlar. Bu dosya "doğru mu"
// sorusunu yanıtlar ve kırılma noktalarını birleştirirken gereken ölçüt
// budur: bir eşiğin kayması yerleşimi değiştirir, önemli olan değişimin
// kusur üretip üretmediğidir.
//
// Ölçülen kusurlar nesneldir, göz kararı değildir:
//   1. yatay taşma          — sayfa ekrandan geniş
//   2. ekranı aşan öğe      — tek bir öğe görünür alandan taşıyor
//   3. kırpılmış metin      — kaydırılamayan bir kapta metin kesiliyor
//   4. üst üste binen düğme — iki KARDEŞ tıklanabilir öğe çakışıyor
//
// Kullanım:
//   node scripts/e2e/layout-sanity.js            (standart genişlikler)
//   node scripts/e2e/layout-sanity.js --sweep    (yoğun süpürme, karar için)
//   node scripts/e2e/layout-sanity.js --json out.json
import fs from "fs";
import { startApp, openBrowser, login, reporter } from "./harness.js";

const sweep = process.argv.includes("--sweep");
const jsonIndex = process.argv.indexOf("--json");
const jsonPath = jsonIndex > -1 ? process.argv[jsonIndex + 1] : null;

// Standart küme: kanonik bantların içi ve iki yanı.
const STANDARD = [390, 560, 700, 950, 1100, 1300, 1600];
// Süpürme kümesi: her kanonik eşiğin altı, üstü ve tam üstü.
const SWEEP = [
  360, 390, 430, 470, 480, 490, 520, 560, 610, 620, 630, 680, 700, 750, 760, 770, 820, 900, 950, 990, 1000,
  1010, 1100, 1170, 1180, 1190, 1250, 1270, 1280, 1290, 1390, 1400, 1410, 1490, 1500, 1510, 1600, 1920
];
// LAYOUT_WIDTHS=1280,1390 ile tek bir aralık incelenebilir.
const WIDTHS = process.env.LAYOUT_WIDTHS
  ? process.env.LAYOUT_WIDTHS.split(",").map(Number)
  : sweep
    ? SWEEP
    : STANDARD;
const ROUTES = ["/", "/customers", "/products", "/quotes", "/quotes/new", "/settings/theme"];

const probe = () => document.evaluate && null;

const app = await startApp();
const report = reporter("E2E_LAYOUT");
const detail = {};

try {
  // Tek oturum, çok genişlik. Her genişlik için yeniden giriş yapmak
  // uygulamanın kaba kuvvet koruması olan giriş hız sınırına (15 dakikada 10)
  // takılır; sınır doğru çalışıyor, testin onu zorlaması yanlıştı. Görünüm
  // yeniden boyutlandırılıp sayfa yeniden yükleniyor, böylece yükleme anında
  // genişlik okuyan betikler de doğru aşamada çalışır.
  const { browser, page } = await openBrowser({ width: WIDTHS[0], height: 900 });
  await login(page, app.base);
  for (const width of WIDTHS) {
    {
      await page.setViewportSize({ width, height: 900 });
      let defects = 0;
      const kinds = {};
      for (const route of ROUTES) {
        await page.goto(app.base + route, { waitUntil: "networkidle" });
        // Görsel taban çizgisiyle aynı gerekçe: kenar çubuğu ve kart katlama
        // durumu localStorage'da yaşar; tek tarayıcıda gezilince genişlikler
        // arasında taşınır ve ölçüm sıraya bağlı hale gelir. Her ölçüm aynı
        // başlangıç durumundan yapılır.
        await page.evaluate(() => {
          try {
            localStorage.clear();
            sessionStorage.clear();
          } catch {
            /* özel pencerede erişilemeyebilir */
          }
        });
        await page.reload({ waitUntil: "networkidle" });
        const found = await page.evaluate(() => {
          const out = [];
          const doc = document.documentElement;
          const viewport = doc.clientWidth;
          if (doc.scrollWidth - viewport > 1) out.push(["yatay-tasma", `${doc.scrollWidth - viewport}px`]);

          const visible = (el) =>
            el.checkVisibility({
              contentVisibilityAuto: true,
              opacityProperty: true,
              visibilityProperty: true
            });

          // Kaydırılabilir bir atanın içindeki öğe taşmaz, kaydırılır.
          // Tablolar .table-scroll içinde bilerek ekrandan geniştir; bunu
          // kusur saymak dedektörü işe yaramaz hale getirir.
          const inScroller = (el) => {
            for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
              const style = getComputedStyle(node);
              if (/auto|scroll/.test(style.overflowX)) return true;
            }
            return false;
          };

          // Katmanlı arayüz (modal, onay penceresi, açılır panel) tanım gereği
          // altındaki içeriğin üstüne biner; bunu çakışma saymak dedektörü
          // gürültüye boğar. Sabit konumlu bir ata varsa öğe kendi katmanındadır.
          const inOverlay = (el) => {
            for (let node = el; node && node !== document.body; node = node.parentElement) {
              const position = getComputedStyle(node).position;
              if (position === "fixed" || position === "sticky") return true;
              if (node.matches?.('[role="dialog"], .modal, .confirm-modal, .backup-reminder-modal'))
                return true;
            }
            return false;
          };

          // Öğenin ait olduğu KATMAN. Konumlandırılmış bir öğe kendi
          // katmanıdır; değilse en yakın konumlandırılmış atasına aittir.
          //
          // Çakışma yalnızca AYNI katmandaki iki öğe arasında kusurdur. Kart
          // köşesindeki yeniden boyutlandırma tutamağı (kendi katmanı) alttaki
          // içeriğin üstüne bilinçli biner — kusur değil. Buna karşılık sabit
          // alt menünün İKİ sekmesi birbirine giriyorsa, ikisi de aynı
          // katmandadır ve bu gerçek bir kusurdur; katmanı toptan dışlayan bir
          // dedektör bunu kaçırır.
          const layerOf = (el) => {
            if (getComputedStyle(el).position !== "static") return el;
            for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
              if (getComputedStyle(node).position !== "static") return node;
            }
            return document.body;
          };

          const clickable = [];
          for (const el of document.querySelectorAll("body *")) {
            if (!visible(el)) continue;
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const style = getComputedStyle(el);
            const scrolled = inScroller(el);

            // 2 — ekranı aşan öğe. Katmanlı (konumlandırılmış) öğeler hariç:
            //     ekran dışına park edilmiş çekmeceler ve serbest yerleşimdeki
            //     pano kartları bilinçli olarak görünür alanın dışında durur ve
            //     bir atası tarafından kırpılır. Sayfanın gerçekten kayıp
            //     kaymadığını zaten "yatay-tasma" ölçüyor.
            if (!inOverlay(el) && !scrolled && rect.right - viewport > 2 && rect.width <= viewport)
              out.push([
                "ekrani-asan",
                `${el.tagName.toLowerCase()}${
                  typeof el.className === "string" && el.className.trim()
                    ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
                    : ""
                } sağ=${Math.round(rect.right)}/${viewport}`
              ]);

            // 3 — kırpılmış metin: öğenin KENDİ metni kabına sığmıyor ve
            //     ne kaydırılabiliyor ne de üç nokta ile kısaltılıyor.
            const ownText = [...el.childNodes]
              .filter((node) => node.nodeType === 3)
              .map((node) => node.textContent.trim())
              .join(" ")
              .trim();
            const selfScrolls = /auto|scroll/.test(style.overflowX + style.overflowY);
            // Yalnızca gerçekten KESİLEN metin kusurdur. overflow:visible ise
            // yazı kutunun dışına taşar ama okunur; scrollWidth farkına bakıp
            // bunu kusur saymak yanlış alarm üretir.
            const clips = /hidden|clip/.test(style.overflowX);
            if (
              ownText.length > 6 &&
              clips &&
              !selfScrolls &&
              !scrolled &&
              style.textOverflow !== "ellipsis" &&
              el.scrollWidth - el.clientWidth > 3
            )
              out.push(["kirpilmis-metin", `${el.tagName.toLowerCase()} "${ownText.slice(0, 20)}"`]);

            if ((el.tagName === "BUTTON" || el.tagName === "A") && rect.width > 8 && rect.height > 8)
              clickable.push({ rect, el, layer: layerOf(el) });
          }

          // 4 — üst üste binen düğmeler. İç içe geçmiş öğeler (bir <a> içindeki
          //     <button>) tanım gereği çakışır; yalnızca KARDEŞ çakışması kusurdur.
          outer: for (let i = 0; i < clickable.length; i += 1)
            for (let j = i + 1; j < clickable.length; j += 1) {
              const a = clickable[i];
              const b = clickable[j];
              if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
              if (a.layer !== b.layer) continue;
              const overlapX = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
              const overlapY = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
              if (overlapX > 6 && overlapY > 6) {
                const name = (el) =>
                  el.tagName.toLowerCase() +
                  (typeof el.className === "string" && el.className.trim()
                    ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
                    : "") +
                  `"${el.textContent.trim().slice(0, 18)}"`;
                out.push(["ust-uste-dugme", `${name(a.el)} × ${name(b.el)}`]);
                break outer;
              }
            }

          return out;
        });
        if (process.env.LAYOUT_DEBUG && found.length)
          console.log(`  [ayrıntı] ${width}px ${route}: ${found.map(([k, d]) => `${k}(${d})`).join(", ")}`);
        for (const [kind] of found) kinds[kind] = (kinds[kind] || 0) + 1;
        defects += found.length;
      }
      detail[width] = kinds;
      report.check(
        `${width}px: yerleşim kusuru yok`,
        defects === 0,
        defects
          ? Object.entries(kinds)
              .map(([k, v]) => `${k}×${v}`)
              .join(" ")
          : ""
      );
    }
  }
  await browser.close();
} catch (error) {
  report.fail("koşum", String(error).split("\n")[0]);
} finally {
  await app.stop();
}

if (jsonPath) fs.writeFileSync(jsonPath, JSON.stringify(detail, null, 2));
process.exit(report.finish() ? 1 : 0);
