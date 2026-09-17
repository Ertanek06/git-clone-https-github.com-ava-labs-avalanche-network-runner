// crmv1.46 — Faz 1: koyu temada hiçbir yüzey açık kalamaz.
//
// Eski sözleşme bu kuralı /settings/theme.css içindeki !important bloğunun
// METNİNİ arayarak koruyordu. O blok üretiliyor ama hiçbir yere
// gönderilmiyordu; yani kural kâğıt üzerinde duruyor, gerçekte
// uygulanmıyordu. Ölçünce görüldü: koyu temada tablolar, sayfa gövdesi,
// açılır paneller ve ayar kartları beyaz kalıyordu.
//
// Bu dosya aynı niyeti metin araması yerine gerçek tarayıcıda, hesaplanmış
// stil üzerinden doğrular: koyu tema açıkken belirgin büyüklükteki hiçbir
// yüzey açık renkli olamaz. Tasarım sistemi bir bileşenin yalnızca
// geometrisini devralıp yüzey rengini eski katmana bırakırsa test düşer.
import { startApp, openBrowser, login, reporter } from "./harness.js";

// Işıklılık eşiği: bunun üstü "açık yüzey" sayılır. Koyu paletin en açık
// yüzeyi (--ds-surface-3 #212a37) 0.17 civarındadır, yani eşik cömerttir.
const LIGHT = 0.72;
// Bu alanın altındaki öğeler rozet/ikon boyutundadır; yüzey sayılmaz.
const MIN_AREA = 900;

const ROUTES = ["/", "/customers", "/products", "/quotes", "/quotes/new", "/settings", "/users", "/profiles"];

const app = await startApp();
const { browser, page } = await openBrowser({ width: 1600, height: 1000 });
const report = reporter("E2E_DARK_SURFACES");

try {
  await login(page, app.base);
  for (const route of ROUTES) {
    await page.goto(app.base + route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.body.classList.add("theme-midnight-ops"));
    await page.waitForTimeout(250);

    const offenders = await page.evaluate(
      ({ light, minArea }) => {
        const found = new Map();
        for (const el of document.querySelectorAll("body *")) {
          // Kapalı bir <details> içindeki öğeler render edilmez; tarayıcı bu
          // alt ağaç için düzeni atladığından hesaplanmış stil donuk kalır ve
          // gerçekte görünmeyen bir öğe "beyaz yüzey" gibi okunur.
          // checkVisibility bunu, display:none ve content-visibility dahil,
          // tek çağrıda doğru yanıtlar.
          if (
            !el.checkVisibility({
              contentVisibilityAuto: true,
              opacityProperty: true,
              visibilityProperty: true
            })
          )
            continue;
          const style = getComputedStyle(el);
          if (style.display === "none" || style.visibility === "hidden") continue;
          const match = style.backgroundColor.match(/^rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)$/);
          if (!match) continue;
          const alpha = match[4] === undefined ? 1 : Number(match[4]);
          if (alpha < 0.5) continue;
          const luminance =
            (Number(match[1]) * 0.299 + Number(match[2]) * 0.587 + Number(match[3]) * 0.114) / 255;
          if (luminance < light) continue;
          const rect = el.getBoundingClientRect();
          if (rect.width * rect.height < minArea) continue;
          const name =
            el.tagName.toLowerCase() +
            (typeof el.className === "string" && el.className.trim()
              ? "." + el.className.trim().split(/\s+/).slice(0, 2).join(".")
              : "");
          found.set(name, (found.get(name) || 0) + 1);
        }
        return [...found.keys()];
      },
      { light: LIGHT, minArea: MIN_AREA }
    );

    report.check(
      `${route}: koyu temada açık yüzey yok`,
      offenders.length === 0,
      offenders.length ? `${offenders.length} tip → ${offenders.slice(0, 4).join(", ")}` : ""
    );
  }
} catch (error) {
  report.fail("koşum", String(error).split("\n")[0]);
} finally {
  await browser.close();
  await app.stop();
}

process.exit(report.finish() ? 1 : 0);
