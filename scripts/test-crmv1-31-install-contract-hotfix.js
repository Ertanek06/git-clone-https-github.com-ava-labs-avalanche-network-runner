import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const build = JSON.parse(read("BUILD_INFO.json"));
const config = read("src/config.js");
const install = read("scripts/install-test.sh");
const update = read("scripts/update-live.sh");
const health = read("scripts/health-check.sh");

assert.equal(pkg.version, build.version);
assert.equal(build.app_version, build.version);
assert.equal(build.package, build.build);
assert.match(config, new RegExp(build.release.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(config, new RegExp(`buildId:\\s*"${build.build.replace(".", "\\.")}"`));
assert.match(install, new RegExp(`VERSION="${build.version.replaceAll(".", "\\.")}"`));
assert.ok(install.includes(`RELEASE_ID="${build.release}"`));
assert.ok(install.includes(`BUILD_ID="${build.build}"`));
assert.ok(update.includes(`EXPECTED_VERSION=${build.version}`));
assert.ok(update.includes(`EXPECTED_RELEASE=${build.release}`));
assert.ok(update.includes(`EXPECTED_BUILD=${build.build}`));
assert.ok(health.includes(build.release));

const forbidden = [
  "v3.8.41-crmv1.29-mobile-brochure-download-hotfix",
  "v3\\.8\\.41-crmv1\\.29-mobile-brochure-download-hotfix",
  "v3.8.42-crmv1.30-print-assets-email-redirect",
  "v3\\.8\\.42-crmv1\\.30-print-assets-email-redirect"
];
const testFiles = fs.readdirSync(path.join(root, "scripts")).filter((name) => /^test-.*\.js$/.test(name) && name !== "test-crmv1-31-install-contract-hotfix.js");
for (const name of testFiles) {
  const text = read(path.join("scripts", name));
  for (const oldRelease of forbidden) {
    assert.equal(text.includes(oldRelease), false, `${name} eski release beklentisi içeriyor: ${oldRelease}`);
  }
}

console.log("CRMV1.31_INSTALL_CONTRACT_HOTFIX=15/15 OK");
