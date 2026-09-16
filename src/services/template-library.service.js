import { db } from "../db/db.js";
import { id } from "../utils/id.js";

export const legacyV112TemplatePresets = [
  [
    "corporate-main",
    "Kurumsal Mavi",
    "Klasik kurumsal mavi çizgiler",
    "classic",
    "#245ba7",
    "#d83238",
    "Inter"
  ],
  [
    "executive-slate",
    "Executive Slate",
    "Yönetici sunumları için koyu gri düzen",
    "executive",
    "#243447",
    "#c99a3d",
    "Georgia"
  ],
  [
    "medical-clean",
    "Medical Clean",
    "Sağlık ve laboratuvar için temiz görünüm",
    "cleanlab",
    "#087f8c",
    "#2aa198",
    "Arial"
  ],
  [
    "laboratory-blue",
    "Laboratuvar Mavisi",
    "Teknik cihaz teklifleri için bilimsel görünüm",
    "technical",
    "#185adb",
    "#00a8cc",
    "Inter"
  ],
  [
    "industrial-carbon",
    "Industrial Carbon",
    "Endüstriyel projeler için güçlü koyu stil",
    "graphite",
    "#252a34",
    "#ff7b00",
    "Arial"
  ],
  [
    "export-navy",
    "İhracat Navy",
    "İhracat teklifleri için resmi lacivert düzen",
    "export",
    "#14213d",
    "#fca311",
    "Georgia"
  ],
  [
    "minimal-white",
    "Minimal Beyaz",
    "Bol beyaz alanlı sade proforma",
    "minimal",
    "#334155",
    "#94a3b8",
    "Inter"
  ],
  ["red-line", "Red Line", "Kırmızı vurgulu dinamik düzen", "redline", "#b91c1c", "#ef4444", "Arial"],
  [
    "emerald-pro",
    "Emerald Pro",
    "Yeşil kurumsal ve sürdürülebilir görünüm",
    "emerald",
    "#047857",
    "#34d399",
    "Inter"
  ],
  [
    "royal-gold",
    "Royal Gold",
    "Premium altın ve lacivert birleşimi",
    "gold",
    "#172554",
    "#d4a017",
    "Georgia"
  ],
  ["skyline", "Skyline", "Açık mavi modern kart düzeni", "skyline", "#0369a1", "#38bdf8", "Inter"],
  [
    "matrix-dark",
    "Matrix Dark",
    "Koyu teknik ve dijital stil",
    "matrix",
    "#111827",
    "#22c55e",
    "Courier New"
  ],
  [
    "visual-product",
    "Visual Product",
    "Ürün görsellerini öne çıkaran tasarım",
    "visual",
    "#6d28d9",
    "#a78bfa",
    "Inter"
  ],
  [
    "compact-business",
    "Compact Business",
    "Çok ürünlü tekliflerde kompakt görünüm",
    "compact",
    "#0f766e",
    "#14b8a6",
    "Arial"
  ],
  ["navy-board", "Navy Board", "Lacivert pano ve net tablo yapısı", "navy", "#1e3a8a", "#60a5fa", "Inter"],
  [
    "clean-lab-green",
    "CleanLab Green",
    "Laboratuvar ve çevre projeleri için yeşil",
    "cleanlab",
    "#166534",
    "#86efac",
    "Arial"
  ],
  [
    "orange-energy",
    "Enerji Turuncu",
    "Enerji ve saha projeleri için canlı turuncu",
    "technical",
    "#9a3412",
    "#fb923c",
    "Inter"
  ],
  [
    "violet-innovation",
    "Innovation Violet",
    "Ar-Ge ve teknoloji teklifleri için mor",
    "skyline",
    "#5b21b6",
    "#c4b5fd",
    "Inter"
  ],
  ["ocean-teal", "Ocean Teal", "Turkuaz ve deniz mavisi dengesi", "emerald", "#0f766e", "#67e8f9", "Arial"],
  [
    "black-premium",
    "Black Premium",
    "Siyah ve altın premium proforma",
    "executive",
    "#111111",
    "#d4af37",
    "Georgia"
  ],
  [
    "classic-bordeaux",
    "Classic Bordeaux",
    "Bordo ve krem klasik düzen",
    "classic",
    "#7f1d1d",
    "#d97706",
    "Georgia"
  ],
  [
    "steel-engineering",
    "Steel Engineering",
    "Mühendislik ve imalat için çelik tonları",
    "graphite",
    "#334155",
    "#64748b",
    "Arial"
  ],
  [
    "cyan-technology",
    "Cyan Technology",
    "Yazılım ve otomasyon projeleri için cyan",
    "matrix",
    "#0f172a",
    "#06b6d4",
    "Courier New"
  ],
  [
    "rose-modern",
    "Rose Modern",
    "Modern pembe ve koyu gri kontrast",
    "visual",
    "#9f1239",
    "#fb7185",
    "Inter"
  ],
  [
    "forest-corporate",
    "Forest Corporate",
    "Orman yeşili kurumsal düzen",
    "executive",
    "#14532d",
    "#4ade80",
    "Georgia"
  ],
  [
    "sand-minimal",
    "Sand Minimal",
    "Kum tonlarında sıcak minimal tasarım",
    "minimal",
    "#78350f",
    "#fbbf24",
    "Inter"
  ],
  ["ice-blue", "Ice Blue", "Açık buz mavisi ve net çizgiler", "skyline", "#075985", "#bae6fd", "Arial"],
  [
    "defense-olive",
    "Savunma Olive",
    "Savunma ve ağır sanayi için zeytin tonu",
    "technical",
    "#3f6212",
    "#a3e635",
    "Arial"
  ],
  [
    "university-indigo",
    "Üniversite Indigo",
    "Akademik kurumlar için indigo düzen",
    "classic",
    "#3730a3",
    "#818cf8",
    "Georgia"
  ],
  ["public-tender", "Kamu İhale", "Resmi kamu ve ihale görünümü", "export", "#1f2937", "#2563eb", "Arial"],
  [
    "mono-document",
    "Mono Document",
    "Siyah beyaz yazıcı dostu tasarım",
    "compact",
    "#111827",
    "#6b7280",
    "Courier New"
  ],
  [
    "arteva-signature",
    "ARTEVA Signature",
    "Kırmızı, siyah ve beyaz kurumsal imza",
    "redline",
    "#8b1e1e",
    "#111827",
    "Inter"
  ]
];

