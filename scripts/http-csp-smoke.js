import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "crmv1-http-csp-"));
const serverOutput = [];

function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      probe.close((error) => {
        if (error) reject(error);
        else resolve(address.port);
      });
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitUntilReady(baseUrl, child) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`Sunucu erken kapandı:\n${serverOutput.join("")}`);
    }
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`Sunucu zamanında hazır olmadı:\n${serverOutput.join("")}`);
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGINT");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    delay(5_000).then(() => child.kill("SIGKILL"))
  ]);
}

const port = await availablePort();
const baseUrl = `http://127.0.0.1:${port}`;
for (const directory of ["shared", "uploads", "backups"]) {
  fs.mkdirSync(path.join(tempRoot, directory), { recursive: true });
}

const child = spawn(process.execPath, ["src/server.js"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: String(port),
    DATABASE_FILE: path.join(tempRoot, "crm.sqlite"),
    SHARED_DIR: path.join(tempRoot, "shared"),
    PRIVATE_UPLOAD_DIR: path.join(tempRoot, "uploads"),
    BACKUP_DIR: path.join(tempRoot, "backups"),
    SESSION_SECRET: "smoke-session-secret-0123456789-abcdefghijklmnopqrstuvwxyz",
    DATA_ENCRYPTION_KEY: "smoke-encryption-key-0123456789-abcdefghijklmnopqrstuvwxyz",
    PUBLIC_BASE_URL: baseUrl,
    COOKIE_SECURE: "0"
  },
  stdio: ["ignore", "pipe", "pipe"]
});
child.stdout.on("data", (chunk) => serverOutput.push(String(chunk)));
child.stderr.on("data", (chunk) => serverOutput.push(String(chunk)));

try {
  await waitUntilReady(baseUrl, child);

  const healthResponse = await fetch(`${baseUrl}/health`);
  const health = await healthResponse.json();
  assert.equal(healthResponse.status, 200);
  assert.equal(health.ok, true);
  assert.equal(health.version, "3.8.57");

  const loginResponse = await fetch(`${baseUrl}/login`);
  const loginHtml = await loginResponse.text();
  const csp = loginResponse.headers.get("content-security-policy") || "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1] || "";

  assert.equal(loginResponse.status, 200);
  assert.ok(csp);
  assert.ok(!csp.includes("'unsafe-inline'"));
  assert.ok(csp.includes("script-src-attr 'none'"));
  assert.ok(csp.includes("style-src-attr 'none'"));
  assert.ok(nonce.length >= 24);
  assert.ok(!/<[^>]+\sstyle\s*=/i.test(loginHtml));

  const inlineTags = [...loginHtml.matchAll(/<(script|style)\b([^>]*)>/gi)];
  const unprotectedTags = inlineTags.filter(([, tag, attributes]) => {
    const isInline = tag.toLowerCase() === "style" || !/\bsrc\s*=/.test(attributes);
    const hasNonce = attributes.includes(`nonce="${nonce}"`) || attributes.includes(`nonce='${nonce}'`);
    return isInline && !hasNonce;
  });
  assert.equal(unprotectedTags.length, 0);

  const manifest = JSON.parse(
    fs.readFileSync(path.join(projectRoot, "public/build/asset-manifest.json"), "utf8")
  );
  const assetResponse = await fetch(`${baseUrl}${manifest.stylesCss}`, {
    headers: { "Accept-Encoding": "gzip" }
  });
  assert.equal(assetResponse.status, 200);
  assert.match(assetResponse.headers.get("cache-control") || "", /max-age=31536000/);
  assert.match(assetResponse.headers.get("cache-control") || "", /immutable/);
  assert.equal(assetResponse.headers.get("content-encoding"), "gzip");
  await assetResponse.arrayBuffer();

  console.log(`HTTP_CSP_SMOKE=OK protected_inline_tags=${inlineTags.length} nonce_length=${nonce.length}`);
} finally {
  await stopServer(child);
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
