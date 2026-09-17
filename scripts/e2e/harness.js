// crmv1.46 — Faz 0 koruma katmanı: gerçek tarayıcı koşum altyapısı.
//
// Tek sorumluluk: izole bir veritabanıyla uygulamayı ayağa kaldırmak, giriş
// yapmış bir sayfa vermek ve sonunda her şeyi temizlemek. Testler bu dosyanın
// içine yazılmaz; akış testleri ve görsel regresyon ayrı dosyalardadır.
import crypto from "crypto";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { chromium } from "playwright-core";

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Konteynerde ve geliştirici makinesinde önceden kurulu Chromium kullanılır;
// bu paket tarayıcı indirmez.
const CHROMIUM_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  process.env.PLAYWRIGHT_BROWSERS_PATH && path.join(process.env.PLAYWRIGHT_BROWSERS_PATH, "chromium"),
  "/opt/pw-browsers/chromium",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome"
].filter(Boolean);

export function chromiumPath() {
  const found = CHROMIUM_CANDIDATES.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch {
      return false;
    }
  });
  if (!found) {
    throw new Error(
      `Chromium bulunamadı. CHROMIUM_PATH ortam değişkenini ayarlayın. Denenen yollar:\n  ${CHROMIUM_CANDIDATES.join("\n  ")}`
    );
  }
  return found;
}

const freePort = () =>
  new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close((error) => (error ? reject(error) : resolve(port)));
    });
  });

const runNode = (args, env) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (output += chunk));
    child.on("exit", (code) => (code === 0 ? resolve(output) : reject(new Error(output))));
  });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const PASSWORD = "E2eBaselinePass!26";

// Her koşu kendi geçici veritabanı ve yükleme klasörleriyle çalışır; canlı
// veriye veya geliştirici veritabanına hiçbir koşulda dokunulmaz.
export async function startApp() {
  const port = await freePort();
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "arteva-e2e-"));
  const env = {
    ...process.env,
    NODE_ENV: "development",
    PORT: String(port),
    DATABASE_FILE: path.join(temp, "e2e.sqlite"),
    SHARED_DIR: path.join(temp, "shared"),
    PRIVATE_UPLOAD_DIR: path.join(temp, "private"),
    BACKUP_DIR: path.join(temp, "backups"),
    SESSION_SECRET: crypto.randomBytes(24).toString("hex"),
    DATA_ENCRYPTION_KEY: crypto.randomBytes(24).toString("hex"),
    ADMIN_USERNAME: "crmadmin",
    ADMIN_PASSWORD: PASSWORD
  };

  await runNode(["src/db/migrate.js"], env);
  await runNode(["src/db/seed.js"], env);
  // Baseline oturumu ilk giriş zorunluluğuna takılmamalı; ölçülen şey akış, parola değişimi değil.
  await runNode(
    [
      "-e",
      'import(process.cwd()+"/src/db/db.js").then(({db})=>db.prepare("UPDATE users SET must_change_password=0").run())'
    ],
    env
  );

  const server = spawn(process.execPath, ["src/server.js"], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  let log = "";
  server.stdout.on("data", (chunk) => (log += chunk));
  server.stderr.on("data", (chunk) => (log += chunk));

  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (server.exitCode !== null) throw new Error(`Sunucu erken kapandı:\n${log}`);
    try {
      if ((await fetch(`${base}/health`)).ok) break;
    } catch {
      /* henüz dinlemiyor */
    }
    await sleep(100);
  }

  return {
    base,
    serverLog: () => log,
    async stop() {
      server.kill("SIGTERM");
      await sleep(200);
      fs.rmSync(temp, { recursive: true, force: true });
    }
  };
}

export async function openBrowser({ width = 1440, height = 900 } = {}) {
  const browser = await chromium.launch({ executablePath: chromiumPath(), args: ["--no-sandbox"] });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return { browser, page, errors };
}

export async function login(page, base) {
  await page.goto(`${base}/login`);
  await page.fill('input[name="login"]', "crmadmin");
  await page.fill('input[name="password"]', PASSWORD);
  await submitForm(page, 'button[type="submit"]');
  if (page.url().includes("/login")) throw new Error("Giriş başarısız: baseline oturumu açılamadı.");
}

// Ekran görüntüsü karşılaştırmasında ölçülen şey yerleşimdir; saat, tarih ve
// döviz kuru gibi her koşuda değişen alanlar sabitlenir, yoksa her çalıştırma
// yanlış alarm üretir.
export async function freezeVolatile(page) {
  // CSP `style-src` nonce istediği için sayfaya stil etiketi enjekte edilmez.
  // Dondurma CSSOM üzerinden yapılır: element.style yazımı CSP'ye takılmaz ve
  // uygulamanın kendi güvenlik ayarını gevşetmeden ölçüm yapılabilir.
  await page.evaluate(() => {
    const volatile = document.querySelectorAll(
      "[data-live-date],[data-live-time],[data-eur],[data-usd],.pill--date,.pill--time,.pill--currency"
    );
    volatile.forEach((el) => el.style.setProperty("visibility", "hidden", "important"));
    document.querySelectorAll(".modal, .backup-reminder-modal").forEach((el) => {
      el.classList.remove("is-open");
      el.style.setProperty("display", "none", "important");
    });
    document.querySelectorAll("*").forEach((el) => {
      el.style.setProperty("animation", "none", "important");
      el.style.setProperty("transition", "none", "important");
    });
  });
}

export function reporter(title) {
  const results = [];
  return {
    check(name, ok, detail = "") {
      results.push([ok ? "PASS" : "FAIL", `${name}${detail ? ` :: ${detail}` : ""}`]);
      return ok;
    },
    fail(name, detail) {
      results.push(["FAIL", `${name}${detail ? ` :: ${detail}` : ""}`]);
    },
    finish() {
      for (const [status, name] of results) console.log(`${status} ${name}`);
      const failed = results.filter(([status]) => status === "FAIL").length;
      console.log(`\n${title}=${results.length - failed}/${results.length} ${failed ? "FAILED" : "OK"}`);
      return failed;
    }
  };
}

// Form gönderimi ile ardından gelen yönlendirmeyi tek adımda bekler.
//
// İki tuzak vardır. Birincisi yarış: tıklamadan sonra `waitForLoadState`
// çağırmak yetmez, gönderim hâlâ uçuşurken yeni bir `goto` verilirse Chromium
// bekleyen gezinmeyi iptal eder ve `net::ERR_ABORTED` atar; bu yüzden gezinme
// sözü tıklamadan önce kurulur. İkincisi uygulamanın kendi davranışı: kayıt
// formları global onay penceresinden geçer, onay verilmeden gezinme başlamaz.
// Baseline gerçek kullanıcı yolunu ölçtüğü için onay da tıklanır.
export async function submitForm(page, selector) {
  const navigation = page.waitForNavigation({ waitUntil: "networkidle", timeout: 20000 });
  // Tıklama başarısız olursa gezinme sözü sahipsiz kalıp süreci düşürmesin.
  navigation.catch(() => {});
  await page.click(selector);
  await confirmIfAsked(page);
  await navigation;
  await page.waitForLoadState("networkidle");
  return page.url();
}

// Uygulamanın onay penceresi açıldıysa onaylar; açılmadıysa sessizce geçer.
export async function confirmIfAsked(page) {
  const ok = page.locator(".confirm-modal.is-open [data-confirm-ok]");
  try {
    await ok.waitFor({ state: "visible", timeout: 2500 });
  } catch {
    return false;
  }
  await ok.click();
  return true;
}