export const currentTemplatePresets = [
  [
    "silver-executive",
    "Silver Executive",
    "İnce çizgili klasik yönetici sunumu",
    "executive",
    "#64748b",
    "#1f4f8f",
    "Georgia"
  ],
  [
    "navy-corporate",
    "Navy Corporate",
    "Lacivert teknik kurumsal görünüm",
    "navy",
    "#123b73",
    "#3b82f6",
    "Inter"
  ],
  [
    "graphite-pro",
    "Graphite Pro",
    "Koyu üst bloklu modern tasarım",
    "graphite",
    "#334155",
    "#0f766e",
    "Arial"
  ],
  [
    "export-fca",
    "Export FCA",
    "İhracat ve FCA teslim odaklı tasarım",
    "export",
    "#0f766e",
    "#0f172a",
    "Georgia"
  ],
  [
    "minimal-offer",
    "Minimal Offer",
    "Sade ve ferah ticari teklif düzeni",
    "minimal",
    "#0284c7",
    "#111827",
    "Inter"
  ],
  [
    "technical-lab",
    "Technical Lab",
    "Teknik açıklamalar için laboratuvar düzeni",
    "technical",
    "#0f4c81",
    "#d97706",
    "Arial"
  ],
  [
    "compact-corporate",
    "Compact Corporate",
    "Uzun kalemli tekliflerde kompakt yapı",
    "compact",
    "#475569",
    "#0f766e",
    "Arial"
  ],
  [
    "skyline-blue",
    "Skyline Blue",
    "Üst bantlı mavi kurumsal teklif tasarımı",
    "skyline",
    "#1d4ed8",
    "#0ea5e9",
    "Inter"
  ],
  [
    "emerald-frame",
    "Emerald Frame",
    "Yeşil çerçeveli dengeli teklif düzeni",
    "emerald",
    "#047857",
    "#14b8a6",
    "Inter"
  ],
  [
    "gold-balance",
    "Gold Balance",
    "Prestijli tekliflerde altın vurgu ve sade tablo",
    "gold",
    "#92400e",
    "#d97706",
    "Inter"
  ],
  [
    "slate-matrix",
    "Slate Matrix",
    "Teknik satırlarda net çizgili modern tablo",
    "matrix",
    "#1f2937",
    "#64748b",
    "Inter"
  ],
  [
    "clean-lab-plus",
    "Clean Lab Plus",
    "Laboratuvar teklifleri için ferah ve simetrik düzen",
    "cleanlab",
    "#0369a1",
    "#38bdf8",
    "Inter"
  ]
];

