// crmv1.46 — Faz 0: kritik kullanıcı akışları, gerçek tarayıcıda.
//
// Bu dosya "dosyada şu metin var mı" kontrolü yapmaz. Uygulamayı açar, tıklar,
// yazar ve sonucu DOM'dan okur. Legacy CSS/JS sökülürken bozulan ilk şey
// burada görünür.
import { startApp, openBrowser, login, freezeVolatile, reporter, submitForm } from "./harness.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stamp = Date.now().toString().slice(-6);

const app = await startApp();
const { browser, page, errors } = await openBrowser({ width: 1600, height: 1000 });
const report = reporter("E2E_FLOWS");

try {
  // --- oturum ---
  await login(page, app.base);
  report.check(
    "giriş yapılıyor ve panele düşüyor",
    !page.url().includes("/login"),
    page.url().replace(app.base, "")
  );
  await freezeVolatile(page);

  // --- kabuk her sayfada ayakta mı ---
  for (const [route, name] of [
    ["/", "Ana Sayfa"],
    ["/customers", "Müşteriler"],
    ["/products", "Ürünler"],
    ["/quotes", "Proforma listesi"],
    ["/quotes/new", "Yeni Proforma"],
    ["/profiles", "Firma Profilleri"],
    ["/settings", "Ayarlar"],
    ["/settings/theme", "Tema Stüdyosu"],
    ["/users", "Kullanıcılar"],
    ["/excel", "Excel Aktarımı"]
  ]) {
    const response = await page.goto(app.base + route, { waitUntil: "networkidle" });
    const shell = await page.evaluate(() => ({
      sidebar: !!document.querySelector("#sidebar"),
      topbar: !!document.querySelector(".topbar"),
      main: !!document.querySelector(".app-main"),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
    }));
    report.check(
      `${name}: 200 + kabuk bütün + yatay taşma yok`,
      response.status() === 200 && shell.sidebar && shell.topbar && shell.main && shell.overflow <= 1,
      `status=${response.status()} taşma=${shell.overflow}px`
    );
  }

  // --- müşteri oluşturma akışı ---
  await page.goto(`${app.base}/customers/new`, { waitUntil: "networkidle" });
  await freezeVolatile(page);
  const companyName = `E2E Test Firma ${stamp}`;
  await page.fill('input[name="company_name"]', companyName);
  const cityField = await page.$('input[name="city"]');
  if (cityField) await cityField.fill("Ankara");
  // Seçici forma göre daraltılır: sayfada çıkış formu da bir `button[type=submit]`
  // taşır, genel seçici onu yakalayıp oturumu kapatıyordu.
  const customerLanding = await submitForm(page, 'form[action^="/customers/save"] .form-actions button');
  await page.goto(`${app.base}/customers?q=${encodeURIComponent(companyName)}`, { waitUntil: "networkidle" });
  report.check(
    "müşteri oluşturuluyor ve listede aranabiliyor",
    (await page.content()).includes(companyName),
    `kayıt sonrası=${customerLanding.replace(app.base, "")}`
  );

  // --- ürün oluşturma akışı ---
  await page.goto(`${app.base}/products/new`, { waitUntil: "networkidle" });
  await freezeVolatile(page);
  const productCode = `E2E-${stamp}`;
  await page.fill('input[name="code"]', productCode);
  await page.fill('input[name="name"]', `E2E Test Ürün ${stamp}`);
  const priceField = await page.$('input[name="sale_price"]');
  if (priceField) await priceField.fill("1250");
  const productLanding = await submitForm(
    page,
    'form[action^="/products/save"] button[type="submit"].btn--primary'
  );
  await page.goto(`${app.base}/products?q=${encodeURIComponent(productCode)}`, { waitUntil: "networkidle" });
  report.check(
    "ürün oluşturuluyor ve listede aranabiliyor",
    (await page.content()).includes(productCode),
    `${productCode} · kayıt sonrası=${productLanding.replace(app.base, "")}`
  );

  // --- proforma: satır ekleme ve toplam hesabı ---
  await page.goto(`${app.base}/quotes/new`, { waitUntil: "networkidle" });
  await freezeVolatile(page);
  await sleep(500);
  const blank = await page.$("#addBlank");
  report.check("proforma satır araçları yükleniyor", !!blank);
  if (blank) {
    await blank.click();
    await sleep(350);
    const rows = await page.evaluate(() => document.querySelectorAll("#quoteItems tr").length);
    report.check("boş satır ekleniyor", rows > 0, `${rows} satır`);

    // Ürün adı/kodu boş olan satır tasarım gereği toplamlara girmez
    // (`isBlank`), bu yüzden hesap ölçülmeden önce satır gerçekten doldurulur.
    const nameCell = await page.$('#quoteItems [data-kind="name"]');
    if (nameCell) await nameCell.fill(`E2E Satır ${stamp}`);
    const qty = await page.$('#quoteItems [data-field="quantity"]');
    const price = await page.$('#quoteItems [data-field="unit_price"]');
    if (qty && price) {
      await qty.fill("4");
      await price.fill("1000");
      await page
        .waitForFunction(
          () => (document.querySelector("#subtotal")?.textContent || "").replace(/\s/g, "") !== "0,00",
          { timeout: 5000 }
        )
        .catch(() => {});
      const subtotal = (await page.textContent("#subtotal")) || "";
      report.check(
        "ara toplam satırdan hesaplanıyor",
        /4\.000|4000/.test(subtotal.replace(/\s/g, "")),
        subtotal.trim()
      );
    } else {
      report.fail("ara toplam satırdan hesaplanıyor", "miktar/fiyat alanı bulunamadı");
    }
  }

  // --- ön izleme: liste satırından belge ön izlemesi ---
  await page.goto(`${app.base}/customers`, { waitUntil: "networkidle" });
  await freezeVolatile(page);
  const previewTrigger = await page.$("[data-preview-url]");
  if (previewTrigger) {
    await previewTrigger.click();
    await sleep(700);
    const opened = await page.evaluate(
      () => !!document.querySelector("#globalPreviewModal.is-open, .preview-modal.is-open")
    );
    report.check("liste satırından ön izleme açılıyor", opened);
    await page.keyboard.press("Escape");
    await sleep(300);
    report.check(
      "ön izleme Escape ile kapanıyor",
      await page.evaluate(
        () => !document.querySelector("#globalPreviewModal.is-open, .preview-modal.is-open")
      )
    );
  } else {
    report.fail("liste satırından ön izleme açılıyor", "tetikleyici yok");
  }

  // --- tema stüdyosu canlı ön izlemesi ---
  await page.goto(`${app.base}/settings/theme`, { waitUntil: "networkidle" });
  await sleep(700);
  report.check(
    "tema stüdyosu canlı ön izlemesi kuruluyor",
    (await page.$("[data-theme-preview-canvas]")) !== null &&
      (await page.evaluate(() => document.querySelectorAll(".theme-editable-v18").length)) > 0
  );

  // --- mobil: kesilen etiket ve sıkışan boş liste hücresi ---
  // Bu iki kontrol sezgisel değil, ölçülmüş iki gerçek hatayı kilitler:
  // alt menüde "Ürün ve Hizmetler" 95 piksellik hücrede kelimenin ortasından
  // kesiliyordu; "kayıt bulunamadı" hücresi ise özgüllük beraberliği yüzünden
  // 25 piksele sıkışıp metni harf harf alt alta diziyordu.
  await page.setViewportSize({ width: 390, height: 844 });
  // Boş durum hücresini görmek için sonuç vermeyecek bir arama yapılır;
  // bu noktada listede az önce oluşturulan müşteri duruyor.
  await page.goto(`${app.base}/customers?q=ZZZ-BULUNMAYAN-${stamp}`, { waitUntil: "networkidle" });
  await freezeVolatile(page);

  const nav = await page.evaluate(() =>
    [...(document.querySelector(".mobile-nav")?.children || [])].map((el) => ({
      metin: el.textContent.trim(),
      kesik: el.scrollWidth - el.clientWidth > 1
    }))
  );
  report.check(
    "mobil alt menüde etiketler kesilmiyor",
    nav.length > 0 && nav.every((item) => !item.kesik),
    nav
      .filter((item) => item.kesik)
      .map((item) => item.metin)
      .join(", ") || `${nav.length} sekme tam`
  );

  const emptyCell = await page.evaluate(() => {
    const cell = document.querySelector("td.empty");
    if (!cell) return null;
    const row = cell.closest("tr");
    return {
      oran: cell.getBoundingClientRect().width / row.getBoundingClientRect().width,
      satir: Math.round(cell.getBoundingClientRect().height)
    };
  });
  report.check(
    "boş liste mesajı satırın tamamını kullanıyor",
    !!emptyCell && emptyCell.oran > 0.9,
    emptyCell ? `genişlik oranı %${Math.round(emptyCell.oran * 100)}` : "hücre yok"
  );

  await page.setViewportSize({ width: 1600, height: 1000 });

  // --- oturum kapatma ---
  await page.goto(`${app.base}/`, { waitUntil: "networkidle" });
  await freezeVolatile(page);
  const afterLogout = await submitForm(page, 'form[action="/logout"] button[type="submit"]');
  report.check("güvenli çıkış çalışıyor", afterLogout.includes("/login"), afterLogout.replace(app.base, ""));

  // Ölçüm http üzerinde çalışır; helmet'in varsayılan
  // `upgrade-insecure-requests` direktifi alt istekleri https'e çevirdiği için
  // üretimde görülmeyen bir TLS hatası üretir. Bu tek sınıf ve tarayıcının
  // jest uyarısı ayıklanır, geri kalan her hata testi düşürür.
  const realErrors = errors.filter((message) => !/ERR_SSL_PROTOCOL_ERROR|beforeunload/.test(message));
  report.check("hiçbir sayfada JS hatası yok", realErrors.length === 0, realErrors.slice(0, 3).join(" | "));
} catch (error) {
  report.fail("koşum", String(error).split("\n")[0]);
} finally {
  await browser.close();
  await app.stop();
}

process.exit(report.finish() ? 1 : 0);
