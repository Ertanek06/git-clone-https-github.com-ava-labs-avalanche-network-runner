import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "../src/db/db.js";
import {
  builtInTemplateKeys,
  currentTemplatePresets,
  ensureProfessionalTemplateLibrary,
  legacyV112TemplatePresets,
  reconcileTemplateLibraryV120
} from "../src/services/template-library.service.js";

const root = path.resolve(import.meta.dirname, "..");
const oldTemplateHash = crypto
  .createHash("sha256")
  .update(JSON.stringify(legacyV112TemplatePresets))
  .digest("hex");
assert.equal(oldTemplateHash, "6c94c522901c4d7e76fbe0c65ec7409e5d8852c3c2328eeb1b441ced308846d3");
assert.equal(legacyV112TemplatePresets.length, 32);
assert.equal(currentTemplatePresets.length, 12);
assert.equal(builtInTemplateKeys.length, 45);

/* Canlıda görülen kritik senaryo: release işareti yazılmış, fakat eski kayıtlar
   eksik. Uzlaştırma işarete güvenmeyip fiziksel kütüphaneyi tamamlamalıdır. */
const stamp = Date.now();
const tenantId = `tenant_template_v20_${stamp}`;
const userId = `user_template_v20_${stamp}`;
db.prepare("INSERT INTO tenants(id,name,slug,status,plan,created_at,updated_at) VALUES(?,?,?,?,?,?,?)").run(
  tenantId,
  "Template V20 Existing Tenant",
  `template-v20-${stamp}`,
  "ACTIVE",
  "PRO",
  stamp,
  stamp
);
db.prepare(
  `INSERT INTO users(id,tenant_id,username,password_hash,role,is_active,created_at,updated_at)
   VALUES(?,?,?,?,?,?,?,?)`
).run(userId, tenantId, `template-v20-${stamp}`, "test-hash", "ADMIN", 1, stamp, stamp);
db.prepare("INSERT INTO user_ui_settings(user_id,default_template_key,updated_at) VALUES(?,?,?)").run(
  userId,
  "clean-lab-plus",
  stamp
);
assert.equal(ensureProfessionalTemplateLibrary(tenantId), 45);
const legacyPlaceholders = legacyV112TemplatePresets.map(() => "?").join(",");
db.prepare(`DELETE FROM quote_templates WHERE tenant_id=? AND template_key IN (${legacyPlaceholders})`).run(
  tenantId,
  ...legacyV112TemplatePresets.map((preset) => preset[0])
);
db.prepare(
  `INSERT INTO app_settings(tenant_id,key,value_json,updated_at)
   VALUES(?,?,?,?)`
).run(tenantId, "template_library_release_v120", '{"broken":true}', stamp);

const report = reconcileTemplateLibraryV120(tenantId);
assert.equal(report.applied, true, "Eksik fiziksel kayıtlar release işaretine rağmen onarılmadı");
assert.equal(report.added, 32);
assert.equal(report.old, 32);
assert.equal(report.total, 45);
const rows = db
  .prepare(
    `SELECT template_key,name,description,layout_key,primary_color,accent_color,font_family,deleted_at
     FROM quote_templates WHERE tenant_id=?`
  )
  .all(tenantId);
assert.equal(rows.length, 45);
const byKey = new Map(rows.map((row) => [row.template_key, row]));
for (const [key, name, description, layout, primary, accent, font] of legacyV112TemplatePresets) {
  const row = byKey.get(key);
  assert.ok(row, `${key}: crmv1.12 şablonu eklenmedi`);
  assert.deepEqual(
    [row.name, row.description, row.layout_key, row.primary_color, row.accent_color, row.font_family],
    [name, description, layout, primary, accent, font],
    `${key}: crmv1.12 tanımı değişti`
  );
  assert.equal(row.deleted_at, null);
}
assert.equal(
  db.prepare("SELECT default_template_key FROM user_ui_settings WHERE user_id=?").get(userId)
    .default_template_key,
  "clean-lab-plus",
  "Kütüphane geri yüklemesi kullanıcının seçili şablonunu değiştirdi"
);