export const artevaReferenceTemplatePreset = Object.freeze([
  "arteva-tek260075-original",
  "ARTEVA TEK260075 Klasik (Orijinal)",
  "Verilen TEK260075 PDF düzeni; firma, müşteri, ürün, toplam, koşul, banka ve imza yapısı",
  "arteva-classic",
  "#1f2937",
  "#d83238",
  "Arial"
]);

export const professionalTemplatePresets = [
  ...legacyV112TemplatePresets,
  artevaReferenceTemplatePreset,
  ...currentTemplatePresets
];

export const legacyV112TemplateKeys = Object.freeze(legacyV112TemplatePresets.map((preset) => preset[0]));
export const builtInTemplateKeys = Object.freeze([
  ...new Set(professionalTemplatePresets.map((preset) => preset[0]))
]);
export const legacyTemplateSettings = Object.freeze({
  show_logo: true,
  show_images: true,
  show_code: true,
  show_vat: true,
  show_discount: true,
  show_fx: true,
  show_bank: true,
  show_stamp: true,
  show_customer_approval: true,
  show_alternative_badge: true,
  alternative_badge_color: "#f59e0b",
  alternative_badge_text_color: "#3b2200",
  alternative_badge_position: "top-left",
  use_custom_html: false
});

export const artevaClassicTemplate = Object.freeze({
  template_key: artevaReferenceTemplatePreset[0],
  name: artevaReferenceTemplatePreset[1],
  description: artevaReferenceTemplatePreset[2],
  layout_key: "arteva-classic",
  primary_color: "#1f2937",
  accent_color: "#d83238",
  font_family: "Arial",
  font_size: 11
});

const templateLibraryReleaseKey = "template_library_release_v120";

const structuralSettingKeys = [
  "header_variant",
  "customer_variant",
  "item_variant",
  "terms_variant",
  "bank_variant",
  "signature_variant",
  "border_style",
  "logo_position",
  "card_radius",
  "title_variant",
  "totals_variant",
  "footer_variant",
  "spacing_variant",
  "table_density",
  "image_variant"
];

export function restoreLegacyTemplateLibrary(tenantId) {
  if (!tenantId || !builtInTemplateKeys.length) return 0;
  ensureProfessionalTemplateLibrary(tenantId);
  const placeholders = builtInTemplateKeys.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT id,settings_json FROM quote_templates
       WHERE tenant_id=? AND template_key IN (${placeholders})`
    )
    .all(tenantId, ...builtInTemplateKeys);
  const update = db.prepare(
    `UPDATE quote_templates
     SET settings_json=?,deleted_at=NULL,deleted_by=NULL,updated_at=?
     WHERE tenant_id=? AND id=?`
  );
  const now = Date.now();
  db.transaction(() => {
    for (const row of rows) {
      let saved = {};
      try {
        saved = JSON.parse(row.settings_json || "{}");
      } catch {}
      const settings = { ...legacyTemplateSettings, ...saved, design_version: 1 };
      for (const key of structuralSettingKeys) delete settings[key];
      update.run(JSON.stringify(settings), now, tenantId, row.id);
    }
  })();
  return rows.length;
}

export function restoreV112TemplateLibrary(tenantId) {
  if (!tenantId) return 0;
  ensureProfessionalTemplateLibrary(tenantId);
  const now = Date.now();
  const blocks = JSON.stringify([
    "header",
    "customer",
    "items",
    "totals",
    "terms",
    "bank",
    "signature",
    "footer"
  ]);
  const settings = JSON.stringify({ ...legacyTemplateSettings, design_version: 1, show_footer: true });
  const update = db.prepare(
    `UPDATE quote_templates
     SET name=?,description=?,layout_key=?,primary_color=?,accent_color=?,font_family=?,font_size=11,
         settings_json=?,block_order_json=?,deleted_at=NULL,deleted_by=NULL,updated_at=?
     WHERE tenant_id=? AND template_key=?`
  );
  let restored = 0;
  db.transaction(() => {
    for (const [key, name, description, layout, primary, accent, font] of legacyV112TemplatePresets) {
      restored += update.run(
        name,
        description,
        layout,
        primary,
        accent,
        font,
        settings,
        blocks,
        now,
        tenantId,
        key
      ).changes;
    }
  })();
  return restored;
}

export function ensureProfessionalTemplateLibrary(tenantId) {
  if (!tenantId) return 0;
  const now = Date.now();
  const exists = db.prepare("SELECT 1 FROM quote_templates WHERE tenant_id=? AND template_key=? LIMIT 1");
  const insert = db.prepare(
    `INSERT INTO quote_templates(id,tenant_id,template_key,name,description,layout_key,primary_color,accent_color,font_family,font_size,settings_json,block_order_json,is_default,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  );
  let added = 0;
  db.transaction(() => {
    for (const [key, name, description, layout, primary, accent, font] of professionalTemplatePresets) {
      if (exists.get(tenantId, key)) continue;
      insert.run(
        id("tpl"),
        tenantId,
        key,
        name,
        description,
        layout,
        primary,
        accent,
        font,
        11,
        JSON.stringify(legacyTemplateSettings),
        JSON.stringify(["header", "customer", "items", "totals", "terms", "bank", "signature", "footer"]),
        key === "corporate-main" ? 1 : 0,
        now,
        now
      );
      added++;
    }
  })();
  return added;
}

export function restoreArtevaClassicTemplate(tenantId, makeDefault = true) {
  if (!tenantId) return 0;
  ensureProfessionalTemplateLibrary(tenantId);
  const now = Date.now();
  const settings = JSON.stringify({ ...legacyTemplateSettings, design_version: 1, show_footer: true });
  const blocks = JSON.stringify([
    "header",
    "customer",
    "items",
    "totals",
    "terms",
    "bank",
    "signature",
    "footer"
  ]);
  return db.transaction(() => {
    if (makeDefault) {
      db.prepare("UPDATE quote_templates SET is_default=0 WHERE tenant_id=?").run(tenantId);
      db.prepare(
        `UPDATE user_ui_settings SET default_template_key=?,updated_at=?
         WHERE user_id IN (SELECT id FROM users WHERE tenant_id=?)`
      ).run(artevaClassicTemplate.template_key, now, tenantId);
    }
    return db
      .prepare(
        `UPDATE quote_templates
         SET name=?,description=?,layout_key=?,primary_color=?,accent_color=?,font_family=?,font_size=?,
             settings_json=?,block_order_json=?,is_default=?,deleted_at=NULL,deleted_by=NULL,updated_at=?
         WHERE tenant_id=? AND template_key=?`
      )
      .run(
        artevaClassicTemplate.name,
        artevaClassicTemplate.description,
        artevaClassicTemplate.layout_key,
        artevaClassicTemplate.primary_color,
        artevaClassicTemplate.accent_color,
        artevaClassicTemplate.font_family,
        artevaClassicTemplate.font_size,
        settings,
        blocks,
        makeDefault ? 1 : 0,
        now,
        tenantId,
        artevaClassicTemplate.template_key
      ).changes;
  })();
}

export function reconcileTemplateLibraryV120(tenantId, { force = false } = {}) {
  if (!tenantId) return { applied: false, added: 0, old: 0, total: 0 };
  const marker = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
    .get(tenantId, templateLibraryReleaseKey);
  const placeholders = builtInTemplateKeys.map(() => "?").join(",");
  const storedBuiltIns = Number(
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM quote_templates
         WHERE tenant_id=? AND template_key IN (${placeholders})`
      )
      .get(tenantId, ...builtInTemplateKeys)?.n || 0
  );
  /* İşaret tek başına yeterli değildir. Önceki yarım/yanlış bir dağıtım aynı
     işareti yazmış olsa bile fiziksel 45 hazır kayıt yoksa kütüphaneyi yeniden
     kur. Silinen şablonun satırı veritabanında kaldığı için kullanıcının daha
     sonra bilinçli olarak sildiği bir tasarım tekrar açılmaz. */
  if (marker && storedBuiltIns === builtInTemplateKeys.length && !force) {
    const total = db
      .prepare("SELECT COUNT(*) AS n FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0")
      .get(tenantId)?.n;
    return {
      applied: false,
      added: 0,
      old: legacyV112TemplatePresets.length,
      total: Number(total || 0)
    };
  }
  const now = Date.now();
  return db.transaction(() => {
    const added = ensureProfessionalTemplateLibrary(tenantId);
    const old = restoreV112TemplateLibrary(tenantId);
    /* Kütüphaneyi geri getirmek kullanıcının seçili varsayılanını değiştirmez. */
    restoreArtevaClassicTemplate(tenantId, false);
    const total = db
      .prepare("SELECT COUNT(*) AS n FROM quote_templates WHERE tenant_id=? AND COALESCE(deleted_at,0)=0")
      .get(tenantId)?.n;
    db.prepare(
      `INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?)
       ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at`
    ).run(
      tenantId,
      templateLibraryReleaseKey,
      JSON.stringify({
        old: legacyV112TemplatePresets.length,
        current: currentTemplatePresets.length,
        total
      }),
      now
    );
    return { applied: true, added, old, total: Number(total || 0) };
  })();
}