/* Kullanıcı sonradan bir şablonu silerse normal sayfa açılışı bunu geri açmaz;
   yalnız görünür “Eski 32 Şablonu Geri Yükle” işlemi force ile geri getirir. */
db.prepare("UPDATE quote_templates SET deleted_at=?,deleted_by=? WHERE tenant_id=? AND template_key=?").run(
  stamp,
  userId,
  tenantId,
  "corporate-main"
);
assert.equal(reconcileTemplateLibraryV120(tenantId).applied, false);
assert.notEqual(
  db
    .prepare("SELECT deleted_at FROM quote_templates WHERE tenant_id=? AND template_key=?")
    .get(tenantId, "corporate-main").deleted_at,
  null
);
assert.equal(reconcileTemplateLibraryV120(tenantId, { force: true }).old, 32);
assert.equal(
  db
    .prepare("SELECT deleted_at FROM quote_templates WHERE tenant_id=? AND template_key=?")
    .get(tenantId, "corporate-main").deleted_at,
  null
);

const js = fs.readFileSync(path.join(root, "public/js/crmv1.16.js"), "utf8");

/* Gerçek kaynak IIFE'sini tarayıcı benzeri olay hedefleriyle çalıştır. Bu test
   sadece metin aramaz: pointerdown → pointermove → pointerup akışını gönderir
   ve kart geometrisi ile localStorage sonucunu ölçer. */
class FakeClassList {
  constructor(...names) {
    this.names = new Set(names);
  }
  add(...names) {
    names.forEach((name) => this.names.add(name));
  }
  remove(...names) {
    names.forEach((name) => this.names.delete(name));
  }
  contains(name) {
    return this.names.has(name);
  }
}
class FakeStyle {
  constructor(owner) {
    this.owner = owner;
    this.values = new Map();
  }
  setProperty(name, value) {
    this.values.set(name, value);
    const number = Number.parseFloat(value);
    if (name === "width") this.owner.offsetWidth = number;
    if (name === "height") this.owner.offsetHeight = number;
    if (name === "left") this.owner.offsetLeft = number;
    if (name === "top") this.owner.offsetTop = number;
  }
  removeProperty(name) {
    this.values.delete(name);
  }
}
class FakeElement {
  constructor(name, geometry = {}) {
    this.name = name;
    this.dataset = {};
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.classList = new FakeClassList();
    this.offsetLeft = geometry.left || 0;
    this.offsetTop = geometry.top || 0;
    this.offsetWidth = geometry.width || 0;
    this.offsetHeight = geometry.height || 0;
    this.style = new FakeStyle(this);
    this.hidden = false;
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }
  dispatch(type, properties = {}) {
    const event = {
      type,
      button: 0,
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
      ...properties,
      currentTarget: this
    };
    if (!event.target) event.target = this;
    for (const handler of this.listeners.get(type) || []) handler(event);
  }
  append(child) {
    this.children.push(child);
  }
  insertBefore(child) {
    this.children.push(child);
  }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
  removeAttribute(name) {
    this.attributes.delete(name);
  }
  getAttribute(name) {
    return this.attributes.get(name) || null;
  }
  querySelector(selector) {
    if (selector === ".preview-modal__card") return card;
    if (selector === ".preview-modal__toolbar") return toolbar;
    if (selector === ".preview-modal__actions") return actions;
    if (selector === "[data-preview-close]") return close;
    return null;
  }
  closest() {
    return null;
  }
  setPointerCapture() {}
  releasePointerCapture() {}
}
const modal = new FakeElement("modal");
modal.classList.add("is-open");
modal.dataset.previewArchive = "";
const card = new FakeElement("card", { left: 340, top: 160, width: 720, height: 540 });
const toolbar = new FakeElement("toolbar", { left: 340, top: 160, width: 720, height: 54 });
const actions = new FakeElement("actions");
const close = new FakeElement("close");
const frame = new FakeElement("frame");
frame.src = "https://crm.test/products/test-product/preview";
frame.setAttribute("src", frame.src);
frame.contentDocument = { querySelector: () => null };
const fakeWindow = new FakeElement("window");
const storage = new Map();
const localStorage = {
  getItem: (key) => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: (key) => storage.delete(key)
};
const document = {
  body: { dataset: { userId: "event-v20" } },
  getElementById: (id) => ({ globalPreviewModal: modal, globalPreviewFrame: frame })[id] || null,
  createElement: (name) => new FakeElement(name),
  querySelector: () => null
};
const execute = new Function(
  "document",
  "window",
  "matchMedia",
  "location",
  "localStorage",
  "innerWidth",
  "innerHeight",
  "requestAnimationFrame",
  "MutationObserver",
  "ResizeObserver",
  "URL",
  "setTimeout",
  "clearTimeout",
  "fetch",
  "confirm",
  "alert",
  js
);
class ImmediateObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    this.callback();
  }
}
execute(
  document,
  fakeWindow,
  () => ({ matches: false }),
  { origin: "https://crm.test", reload() {} },
  localStorage,
  1400,
  1100,
  (callback) => callback(),
  ImmediateObserver,
  class {
    observe() {}
  },
  URL,
  (callback) => {
    callback();
    return 1;
  },
  () => {},
  async () => ({ ok: true }),
  () => false,
  () => {}
);
const resizer = card.children.find((child) => child.dataset.previewResizeV20 === "1");
assert.ok(resizer, "Boyutlandırma tutamacı karta eklenmedi");
const firstWidth = card.offsetWidth;
const firstHeight = card.offsetHeight;
resizer.dispatch("pointerdown", { pointerId: 7, clientX: 1060, clientY: 700 });
fakeWindow.dispatch("pointermove", { pointerId: 7, clientX: 1180, clientY: 780 });
fakeWindow.dispatch("pointerup", { pointerId: 7, clientX: 1180, clientY: 780 });
assert.equal(card.offsetWidth, firstWidth + 120, "Pointer olayı genişliği büyütmedi");
assert.equal(card.offsetHeight, firstHeight + 80, "Pointer olayı yüksekliği büyütmedi");
resizer.dispatch("pointerdown", { pointerId: 8, clientX: 1180, clientY: 780 });
fakeWindow.dispatch("pointermove", { pointerId: 8, clientX: 1020, clientY: 660 });
fakeWindow.dispatch("pointerup", { pointerId: 8, clientX: 1020, clientY: 660 });
assert.equal(card.offsetWidth, firstWidth - 40, "Pointer olayı genişliği küçültmedi");
assert.equal(card.offsetHeight, firstHeight - 40, "Pointer olayı yüksekliği küçültmedi");
const saved = JSON.parse(storage.get("crm-preview-layout-v21:event-v20:product") || "null");
assert.deepEqual(
  { width: saved?.width, height: saved?.height },
  { width: card.offsetWidth, height: card.offsetHeight },
  "Sürüklenen boyut kullanıcı bazında kaydedilmedi"
);
const leftBefore = card.offsetLeft;
const topBefore = card.offsetTop;
toolbar.dispatch("mousedown", { clientX: 500, clientY: 180 });
fakeWindow.dispatch("mousemove", { clientX: 570, clientY: 225 });
fakeWindow.dispatch("mouseup", { clientX: 570, clientY: 225 });
assert.equal(card.offsetLeft, leftBefore + 70, "Fare yedeği kartı yatay taşımadı");
assert.equal(card.offsetTop, topBefore + 45, "Fare yedeği kartı dikey taşımadı");

console.log(
  "CRMV1_20_EXISTING_TENANT_RECONCILE=45_OK; OLD_32_EXACT=OK; NEW_12_PRESERVED=OK; PRODUCT_PREVIEW_POINTER_AND_MOUSE_EVENT_SIMULATION=OK"
);
