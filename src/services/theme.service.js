import { db } from "../db/db.js";
export const themes = [
  {
    key: "silver-executive",
    name: "Gümüş Yönetim",
    primary: "#245ba7",
    accent: "#e23b3f",
    page: "#f4f7fb",
    card: "#ffffff",
    border: "#dbe5f2",
    text: "#14233d",
    muted: "#718198"
  },
  {
    key: "navy-corporate",
    name: "Lacivert Kurumsal",
    primary: "#123b73",
    accent: "#d7282f",
    page: "#eef4fb",
    card: "#ffffff",
    border: "#d4e0ef",
    text: "#10213b",
    muted: "#6e7d90"
  },
  {
    key: "graphite-pro",
    name: "Kompakt Operasyon",
    primary: "#334155",
    accent: "#0f766e",
    page: "#f3f5f7",
    card: "#ffffff",
    border: "#d6dae1",
    text: "#172033",
    muted: "#667085"
  },
  {
    key: "emerald-flow",
    name: "Akış Yönetimi",
    primary: "#0f766e",
    accent: "#2563eb",
    page: "#effaf7",
    card: "#ffffff",
    border: "#d5ebe6",
    text: "#16352f",
    muted: "#667f78"
  },
  {
    key: "violet-studio",
    name: "Yaratıcı Yönetim",
    primary: "#6d28d9",
    accent: "#ea580c",
    page: "#f6f3ff",
    card: "#ffffff",
    border: "#e3dcf5",
    text: "#251a3c",
    muted: "#7b7190"
  },
  {
    key: "midnight-ops",
    name: "Gece Operasyon",
    primary: "#38bdf8",
    accent: "#f59e0b",
    page: "#071426",
    card: "#0f223d",
    border: "#24415f",
    text: "#e8f3ff",
    muted: "#9ab0c7"
  },
  {
    key: "rose-finance",
    name: "Finans Akışı",
    primary: "#be185d",
    accent: "#7c3aed",
    page: "#fff1f6",
    card: "#ffffff",
    border: "#f4c7da",
    text: "#4a1730",
    muted: "#8b6576"
  },
  {
    key: "amber-industry",
    name: "Endüstri Kontrol",
    primary: "#b45309",
    accent: "#1f2937",
    page: "#fff8e8",
    card: "#fffcf5",
    border: "#ead7ac",
    text: "#382a18",
    muted: "#806f58"
  },
  {
    key: "cyan-lab",
    name: "Laboratuvar Yönetim",
    primary: "#0e7490",
    accent: "#14b8a6",
    page: "#ecfeff",
    card: "#ffffff",
    border: "#b9e8ef",
    text: "#12343b",
    muted: "#5d7d83"
  },
  {
    key: "mono-editorial",
    name: "Editoryal Sade",
    primary: "#111827",
    accent: "#6b7280",
    page: "#f7f7f5",
    card: "#ffffff",
    border: "#d6d3d1",
    text: "#171717",
    muted: "#737373"
  },
  {
    key: "copper-luxe",
    name: "Bakır Zarafet",
    primary: "#9a3412",
    accent: "#ca8a04",
    page: "#fff7ed",
    card: "#fffdf8",
    border: "#e7c7ad",
    text: "#3f2115",
    muted: "#876657"
  },
  {
    key: "forest-command",
    name: "Saha Komuta",
    primary: "#166534",
    accent: "#84cc16",
    page: "#f0fdf4",
    card: "#ffffff",
    border: "#c8e6cf",
    text: "#173322",
    muted: "#627b68"
  },
  {
    key: "electric-pop",
    name: "Dinamik Satış",
    primary: "#2563eb",
    accent: "#f43f5e",
    page: "#f5f3ff",
    card: "#ffffff",
    border: "#d8d2ff",
    text: "#221b46",
    muted: "#746d94"
  },
  {
    key: "sandstone-calm",
    name: "Sakin Ofis",
    primary: "#78716c",
    accent: "#0f766e",
    page: "#faf7f2",
    card: "#fffdf9",
    border: "#ded6ca",
    text: "#332f2b",
    muted: "#7f7770"
  },
  {
    key: "dark-invert",
    name: "Gece / Gündüz",
    primary: "#ffffff",
    accent: "#60a5fa",
    page: "#050505",
    card: "#151515",
    border: "#3a3a3a",
    text: "#ffffff",
    muted: "#bdbdbd"
  },
  {
    key: "minimal-air",
    name: "Sade Yönetim",
    primary: "#111827",
    accent: "#64748b",
    page: "#ffffff",
    card: "#ffffff",
    border: "#e5e7eb",
    text: "#111827",
    muted: "#6b7280",
    font_family: "Inter",
    radius: 6,
    card_radius: 6,
    button_radius: 6,
    input_radius: 6,
    table_radius: 6,
    sidebar_width: 238,
    density: "compact",
    sidebar_key: "silver-tree",
    icon_pack: "line",
    table_row_height: 40,
    heading_weight: 700
  },
  {
    key: "apple-glass",
    name: "Cam Zarif",
    primary: "#0071e3",
    accent: "#34c759",
    page: "#f5f5f7",
    card: "#ffffff",
    border: "#d2d2d7",
    text: "#1d1d1f",
    muted: "#6e6e73",
    font_family: "Inter",
    radius: 20,
    card_radius: 22,
    button_radius: 18,
    input_radius: 14,
    table_radius: 16,
    sidebar_width: 260,
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "soft",
    table_row_height: 48,
    heading_weight: 750
  },
  {
    key: "tesla-crimson",
    name: "Kızıl Çizgi",
    primary: "#e82127",
    accent: "#111111",
    page: "#f4f4f4",
    card: "#ffffff",
    border: "#d7d7d7",
    text: "#171717",
    muted: "#666666",
    font_family: "Arial",
    radius: 2,
    card_radius: 4,
    button_radius: 2,
    input_radius: 2,
    table_radius: 2,
    sidebar_width: 246,
    density: "compact",
    sidebar_key: "red-line",
    icon_pack: "line",
    table_row_height: 44,
    heading_weight: 900
  },
  {
    key: "microsoft-fluent",
    name: "Mavi Akış",
    primary: "#0067b8",
    accent: "#7fba00",
    page: "#f3f2f1",
    card: "#ffffff",
    border: "#d2d0ce",
    text: "#201f1e",
    muted: "#605e5c",
    font_family: "Segoe UI",
    radius: 8,
    card_radius: 8,
    button_radius: 4,
    input_radius: 4,
    table_radius: 6,
    sidebar_width: 258,
    density: "comfortable",
    sidebar_key: "paket-erp",
    icon_pack: "line",
    table_row_height: 46,
    heading_weight: 700
  },
  {
    key: "google-material",
    name: "Canlı Modern",
    primary: "#1a73e8",
    accent: "#fbbc04",
    page: "#f8fafd",
    card: "#ffffff",
    border: "#dadce0",
    text: "#202124",
    muted: "#5f6368",
    font_family: "Arial",
    radius: 16,
    card_radius: 16,
    button_radius: 20,
    input_radius: 12,
    table_radius: 12,
    sidebar_width: 256,
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "soft",
    table_row_height: 48,
    heading_weight: 700
  },
  {
    key: "bosch-engineering",
    name: "Endüstriyel Mavi",
    primary: "#007bc0",
    accent: "#ed0007",
    page: "#f2f4f5",
    card: "#ffffff",
    border: "#c6cbd0",
    text: "#2e3033",
    muted: "#697279",
    font_family: "Arial",
    radius: 0,
    card_radius: 2,
    button_radius: 0,
    input_radius: 0,
    table_radius: 0,
    sidebar_width: 250,
    density: "compact",
    sidebar_key: "red-line",
    icon_pack: "square",
    table_row_height: 43,
    heading_weight: 800
  },
  {
    key: "laboratory-sterile",
    name: "Steril Laboratuvar",
    primary: "#007c91",
    accent: "#20b2aa",
    page: "#eefbfc",
    card: "#ffffff",
    border: "#b8e3e7",
    text: "#123b43",
    muted: "#5f7f84",
    font_family: "Inter",
    radius: 12,
    card_radius: 14,
    button_radius: 10,
    input_radius: 10,
    table_radius: 12,
    sidebar_width: 252,
    density: "comfortable",
    sidebar_key: "silver-tree",
    icon_pack: "line",
    table_row_height: 47,
    heading_weight: 800
  },
  {
    key: "dark-pro",
    name: "Gece Kurumsal",
    primary: "#8ab4f8",
    accent: "#f28b82",
    page: "#0b0f16",
    card: "#151b25",
    border: "#303a49",
    text: "#f3f6fb",
    muted: "#aeb9c8",
    font_family: "Inter",
    radius: 12,
    card_radius: 14,
    button_radius: 10,
    input_radius: 10,
    table_radius: 10,
    sidebar_width: 260,
    density: "compact",
    sidebar_key: "accordion-tree",
    icon_pack: "line",
    table_row_height: 45,
    heading_weight: 800
  },
  {
    key: "neon-grid",
    name: "Neon",
    primary: "#00f5ff",
    accent: "#ff2bd6",
    page: "#070812",
    card: "#101225",
    border: "#2d3566",
    text: "#f3f6ff",
    muted: "#9aa7d7",
    font_family: "Arial",
    radius: 10,
    card_radius: 12,
    button_radius: 4,
    input_radius: 6,
    table_radius: 8,
    sidebar_width: 264,
    density: "compact",
    sidebar_key: "accordion-tree",
    icon_pack: "square",
    table_row_height: 46,
    heading_weight: 900
  },
  {
    key: "carbon-fiber",
    name: "Carbon",
    primary: "#d4d4d8",
    accent: "#f97316",
    page: "#0b0c0f",
    card: "#181a1f",
    border: "#35383f",
    text: "#f4f4f5",
    muted: "#a1a1aa",
    font_family: "Inter",
    radius: 4,
    card_radius: 4,
    button_radius: 4,
    input_radius: 4,
    table_radius: 4,
    sidebar_width: 250,
    density: "dense",
    sidebar_key: "red-line",
    icon_pack: "square",
    table_row_height: 38,
    heading_weight: 900
  },
  {
    key: "midnight-blue",
    name: "Midnight",
    primary: "#60a5fa",
    accent: "#fbbf24",
    page: "#061225",
    card: "#0d203b",
    border: "#244568",
    text: "#ecf5ff",
    muted: "#91a9c0",
    font_family: "Inter",
    radius: 16,
    card_radius: 18,
    button_radius: 14,
    input_radius: 12,
    table_radius: 14,
    sidebar_width: 270,
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "soft",
    table_row_height: 50,
    heading_weight: 800
  },
  {
    key: "emerald-suite",
    name: "Emerald",
    primary: "#047857",
    accent: "#a3e635",
    page: "#ecfdf5",
    card: "#ffffff",
    border: "#bbf7d0",
    text: "#163229",
    muted: "#5f766d",
    font_family: "Inter",
    radius: 18,
    card_radius: 20,
    button_radius: 14,
    input_radius: 12,
    table_radius: 14,
    sidebar_width: 258,
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "soft",
    table_row_height: 49,
    heading_weight: 800
  },
  {
    key: "royal-blue-gold",
    name: "Royal Blue",
    primary: "#183a8f",
    accent: "#d4af37",
    page: "#f2f5fc",
    card: "#ffffff",
    border: "#cbd6ef",
    text: "#152448",
    muted: "#64708e",
    font_family: "Georgia",
    radius: 8,
    card_radius: 10,
    button_radius: 6,
    input_radius: 6,
    table_radius: 8,
    sidebar_width: 262,
    density: "comfortable",
    sidebar_key: "silver-tree",
    icon_pack: "line",
    table_row_height: 47,
    heading_weight: 800
  },
  {
    key: "ocean-depth",
    name: "Ocean",
    primary: "#0369a1",
    accent: "#06b6d4",
    page: "#eaf8ff",
    card: "#ffffff",
    border: "#b9def0",
    text: "#12384d",
    muted: "#5b7c8c",
    font_family: "Inter",
    radius: 24,
    card_radius: 24,
    button_radius: 18,
    input_radius: 16,
    table_radius: 18,
    sidebar_width: 266,
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "soft",
    table_row_height: 50,
    heading_weight: 750
  },
  {
    key: "classic-paper",
    name: "Klasik Ofis",
    primary: "#5b2c2c",
    accent: "#b89146",
    page: "#f7f1e7",
    card: "#fffdf8",
    border: "#d9c9ae",
    text: "#332820",
    muted: "#74675c",
    font_family: "Georgia",
    radius: 0,
    card_radius: 0,
    button_radius: 0,
    input_radius: 0,
    table_radius: 0,
    sidebar_width: 246,
    density: "compact",
    sidebar_key: "silver-tree",
    icon_pack: "line",
    table_row_height: 44,
    heading_weight: 700
  },
  {
    key: "executive-ink",
    name: "Executive",
    primary: "#172554",
    accent: "#9f7aea",
    page: "#eef1f7",
    card: "#ffffff",
    border: "#cfd7e6",
    text: "#172033",
    muted: "#6b7486",
    font_family: "Inter",
    radius: 10,
    card_radius: 12,
    button_radius: 8,
    input_radius: 8,
    table_radius: 10,
    sidebar_width: 268,
    density: "comfortable",
    sidebar_key: "paket-erp",
    icon_pack: "line",
    table_row_height: 48,
    heading_weight: 850
  },
  {
    key: "premium-plum",
    name: "Yönetici Premium",
    primary: "#581c87",
    accent: "#d4af37",
    page: "#faf5ff",
    card: "#ffffff",
    border: "#e5d5f0",
    text: "#2e173d",
    muted: "#806b8c",
    font_family: "Georgia",
    radius: 20,
    card_radius: 24,
    button_radius: 20,
    input_radius: 14,
    table_radius: 18,
    sidebar_width: 272,
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "soft",
    table_row_height: 51,
    heading_weight: 800
  },
  {
    key: "corporate-sky",
    name: "Corporate",
    primary: "#1e5aa8",
    accent: "#d83238",
    page: "#eef4fb",
    card: "#ffffff",
    border: "#cedbeb",
    text: "#172a46",
    muted: "#6d7c8f",
    font_family: "Inter",
    radius: 12,
    card_radius: 14,
    button_radius: 10,
    input_radius: 10,
    table_radius: 12,
    sidebar_width: 252,
    density: "compact",
    sidebar_key: "silver-tree",
    icon_pack: "line",
    table_row_height: 45,
    heading_weight: 800
  },
  {
    key: "medical-mint",
    name: "Medical",
    primary: "#0f766e",
    accent: "#38bdf8",
    page: "#effcf9",
    card: "#ffffff",
    border: "#c7ebe3",
    text: "#153f3a",
    muted: "#62817c",
    font_family: "Arial",
    radius: 14,
    card_radius: 16,
    button_radius: 12,
    input_radius: 10,
    table_radius: 12,
    sidebar_width: 254,
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "soft",
    table_row_height: 48,
    heading_weight: 800
  },
  {
    key: "industrial-hazard",
    name: "Industrial",
    primary: "#1f2937",
    accent: "#f59e0b",
    page: "#f3f4f6",
    card: "#ffffff",
    border: "#cbd0d7",
    text: "#1f2937",
    muted: "#68707d",
    font_family: "Arial",
    radius: 2,
    card_radius: 4,
    button_radius: 2,
    input_radius: 2,
    table_radius: 2,
    sidebar_width: 248,
    density: "dense",
    sidebar_key: "red-line",
    icon_pack: "square",
    table_row_height: 40,
    heading_weight: 900
  }
];

// Full-fidelity theme blueprints: each preset changes layout, navigation, icons,
// spacing, card language and interaction style — not only the color palette.
const fullThemeBlueprints = {
  "minimal-air": {
    menu_mode: "static",
    density: "compact",
    sidebar_key: "minimal-white",
    icon_pack: "line",
    sidebar_width: 226,
    content_max_width: 1760,
    content_padding_x: 28,
    card_radius: 4,
    card_shadow: 0,
    card_border_width: 1,
    card_padding: 14,
    topbar_height: 54,
    topbar_blur: 0,
    menu_radius: 0,
    menu_height: 42,
    menu_gap: 0,
    menu_icon_radius: 0,
    button_radius: 4,
    input_radius: 4,
    table_radius: 0,
    table_row_height: 40,
    custom_css: `.sidebar{box-shadow:none!important}.menu__item,.menu summary{border-width:0 0 1px!important}.card{box-shadow:none!important}.topbar{backdrop-filter:none!important}.page-head{border-width:0 0 1px!important}.metric,.metric-card,.dashboard-stat{box-shadow:none!important}`
  },
  "apple-glass": {
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_key: "glass-panel",
    icon_pack: "soft-card",
    sidebar_width: 272,
    content_max_width: 1840,
    content_padding_x: 26,
    card_radius: 24,
    card_shadow: 18,
    card_padding: 18,
    topbar_height: 66,
    topbar_blur: 22,
    brand_radius: 26,
    menu_radius: 18,
    menu_height: 50,
    menu_gap: 9,
    menu_icon_radius: 14,
    button_radius: 18,
    input_radius: 14,
    table_radius: 18,
    table_row_height: 50,
    custom_css: `body{background:radial-gradient(circle at 20% 0%,color-mix(in srgb,var(--card) 88%,var(--page)) 0,var(--page) 62%)!important}.sidebar{margin:12px;height:calc(100vh - 24px)!important;border-radius:28px!important;box-shadow:0 24px 60px #00000018!important}.app-main{margin-left:calc(var(--sidebar) + 24px)!important;width:calc(100% - var(--sidebar) - 24px)!important}.topbar{margin:10px 14px 0;border-radius:22px!important;box-shadow:0 10px 35px #00000012!important}.card{backdrop-filter:blur(18px)!important}.btn{border-radius:999px!important}`
  },
  "tesla-crimson": {
    menu_mode: "static",
    density: "compact",
    sidebar_key: "red-line",
    icon_pack: "mono",
    sidebar_width: 238,
    content_max_width: 1900,
    content_padding_x: 22,
    card_radius: 2,
    card_shadow: 0,
    card_padding: 16,
    topbar_height: 58,
    topbar_blur: 0,
    brand_radius: 0,
    menu_radius: 0,
    menu_height: 44,
    menu_gap: 2,
    menu_icon_radius: 0,
    button_radius: 2,
    input_radius: 2,
    table_radius: 0,
    table_row_height: 44,
    heading_weight: 900,
    custom_css: `.topbar{border-top:4px solid var(--accent)!important}.page-head{border-left:7px solid var(--accent)!important}.card{box-shadow:none!important}.menu__item,.menu summary{text-transform:uppercase;letter-spacing:.04em}.btn{text-transform:uppercase;letter-spacing:.04em}.metric strong{font-variant-numeric:tabular-nums}`
  },
  "microsoft-fluent": {
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_key: "paket-erp",
    icon_pack: "outline-blue",
    sidebar_width: 264,
    content_max_width: 1920,
    content_padding_x: 24,
    card_radius: 8,
    card_shadow: 5,
    card_padding: 16,
    topbar_height: 60,
    topbar_blur: 8,
    menu_radius: 4,
    menu_height: 46,
    menu_gap: 4,
    menu_icon_radius: 4,
    button_radius: 4,
    input_radius: 4,
    table_radius: 6,
    table_row_height: 46,
    custom_css: `.page-head{border-left:4px solid var(--primary)!important}.card{box-shadow:0 2px 8px #0000000d!important}.menu__item.is-active,.menu details[open]>summary{box-shadow:inset 3px 0 var(--primary)!important}.btn:hover{transform:none!important;box-shadow:0 2px 5px #0002!important}`
  },
  "google-material": {
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "rounded-fill",
    sidebar_width: 266,
    content_max_width: 1880,
    content_padding_x: 28,
    card_radius: 18,
    card_shadow: 12,
    card_padding: 18,
    topbar_height: 64,
    topbar_blur: 8,
    menu_radius: 16,
    menu_height: 50,
    menu_gap: 8,
    menu_icon_radius: 50,
    button_radius: 22,
    input_radius: 12,
    table_radius: 14,
    table_row_height: 50,
    custom_css: `.card{box-shadow:0 3px 7px #3c40431f,0 1px 2px #3c40431a!important}.btn--primary{box-shadow:0 3px 6px #1a73e844!important}.menu__item.is-active,.menu details[open]>summary{border-color:transparent!important}.icon-btn,.action-icon,.table-action{border-radius:50%!important}`
  },
  "bosch-engineering": {
    menu_mode: "static",
    density: "dense",
    sidebar_key: "technical-panel",
    icon_pack: "square",
    sidebar_width: 244,
    content_max_width: 2000,
    content_padding_x: 18,
    card_radius: 0,
    card_shadow: 0,
    card_padding: 14,
    topbar_height: 56,
    topbar_blur: 0,
    brand_radius: 0,
    menu_radius: 0,
    menu_height: 42,
    menu_gap: 2,
    menu_icon_radius: 0,
    button_radius: 0,
    input_radius: 0,
    table_radius: 0,
    table_row_height: 42,
    custom_css: `body{background-image:linear-gradient(#007bc008 1px,transparent 1px),linear-gradient(90deg,#007bc008 1px,transparent 1px);background-size:24px 24px!important}.card,.page-head{border-width:1px!important;box-shadow:none!important}.card-head,.page-head{border-top:5px solid var(--primary)!important}.menu__item,.menu summary{border-style:dashed!important}.btn{font-weight:900!important}`
  },
  "laboratory-sterile": {
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_key: "light-corporate",
    icon_pack: "line",
    sidebar_width: 254,
    content_max_width: 1860,
    content_padding_x: 24,
    card_radius: 14,
    card_shadow: 4,
    card_padding: 18,
    topbar_height: 62,
    topbar_blur: 12,
    menu_radius: 10,
    menu_height: 48,
    menu_gap: 7,
    menu_icon_radius: 8,
    button_radius: 10,
    input_radius: 10,
    table_radius: 12,
    table_row_height: 48,
    custom_css: `.page-head{background:linear-gradient(90deg,#fff,var(--page))!important}.card{box-shadow:0 8px 24px #007c910d!important}.metric,.metric-card,.dashboard-stat{border-top:3px solid var(--primary)!important}.table-scroll{border:1px solid var(--table-border)!important}`
  },
  "dark-pro": {
    menu_mode: "accordion",
    density: "compact",
    sidebar_key: "dark-executive",
    icon_pack: "glass-icon",
    sidebar_width: 264,
    content_max_width: 1920,
    content_padding_x: 24,
    card_radius: 14,
    card_shadow: 16,
    card_padding: 17,
    topbar_height: 62,
    topbar_blur: 18,
    menu_radius: 10,
    menu_height: 46,
    menu_gap: 6,
    menu_icon_radius: 9,
    button_radius: 10,
    input_radius: 10,
    table_radius: 10,
    table_row_height: 46,
    custom_css: `body{background:linear-gradient(145deg,var(--page),color-mix(in srgb,var(--card) 82%,var(--page)))!important}.card,.page-head{box-shadow:0 14px 40px #0007!important}.topbar{box-shadow:0 8px 25px #0005!important}.sidebar{box-shadow:8px 0 30px #0005!important}.menu__item.is-active,.menu details[open]>summary{box-shadow:0 0 0 1px var(--primary),0 0 20px color-mix(in srgb,var(--primary) 20%,transparent)!important}`
  },
  "neon-grid": {
    menu_mode: "accordion",
    density: "dense",
    sidebar_key: "gradient-pro",
    icon_pack: "emoji-live",
    sidebar_width: 270,
    content_max_width: 1980,
    content_padding_x: 22,
    card_radius: 10,
    card_shadow: 20,
    card_padding: 15,
    topbar_height: 60,
    topbar_blur: 16,
    menu_radius: 8,
    menu_height: 44,
    menu_gap: 5,
    menu_icon_radius: 5,
    button_radius: 4,
    input_radius: 6,
    table_radius: 6,
    table_row_height: 44,
    custom_css: `body{background-image:linear-gradient(color-mix(in srgb,var(--primary) 5%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--accent) 5%,transparent) 1px,transparent 1px);background-size:28px 28px!important}.sidebar{background:linear-gradient(180deg,var(--sidebar-bg),color-mix(in srgb,var(--primary) 24%,var(--sidebar-bg)))!important}.card,.page-head{box-shadow:0 0 0 1px color-mix(in srgb,var(--primary) 15%,transparent),0 0 28px color-mix(in srgb,var(--accent) 8%,transparent)!important}.btn--primary{box-shadow:0 0 18px color-mix(in srgb,var(--primary) 55%,transparent)!important}.menu__item.is-active,.menu details[open]>summary{text-shadow:0 0 10px var(--primary)}`
  },
  "classic-paper": {
    menu_mode: "static",
    density: "comfortable",
    sidebar_key: "classic-office",
    icon_pack: "sketch",
    sidebar_width: 250,
    content_max_width: 1760,
    content_padding_x: 34,
    card_radius: 0,
    card_shadow: 2,
    card_padding: 20,
    topbar_height: 56,
    topbar_blur: 0,
    menu_radius: 0,
    menu_height: 44,
    menu_gap: 0,
    menu_icon_radius: 0,
    button_radius: 0,
    input_radius: 0,
    table_radius: 0,
    table_row_height: 46,
    custom_css: `body{background-color:var(--page)!important;background-image:repeating-linear-gradient(0deg,#00000002 0,#00000002 1px,transparent 1px,transparent 4px)!important}.card,.page-head{border:1px solid var(--border)!important;box-shadow:3px 3px 0 color-mix(in srgb,var(--border) 72%,transparent)!important}.topbar{border-bottom:3px double var(--border)!important}.btn{font-family:Georgia,serif!important}.table th{text-transform:uppercase;letter-spacing:.05em}`
  },
  "premium-plum": {
    menu_mode: "hover",
    density: "comfortable",
    sidebar_key: "neumorph-drawer",
    icon_pack: "soft-card",
    sidebar_width: 276,
    content_max_width: 1860,
    content_padding_x: 30,
    card_radius: 26,
    card_shadow: 22,
    card_padding: 20,
    topbar_height: 68,
    topbar_blur: 22,
    brand_radius: 26,
    menu_radius: 18,
    menu_height: 52,
    menu_gap: 10,
    menu_icon_radius: 14,
    button_radius: 22,
    input_radius: 14,
    table_radius: 18,
    table_row_height: 52,
    custom_css: `body{background:radial-gradient(circle at 15% 0%,color-mix(in srgb,var(--card) 88%,var(--page)) 0,var(--page) 60%)!important}.sidebar{background:linear-gradient(180deg,var(--sidebar-bg),color-mix(in srgb,var(--primary) 28%,var(--sidebar-bg)))!important;border-radius:0 30px 30px 0!important}.sidebar .menu__item,.sidebar .menu summary{box-shadow:inset 3px 3px 8px #0002,inset -2px -2px 7px #fff2!important}.card,.page-head{box-shadow:0 22px 55px color-mix(in srgb,var(--primary) 12%,transparent)!important}.btn--primary{background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 28%,var(--primary)))!important;border:0!important}`
  },
  "industrial-hazard": {
    menu_mode: "static",
    density: "dense",
    sidebar_key: "red-line",
    icon_pack: "square",
    sidebar_width: 240,
    content_max_width: 2040,
    content_padding_x: 16,
    card_radius: 2,
    card_shadow: 0,
    card_padding: 13,
    topbar_height: 54,
    topbar_blur: 0,
    menu_radius: 2,
    menu_height: 40,
    menu_gap: 3,
    menu_icon_radius: 2,
    button_radius: 2,
    input_radius: 2,
    table_radius: 2,
    table_row_height: 39,
    custom_css: `.page-head{border-left:10px solid #f59e0b!important;background:repeating-linear-gradient(-45deg,#fff,#fff 10px,#fff7db 10px,#fff7db 20px)!important}.card{box-shadow:none!important}.btn--primary{background:#1f2937!important;border-color:#1f2937!important}.menu__item.is-active,.menu details[open]>summary{background:#f59e0b!important;color:#111827!important}.table th{border-bottom:3px solid #f59e0b!important}`
  }
};
const themeStructureDefaults = {
  menu_mode: "accordion",
  density: "compact",
  sidebar_key: "silver-tree",
  icon_pack: "line",
  sidebar_width: 252,
  font_family: "Inter",
  radius: 12,
  card_radius: 14,
  button_radius: 10,
  input_radius: 10,
  table_radius: 12,
  table_row_height: 46,
  heading_weight: 800,
  content_max_width: 1900,
  content_padding_x: 22,
  card_shadow: 7,
  card_padding: 16,
  topbar_height: 60,
  topbar_blur: 10,
  menu_radius: 12,
  menu_height: 46,
  menu_gap: 6,
  menu_icon_radius: 9
};
const legacyThemeBlueprints = {
  "silver-executive": { sidebar_key: "silver-tree", icon_pack: "corporate", density: "compact" },
  "navy-corporate": { sidebar_key: "navy-rail", icon_pack: "outline-blue", density: "compact" },
  "graphite-pro": {
    sidebar_key: "graphite-compact",
    icon_pack: "mono",
    density: "dense",
    radius: 6,
    card_radius: 8
  },
  "emerald-flow": {
    sidebar_key: "booking-clean",
    icon_pack: "line",
    density: "comfortable",
    radius: 16,
    card_radius: 18
  },
  "violet-studio": {
    sidebar_key: "glass-panel",
    icon_pack: "soft-card",
    density: "comfortable",
    radius: 18,
    card_radius: 20
  },
  "midnight-ops": {
    sidebar_key: "dark-executive",
    icon_pack: "glass-icon",
    density: "compact",
    card_shadow: 16
  },
  "rose-finance": { sidebar_key: "sidebar-card", icon_pack: "soft-card", density: "comfortable", radius: 16 },
  "amber-industry": {
    sidebar_key: "technical-panel",
    icon_pack: "square",
    density: "dense",
    radius: 4,
    card_radius: 6
  },
  "cyan-lab": { sidebar_key: "light-corporate", icon_pack: "line", density: "comfortable", radius: 14 },
  "mono-editorial": {
    sidebar_key: "minimal-white",
    icon_pack: "mono",
    density: "compact",
    radius: 2,
    card_radius: 2
  },
  "copper-luxe": {
    sidebar_key: "classic-office",
    icon_pack: "sketch",
    density: "comfortable",
    font_family: "Georgia",
    radius: 8
  },
  "forest-command": { sidebar_key: "accordion-tree", icon_pack: "corporate", density: "compact", radius: 12 },
  "electric-pop": { sidebar_key: "gradient-pro", icon_pack: "color", density: "comfortable", radius: 18 },
  "sandstone-calm": {
    sidebar_key: "soft-blue",
    icon_pack: "soft-card",
    density: "comfortable",
    font_family: "Georgia",
    radius: 16
  },
  "dark-invert": {
    sidebar_key: "dark-executive",
    icon_pack: "mono",
    density: "dense",
    radius: 8,
    card_shadow: 18
  }
};
// crmv1.11: the 20 systems exposed by the studio are deliberately structural.
// Every legacy palette promoted into the studio gets its own navigation model,
// spacing rhythm, card language and control geometry instead of inheriting one
// common blueprint with a different color set.
const releaseThemeBlueprints = {
  "silver-executive": {
    menu_mode: "accordion",
    density: "compact",
    sidebar_key: "silver-tree",
    icon_pack: "corporate",
    sidebar_width: 252,
    content_max_width: 1920,
    content_padding_x: 22,
    card_radius: 12,
    card_shadow: 7,
    card_padding: 16,
    topbar_height: 60,
    topbar_blur: 8,
    menu_radius: 10,
    menu_height: 45,
    menu_gap: 5,
    menu_icon_radius: 8,
    button_radius: 9,
    input_radius: 9,
    table_radius: 10,
    table_row_height: 45,
    custom_css: `.page-head{border-left:5px solid var(--accent)!important}.card{box-shadow:0 8px 22px color-mix(in srgb,var(--primary) 8%,transparent)!important}.menu__item.is-active,.menu details[open]>summary{box-shadow:inset 3px 0 var(--primary)!important}`
  },
  "navy-corporate": {
    menu_mode: "accordion",
    density: "compact",
    sidebar_key: "navy-rail",
    icon_pack: "outline-blue",
    sidebar_width: 248,
    content_max_width: 1960,
    content_padding_x: 20,
    card_radius: 10,
    card_shadow: 5,
    card_padding: 15,
    topbar_height: 58,
    topbar_blur: 4,
    menu_radius: 8,
    menu_height: 43,
    menu_gap: 4,
    menu_icon_radius: 6,
    button_radius: 7,
    input_radius: 7,
    table_radius: 8,
    table_row_height: 44,
    custom_css: `.page-head{border-left:5px solid var(--primary)!important}.card{box-shadow:0 5px 18px color-mix(in srgb,var(--primary) 8%,transparent)!important}.menu__item.is-active,.menu details[open]>summary{box-shadow:inset 3px 0 var(--accent)!important}`
  },
  "graphite-pro": {
    menu_mode: "static",
    density: "dense",
    sidebar_key: "graphite-compact",
    icon_pack: "mono",
    sidebar_width: 232,
    content_max_width: 2100,
    content_padding_x: 16,
    card_radius: 6,
    card_shadow: 0,
    card_padding: 12,
    topbar_height: 52,
    topbar_blur: 0,
    menu_radius: 4,
    menu_height: 38,
    menu_gap: 3,
    menu_icon_radius: 3,
    button_radius: 5,
    input_radius: 5,
    table_radius: 4,
    table_row_height: 38,
    custom_css: `.card,.page-head{box-shadow:none!important}.page-head{border-width:0 0 2px!important}.menu__item,.menu summary{letter-spacing:.025em!important}.table-scroll{border-width:1px!important}`
  },
  "emerald-flow": {
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_key: "booking-clean",
    icon_pack: "line",
    sidebar_width: 250,
    content_max_width: 1820,
    content_padding_x: 32,
    card_radius: 20,
    card_shadow: 8,
    card_padding: 20,
    topbar_height: 64,
    topbar_blur: 10,
    menu_radius: 12,
    menu_height: 48,
    menu_gap: 4,
    menu_icon_radius: 10,
    button_radius: 14,
    input_radius: 12,
    table_radius: 16,
    table_row_height: 50,
    custom_css: `.card{box-shadow:0 12px 30px color-mix(in srgb,var(--primary) 9%,transparent)!important}.page-head{border-radius:22px!important}.menu details>a{border-left-width:2px!important}`
  },
  "violet-studio": {
    menu_mode: "hover",
    density: "comfortable",
    sidebar_key: "blue-glass",
    icon_pack: "soft-card",
    sidebar_width: 266,
    content_max_width: 1880,
    content_padding_x: 26,
    card_radius: 22,
    card_shadow: 18,
    card_padding: 19,
    topbar_height: 68,
    topbar_blur: 20,
    menu_radius: 17,
    menu_height: 50,
    menu_gap: 8,
    menu_icon_radius: 13,
    button_radius: 18,
    input_radius: 14,
    table_radius: 18,
    table_row_height: 50,
    custom_css: `.sidebar{backdrop-filter:blur(20px)!important}.card{box-shadow:0 18px 42px color-mix(in srgb,var(--primary) 13%,transparent)!important}.btn--primary{box-shadow:0 8px 20px color-mix(in srgb,var(--primary) 24%,transparent)!important}`
  },
  "midnight-ops": {
    menu_mode: "accordion",
    density: "dense",
    sidebar_key: "dark-trip",
    icon_pack: "glass-icon",
    sidebar_width: 258,
    content_max_width: 2040,
    content_padding_x: 18,
    card_radius: 12,
    card_shadow: 20,
    card_padding: 14,
    topbar_height: 56,
    topbar_blur: 16,
    menu_radius: 11,
    menu_height: 41,
    menu_gap: 4,
    menu_icon_radius: 8,
    button_radius: 8,
    input_radius: 8,
    table_radius: 9,
    table_row_height: 42,
    custom_css: `.card,.page-head{box-shadow:0 14px 34px #0006!important}.menu__item.is-active,.menu details[open]>summary{box-shadow:0 0 0 1px color-mix(in srgb,var(--primary) 65%,transparent)!important}.topbar{box-shadow:0 8px 24px #0004!important}`
  },
  "amber-industry": {
    menu_mode: "static",
    density: "dense",
    sidebar_key: "technical-panel",
    icon_pack: "square",
    sidebar_width: 242,
    content_max_width: 2140,
    content_padding_x: 14,
    card_radius: 3,
    card_shadow: 0,
    card_padding: 13,
    topbar_height: 55,
    topbar_blur: 0,
    menu_radius: 2,
    menu_height: 40,
    menu_gap: 2,
    menu_icon_radius: 2,
    button_radius: 2,
    input_radius: 2,
    table_radius: 2,
    table_row_height: 40,
    custom_css: `.card,.page-head{box-shadow:none!important}.page-head{border-left:8px solid var(--accent)!important}.card-head{border-bottom:2px solid var(--border)!important}.table th{border-bottom:3px solid var(--accent)!important}`
  },
  "cyan-lab": {
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_key: "light-corporate",
    icon_pack: "line",
    sidebar_width: 254,
    content_max_width: 1860,
    content_padding_x: 24,
    card_radius: 16,
    card_shadow: 4,
    card_padding: 18,
    topbar_height: 62,
    topbar_blur: 10,
    menu_radius: 10,
    menu_height: 47,
    menu_gap: 7,
    menu_icon_radius: 9,
    button_radius: 10,
    input_radius: 10,
    table_radius: 13,
    table_row_height: 48,
    custom_css: `.metric,.metric-card,.dashboard-stat{border-top:3px solid var(--primary)!important}.card{box-shadow:0 8px 22px color-mix(in srgb,var(--primary) 7%,transparent)!important}.table-scroll{border:1px solid var(--table-border)!important}`
  },
  "mono-editorial": {
    menu_mode: "static",
    density: "compact",
    sidebar_key: "ideasoft-clean",
    icon_pack: "mono",
    sidebar_width: 238,
    content_max_width: 1720,
    content_padding_x: 36,
    card_radius: 0,
    card_shadow: 0,
    card_padding: 21,
    topbar_height: 52,
    topbar_blur: 0,
    menu_radius: 0,
    menu_height: 41,
    menu_gap: 1,
    menu_icon_radius: 0,
    button_radius: 0,
    input_radius: 0,
    table_radius: 0,
    table_row_height: 43,
    custom_css: `.card,.page-head{box-shadow:none!important;border-width:0 0 1px!important}.topbar{border-bottom-width:2px!important}.menu__item,.menu summary{text-transform:none!important}.table th{letter-spacing:.08em!important;text-transform:uppercase!important}`
  },
  "forest-command": {
    menu_mode: "accordion",
    density: "compact",
    sidebar_key: "accordion-tree",
    icon_pack: "corporate",
    sidebar_width: 260,
    content_max_width: 1940,
    content_padding_x: 22,
    card_radius: 11,
    card_shadow: 6,
    card_padding: 16,
    topbar_height: 59,
    topbar_blur: 6,
    menu_radius: 9,
    menu_height: 44,
    menu_gap: 5,
    menu_icon_radius: 8,
    button_radius: 9,
    input_radius: 9,
    table_radius: 10,
    table_row_height: 45,
    custom_css: `.page-head{border-left:5px solid var(--primary)!important}.menu details>a{border-left-color:color-mix(in srgb,var(--primary) 36%,var(--border))!important}.card{box-shadow:0 8px 20px color-mix(in srgb,var(--primary) 8%,transparent)!important}`
  },
  "electric-pop": {
    menu_mode: "hover",
    density: "comfortable",
    sidebar_key: "gradient-pro",
    icon_pack: "color",
    sidebar_width: 268,
    content_max_width: 1900,
    content_padding_x: 27,
    card_radius: 24,
    card_shadow: 17,
    card_padding: 18,
    topbar_height: 66,
    topbar_blur: 18,
    menu_radius: 15,
    menu_height: 49,
    menu_gap: 7,
    menu_icon_radius: 12,
    button_radius: 16,
    input_radius: 13,
    table_radius: 17,
    table_row_height: 49,
    custom_css: `.card{box-shadow:0 15px 38px color-mix(in srgb,var(--primary) 12%,transparent)!important}.btn--primary{background:linear-gradient(135deg,var(--primary),color-mix(in srgb,var(--accent) 35%,var(--primary)))!important}.menu__item.is-active,.menu details[open]>summary{transform:translateX(3px)!important}`
  },
  "sandstone-calm": {
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_key: "soft-blue",
    icon_pack: "soft-card",
    sidebar_width: 256,
    content_max_width: 1780,
    content_padding_x: 34,
    card_radius: 15,
    card_shadow: 2,
    card_padding: 22,
    topbar_height: 61,
    topbar_blur: 3,
    menu_radius: 13,
    menu_height: 47,
    menu_gap: 9,
    menu_icon_radius: 11,
    button_radius: 12,
    input_radius: 11,
    table_radius: 13,
    table_row_height: 48,
    custom_css: `.card{box-shadow:0 5px 14px color-mix(in srgb,var(--text) 6%,transparent)!important}.page-head{border-style:dotted!important}.menu details>a{border-left-style:dotted!important}`
  },
  "rose-finance": {
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_key: "sidebar-card",
    icon_pack: "soft-card",
    sidebar_width: 262,
    content_max_width: 1840,
    content_padding_x: 28,
    card_radius: 18,
    card_shadow: 11,
    card_padding: 19,
    topbar_height: 64,
    topbar_blur: 12,
    menu_radius: 16,
    menu_height: 49,
    menu_gap: 8,
    menu_icon_radius: 13,
    button_radius: 15,
    input_radius: 12,
    table_radius: 15,
    table_row_height: 49,
    custom_css: `.page-head{border-top:4px solid var(--primary)!important}.card{box-shadow:0 14px 34px color-mix(in srgb,var(--primary) 10%,transparent)!important}.metric,.metric-card,.dashboard-stat{border-bottom:3px solid color-mix(in srgb,var(--accent) 55%,var(--border))!important}`
  },
  "copper-luxe": {
    menu_mode: "static",
    density: "comfortable",
    sidebar_key: "classic-office",
    icon_pack: "sketch",
    sidebar_width: 256,
    font_family: "Georgia",
    content_max_width: 1780,
    content_padding_x: 34,
    card_radius: 8,
    card_shadow: 4,
    card_padding: 21,
    topbar_height: 58,
    topbar_blur: 0,
    menu_radius: 5,
    menu_height: 45,
    menu_gap: 3,
    menu_icon_radius: 4,
    button_radius: 6,
    input_radius: 6,
    table_radius: 7,
    table_row_height: 46,
    custom_css: `.page-head{border-bottom:3px double var(--accent)!important}.card{box-shadow:4px 4px 0 color-mix(in srgb,var(--border) 72%,transparent)!important}.table th{text-transform:uppercase!important;letter-spacing:.04em!important}`
  },
  "dark-invert": {
    menu_mode: "static",
    density: "dense",
    sidebar_key: "dark-executive",
    icon_pack: "mono",
    sidebar_width: 244,
    content_max_width: 2020,
    content_padding_x: 18,
    card_radius: 8,
    card_shadow: 18,
    card_padding: 14,
    topbar_height: 56,
    topbar_blur: 14,
    menu_radius: 6,
    menu_height: 41,
    menu_gap: 4,
    menu_icon_radius: 5,
    button_radius: 7,
    input_radius: 7,
    table_radius: 7,
    table_row_height: 41,
    custom_css: `.card,.page-head{box-shadow:0 14px 36px #0008!important}.menu__item,.menu summary{border-color:color-mix(in srgb,var(--text) 24%,var(--border))!important}.menu__item.is-active,.menu details[open]>summary{box-shadow:inset 3px 0 var(--accent)!important}`
  },
  "bosch-engineering": { sidebar_key: "collapsible-pro" }
};
const rgb = (hex) => {
  const value = String(hex || "").replace("#", "");
  return value.length === 6 ? [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16)) : null;
};
const luminance = (hex) => {
  const value = rgb(hex);
  if (!value) return 0;
  const c = value.map((v) => {
    const x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
export const contrastRatio = (a, b) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
export const ensureAccessibleTextColor = (foreground, background) => {
  if (contrastRatio(foreground, background) >= 4.5) return foreground;
  const from = rgb(foreground) || [113, 129, 152],
    target = luminance(background) > 0.42 ? [0, 0, 0] : [255, 255, 255];
  for (let step = 1; step <= 30; step++) {
    const amount = step / 30,
      mixed = from.map((v, i) => Math.round(v + (target[i] - v) * amount)),
      hex = `#${mixed.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
    if (contrastRatio(hex, background) >= 4.5) return hex;
  }
  return luminance(background) > 0.42 ? "#334155" : "#dbe7f5";
};
for (const theme of themes) {
  Object.assign(theme, {
    ...themeStructureDefaults,
    ...theme,
    ...(legacyThemeBlueprints[theme.key] || {}),
    ...(fullThemeBlueprints[theme.key] || {}),
    ...(releaseThemeBlueprints[theme.key] || {})
  });
  theme.muted = ensureAccessibleTextColor(theme.muted, theme.page);
}

export const sidebarCatalog = [
  {
    key: "silver-tree",
    name: "Silver Tree",
    description: "Dengeli kurumsal ağaç menü",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 252
  },
  {
    key: "red-line",
    name: "Red Line",
    description: "Kırmızı çizgili sade kurumsal menü",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 246
  },
  {
    key: "sidebar-card",
    name: "Sidebar Card",
    description: "Yumuşak gölgeli kart tabanlı menü",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 260
  },
  {
    key: "accordion-tree",
    name: "Accordion Tree",
    description: "Alt menüleri çekmece gibi açılan ağaç düzeni",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 258
  },
  {
    key: "paket-erp",
    name: "Paket ERP",
    description: "Mavi seçili çekmeceli ERP menüsü",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 274
  },
  {
    key: "ideasoft-clean",
    name: "Idea Clean",
    description: "Sade ikonlu ince mor vurgulu menü",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 246
  },
  {
    key: "collapsible-pro",
    name: "Collapsible Pro",
    description: "Açılır kapanır profesyonel kart menü",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 260
  },
  {
    key: "booking-clean",
    name: "Booking Clean",
    description: "Ferah beyaz zemin ve turkuaz vurgu",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 246
  },
  {
    key: "neumorph-drawer",
    name: "Neumorph Drawer",
    description: "Kabartmalı çekmece efektli menü",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 260
  },
  {
    key: "hover-rail",
    name: "Hover Rail",
    description: "Dar ikon rayı; üzerine gelince genişler",
    menu_mode: "hover",
    density: "compact",
    sidebar_width: 252
  },
  {
    key: "dark-trip",
    name: "Dark Trip",
    description: "Koyu arka planlı yönetim menüsü",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 252
  },
  {
    key: "blue-glass",
    name: "Blue Glass",
    description: "Mavi cam efektli modern menü",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 258
  },
  {
    key: "admin-blue",
    name: "Admin Blue",
    description: "Klasik mavi yönetim paneli",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 246
  },
  {
    key: "drawer-office",
    name: "Drawer Office",
    description: "Ofis tipi kayan alt menüler",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 258
  },
  {
    key: "navy-rail",
    name: "Navy Rail",
    description: "Lacivert kurumsal ray menü",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 248
  },
  {
    key: "graphite-compact",
    name: "Graphite Compact",
    description: "Kompakt koyu teknik menü",
    menu_mode: "accordion",
    density: "dense",
    sidebar_width: 236
  },
  {
    key: "glass-panel",
    name: "Glass Panel",
    description: "Şeffaf cam kartlı sidebar",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 260
  },
  {
    key: "gradient-pro",
    name: "Gradient Pro",
    description: "Lacivert geçişli profesyonel sidebar",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 256
  },
  {
    key: "technical-panel",
    name: "Technical Panel",
    description: "Keskin çizgili teknik panel",
    menu_mode: "accordion",
    density: "dense",
    sidebar_width: 246
  },
  {
    key: "minimal-white",
    name: "Minimal White",
    description: "Çizgisiz minimal beyaz menü",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 238
  },
  {
    key: "zigzag-flow",
    name: "Zigzag Flow",
    description: "Alt menüleri sağa sola kademeli açılan dinamik ağaç",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 270
  },
  {
    key: "icon-dock",
    name: "Icon Dock",
    description: "Canlı ikon dock; üzerine gelince çekmece olarak genişler",
    menu_mode: "hover",
    density: "compact",
    sidebar_width: 250
  },
  {
    key: "drawer-stack",
    name: "Drawer Stack",
    description: "Bir çekmece açıldığında diğerini kapatan katmanlı model",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 276
  },
  {
    key: "light-corporate",
    name: "Light Corporate",
    description: "Aydınlık, yüksek okunabilirlikli kurumsal menü",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 254
  },
  {
    key: "dark-executive",
    name: "Dark Executive",
    description: "Koyu yönetici paneli ve belirgin aktif durum",
    menu_mode: "accordion",
    density: "compact",
    sidebar_width: 264
  },
  {
    key: "classic-office",
    name: "Classic Office",
    description: "Klasik ofis hiyerarşili çizgisel menü",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 250
  },
  {
    key: "soft-blue",
    name: "Soft Blue",
    description: "Yumuşak mavi vurgulu ferah sidebar",
    menu_mode: "accordion",
    density: "comfortable",
    sidebar_width: 252
  },
  {
    key: "slim-rail",
    name: "Slim Rail",
    description: "Dar, kalıcı ikon rayı ve flyout odaklı menü",
    menu_mode: "hover",
    density: "dense",
    sidebar_width: 230
  }
];
export const sidebars = sidebarCatalog.map((x) => x.key);
export const iconPacks = [
  "line",
  "color",
  "sketch",
  "mono",
  "soft-card",
  "emoji-live",
  "outline-blue",
  "rounded-fill",
  "glass-icon",
  "corporate"
];
export const advancedDefaults = {
  content_max_width: 1900,
  content_padding_x: 20,
  content_padding_y: 18,
  body_line_height: 1.45,
  heading_font_family: "Inter",
  sidebar_font_family: "Inter",
  table_font_family: "Inter",
  button_font_family: "Inter",
  page_header_bg: "#f4f7fb",
  page_header_text: "#14233d",
  page_header_muted: "#718198",
  page_header_border: "#dbe5f2",
  page_header_radius: 14,
  page_header_padding: 8,
  card_radius: 14,
  card_border_width: 1,
  card_shadow: 7,
  card_padding: 16,
  inner_panel_bg: "#ffffff",
  inner_panel_border: "#dbe5f2",
  inner_panel_radius: 12,
  metric_bg: "#ffffff",
  metric_text: "#14233d",
  metric_icon_bg: "#edf5ff",
  metric_icon_text: "#245ba7",
  metric_radius: 14,
  topbar_bg: "#ffffff",
  topbar_text: "#14233d",
  topbar_border: "#dbe5f2",
  topbar_height: 60,
  topbar_blur: 12,
  topbar_sticky: 1,
  sidebar_bg: "#ffffff",
  sidebar_text: "#14233d",
  sidebar_muted: "#718198",
  sidebar_border: "#dbe5f2",
  sidebar_padding: 10,
  brand_bg: "#f7f9fc",
  brand_border: "#dbe5f2",
  brand_radius: 18,
  brand_height: 95,
  brand_logo_width: 170,
  sidebar_status_bg: "#16a66a",
  sidebar_status_text: "#ffffff",
  menu_bg: "#ffffff",
  menu_text: "#14233d",
  menu_border: "#dbe5f2",
  menu_radius: 14,
  menu_height: 48,
  menu_gap: 8,
  menu_hover_bg: "#eff5ff",
  menu_hover_text: "#245ba7",
  menu_active_bg: "#edf5ff",
  menu_active_text: "#245ba7",
  menu_active_border: "#a7c8f8",
  menu_icon_bg: "#f1f5fb",
  menu_icon_text: "#245ba7",
  menu_icon_size: 28,
  menu_icon_radius: 9,
  submenu_bg: "#ffffff",
  submenu_text: "#14233d",
  submenu_active_bg: "#eff5ff",
  submenu_active_text: "#245ba7",
  submenu_indent: 18,
  primary_btn_bg: "#245ba7",
  primary_btn_text: "#ffffff",
  primary_btn_border: "#245ba7",
  soft_btn_bg: "#edf5ff",
  soft_btn_text: "#245ba7",
  soft_btn_border: "#bcd3ef",
  success_btn_bg: "#16a66a",
  success_btn_text: "#ffffff",
  danger_btn_bg: "#fff1f2",
  danger_btn_text: "#b42318",
  button_radius: 12,
  button_height: 38,
  button_shadow: 0,
  button_font_size: 14,
  button_font_weight: 800,
  action_btn_bg: "#eef5ff",
  action_btn_text: "#245ba7",
  action_btn_border: "#c9dcf2",
  action_btn_size: 34,
  action_btn_radius: 10,
  input_bg: "#ffffff",
  input_text: "#14233d",
  input_border: "#c8d7e8",
  input_focus: "#245ba7",
  input_placeholder: "#8292a8",
  input_label: "#243650",
  input_disabled_bg: "#f1f4f8",
  input_disabled_text: "#8795a8",
  input_radius: 12,
  input_height: 38,
  input_border_width: 1,
  input_focus_ring: 3,
  table_header_bg: "#eef4fd",
  table_header_text: "#14233d",
  table_row_bg: "#ffffff",
  table_alt_bg: "#f9fbfe",
  table_hover_bg: "#f0f6ff",
  table_border: "#dbe5f2",
  table_row_height: 46,
  table_font_size: 13,
  table_cell_padding: 10,
  table_radius: 12,
  success_bg: "#ecfdf3",
  success_text: "#087443",
  warning_bg: "#fff8e6",
  warning_text: "#9a6700",
  error_bg: "#fff1f2",
  error_text: "#b42318",
  info_bg: "#eef5ff",
  info_text: "#245ba7",
  badge_radius: 999,
  badge_font_size: 12,
  modal_bg: "#ffffff",
  modal_text: "#14233d",
  modal_border: "#dbe5f2",
  modal_overlay: "#17233a",
  modal_radius: 18,
  dropdown_bg: "#ffffff",
  dropdown_text: "#14233d",
  dropdown_border: "#dbe5f2",
  tooltip_bg: "#14233d",
  tooltip_text: "#ffffff",
  toast_bg: "#ffffff",
  toast_text: "#14233d",
  toast_border: "#dbe5f2",
  toast_radius: 14,
  heading_color: "#14233d",
  heading_weight: 800,
  h1_size: 24,
  h2_size: 18,
  h3_size: 16,
  body_weight: 500,
  small_size: 12,
  label_color: "#243650",
  link_color: "#245ba7",
  scrollbar_track: "#edf2f7",
  scrollbar_thumb: "#9eb5d0",
  scrollbar_width: 10,
  animation_speed: 180,
  animations_enabled: 1,
  custom_css: ""
};
export const defaults = {
  locale: "tr",
  theme_key: "silver-executive",
  sidebar_key: "silver-tree",
  icon_pack: "line",
  menu_mode: "accordion",
  density: "compact",
  sidebar_width: 252,
  font_family: "Inter",
  font_size: 14,
  radius: 14,
  primary_color: "#245ba7",
  accent_color: "#e23b3f",
  page_bg: "#f4f7fb",
  card_bg: "#ffffff",
  border_color: "#dbe5f2",
  text_color: "#14233d",
  muted_color: "#718198",
  default_template_key: "corporate-main",
  ...advancedDefaults
};
const safeParse = (v, d) => {
  try {
    return JSON.parse(v);
  } catch {
    return d;
  }
};
const presetKey = "sidebar_presets_v3";
const allowedThemeCssProperties = new Set([
  "align-content",
  "align-items",
  "align-self",
  "background",
  "background-color",
  "background-image",
  "background-position",
  "background-repeat",
  "background-size",
  "backdrop-filter",
  "border",
  "border-block",
  "border-bottom",
  "border-bottom-color",
  "border-bottom-style",
  "border-bottom-width",
  "border-color",
  "border-left",
  "border-left-color",
  "border-left-style",
  "border-left-width",
  "border-radius",
  "border-right",
  "border-right-color",
  "border-right-style",
  "border-right-width",
  "border-style",
  "border-top",
  "border-top-color",
  "border-top-style",
  "border-top-width",
  "border-width",
  "box-shadow",
  "color",
  "column-gap",
  "display",
  "filter",
  "flex",
  "flex-basis",
  "flex-direction",
  "flex-grow",
  "flex-shrink",
  "flex-wrap",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-variant-numeric",
  "font-weight",
  "gap",
  "grid-template-columns",
  "grid-template-rows",
  "height",
  "justify-content",
  "justify-items",
  "letter-spacing",
  "line-height",
  "margin",
  "margin-block",
  "margin-bottom",
  "margin-inline",
  "margin-left",
  "margin-right",
  "margin-top",
  "max-height",
  "max-width",
  "min-height",
  "min-width",
  "opacity",
  "overflow",
  "overflow-wrap",
  "overflow-x",
  "overflow-y",
  "padding",
  "padding-block",
  "padding-bottom",
  "padding-inline",
  "padding-left",
  "padding-right",
  "padding-top",
  "row-gap",
  "text-align",
  "text-decoration",
  "text-overflow",
  "text-shadow",
  "text-transform",
  "transform",
  "transform-origin",
  "transition",
  "white-space",
  "width"
]);
const safeThemeSelector = (selector) => {
  const value = String(selector || "").trim();
  if (!value || value.length > 500) return false;
  if (/[\\@{}]|:has\s*\(|:visited\b|::(?:before|after)\b/i.test(value)) return false;
  return /^[a-z0-9_.*#:[\]="'()\-\s>,+~]+$/i.test(value);
};
const safeThemeCssValue = (value) =>
  value &&
  value.length <= 1000 &&
  !/[<>\\]/.test(value) &&
  !/(?:url\s*\(|@import|expression\s*\(|javascript\s*:|data\s*:|-moz-binding\s*:|behavior\s*:)/i.test(value);
export function sanitizeThemeCss(input) {
  const source = String(input || "")
    .replace(/<\/?(?:style|script)[^>]*>/gi, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .slice(0, 40000);
  const rules = [];
  const matcher = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of source.matchAll(matcher)) {
    const selector = match[1].trim();
    if (!safeThemeSelector(selector)) continue;
    const declarations = [];
    for (const candidate of match[2].split(";")) {
      const separator = candidate.indexOf(":");
      if (separator < 1) continue;
      const property = candidate.slice(0, separator).trim().toLowerCase();
      const value = candidate.slice(separator + 1).trim();
      if (!(property.startsWith("--") || allowedThemeCssProperties.has(property))) continue;
      if (!safeThemeCssValue(value)) continue;
      declarations.push(`${property}:${value}`);
    }
    if (declarations.length) rules.push(`${selector}{${declarations.join(";")}}`);
  }
  return rules.join("").slice(0, 20000);
}
const cleanCss = sanitizeThemeCss;
const normalizePreset = (row, base) => ({
  key: base.key,
  name: String(row?.name || base.name).slice(0, 60),
  description: String(row?.description || base.description).slice(0, 140),
  menu_mode: ["accordion", "hover", "static"].includes(row?.menu_mode) ? row.menu_mode : base.menu_mode,
  density: ["compact", "comfortable", "dense"].includes(row?.density) ? row.density : base.density,
  sidebar_width: Math.min(340, Math.max(210, Number(row?.sidebar_width) || base.sidebar_width)),
  custom_css: cleanCss(row?.custom_css || base.custom_css || ""),
  hidden: Boolean(row?.hidden)
});
export function getSidebarCatalog(tenantId, { includeHidden = false } = {}) {
  const row = tenantId
    ? db.prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?").get(tenantId, presetKey)
    : null;
  const saved = safeParse(row?.value_json, "{}");
  return sidebarCatalog
    .map((base) => normalizePreset(saved?.[base.key], base))
    .filter((x) => includeHidden || !x.hidden);
}
function saveSidebarCatalog(tenantId, catalog) {
  const map = Object.fromEntries(
    catalog.map((x) => [
      x.key,
      {
        name: x.name,
        description: x.description,
        menu_mode: x.menu_mode,
        density: x.density,
        sidebar_width: x.sidebar_width,
        custom_css: cleanCss(x.custom_css),
        hidden: Boolean(x.hidden)
      }
    ])
  );
  db.prepare(
    "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
  ).run(tenantId, presetKey, JSON.stringify(map), Date.now());
  return map;
}
export function updateSidebarPreset(tenantId, key, input = {}) {
  const all = getSidebarCatalog(tenantId, { includeHidden: true });
  const preset = all.find((x) => x.key === key);
  if (!preset) return null;
  Object.assign(preset, normalizePreset({ ...preset, ...input }, { ...preset, key }));
  preset.hidden = false;
  saveSidebarCatalog(tenantId, all);
  return preset;
}
export function hideSidebarPreset(tenantId, key) {
  if (key === "silver-tree") return false;
  const all = getSidebarCatalog(tenantId, { includeHidden: true });
  const preset = all.find((x) => x.key === key);
  if (!preset) return false;
  preset.hidden = true;
  saveSidebarCatalog(tenantId, all);
  return true;
}
export function restoreSidebarPresets(tenantId) {
  db.prepare("DELETE FROM app_settings WHERE tenant_id=? AND key=?").run(tenantId, presetKey);
  return getSidebarCatalog(tenantId);
}
const customKeys = Object.keys(advancedDefaults);
const accessibleThemePairs = [
  ["muted_color", "page_bg"],
  ["page_header_muted", "page_header_bg"],
  ["sidebar_muted", "sidebar_bg"],
  ["input_placeholder", "input_bg"],
  ["input_disabled_text", "input_disabled_bg"]
];
function normalizeAccessibleThemeColors(input = {}) {
  const out = { ...input };
  for (const [foregroundKey, backgroundKey] of accessibleThemePairs) {
    if (!out[foregroundKey] || !out[backgroundKey]) continue;
    out[foregroundKey] = ensureAccessibleTextColor(out[foregroundKey], out[backgroundKey]);
  }
  return out;
}
function normalizeCustom(input = {}) {
  const out = {};
  for (const key of customKeys) {
    const d = advancedDefaults[key],
      v = input[key];
    if (typeof d === "number") {
      out[key] = Number.isFinite(Number(v)) ? Number(v) : d;
    } else out[key] = key === "custom_css" ? cleanCss(v) : String(v ?? d);
  }
  return normalizeAccessibleThemeColors(out);
}
function hasCustomColumn() {
  return db
    .prepare("PRAGMA table_info(user_ui_settings)")
    .all()
    .some((x) => x.name === "custom_json");
}
export function getUi(userId) {
  if (!userId) return normalizeAccessibleThemeColors(defaults);
  const row = db.prepare("SELECT * FROM user_ui_settings WHERE user_id=?").get(userId) || {};
  const custom = hasCustomColumn() ? safeParse(row.custom_json, "{}") : {};
  const value = normalizeAccessibleThemeColors({ ...defaults, ...row, ...normalizeCustom(custom) });
  if (!sidebars.includes(value.sidebar_key)) value.sidebar_key = defaults.sidebar_key;
  if (!["accordion", "hover", "static"].includes(value.menu_mode)) value.menu_mode = defaults.menu_mode;
  if (!["compact", "comfortable", "dense"].includes(value.density)) value.density = defaults.density;
  if (!iconPacks.includes(value.icon_pack)) value.icon_pack = defaults.icon_pack;
  return value;
}
export function saveUi(userId, input) {
  const merged = normalizeAccessibleThemeColors({ ...defaults, ...input });
  const custom = normalizeCustom(merged);
  const v = normalizeAccessibleThemeColors({
    ...merged,
    ...custom,
    user_id: userId,
    updated_at: Date.now(),
    custom_json: JSON.stringify(custom)
  });
  if (!sidebars.includes(v.sidebar_key)) v.sidebar_key = defaults.sidebar_key;
  if (!["accordion", "hover", "static"].includes(v.menu_mode)) v.menu_mode = defaults.menu_mode;
  if (!["compact", "comfortable", "dense"].includes(v.density)) v.density = defaults.density;
  if (!iconPacks.includes(v.icon_pack)) v.icon_pack = defaults.icon_pack;
  const customSql = hasCustomColumn() ? ",custom_json" : "";
  db.prepare(
    `INSERT INTO user_ui_settings(user_id,locale,theme_key,sidebar_key,icon_pack,menu_mode,density,sidebar_width,font_family,font_size,radius,primary_color,accent_color,page_bg,card_bg,border_color,text_color,muted_color,default_template_key,updated_at${customSql}) VALUES(@user_id,@locale,@theme_key,@sidebar_key,@icon_pack,@menu_mode,@density,@sidebar_width,@font_family,@font_size,@radius,@primary_color,@accent_color,@page_bg,@card_bg,@border_color,@text_color,@muted_color,@default_template_key,@updated_at${customSql ? " ,@custom_json" : ""}) ON CONFLICT(user_id) DO UPDATE SET locale=excluded.locale,theme_key=excluded.theme_key,sidebar_key=excluded.sidebar_key,icon_pack=excluded.icon_pack,menu_mode=excluded.menu_mode,density=excluded.density,sidebar_width=excluded.sidebar_width,font_family=excluded.font_family,font_size=excluded.font_size,radius=excluded.radius,primary_color=excluded.primary_color,accent_color=excluded.accent_color,page_bg=excluded.page_bg,card_bg=excluded.card_bg,border_color=excluded.border_color,text_color=excluded.text_color,muted_color=excluded.muted_color,default_template_key=excluded.default_template_key,updated_at=excluded.updated_at${customSql ? ",custom_json=excluded.custom_json" : ""}`
  ).run(v);
  return v;
}
export function resetUi(userId) {
  db.prepare("DELETE FROM user_ui_settings WHERE user_id=?").run(userId);
  return normalizeAccessibleThemeColors(defaults);
}

const themeDesignKey = (userId) => `theme_designs_user_${userId}`;
export function listThemeDesigns(tenantId, userId) {
  const row = db
    .prepare("SELECT value_json FROM app_settings WHERE tenant_id=? AND key=?")
    .get(tenantId, themeDesignKey(userId));
  const data = safeParse(row?.value_json, "[]");
  return Array.isArray(data) ? data : [];
}
function writeThemeDesigns(tenantId, userId, items) {
  db.prepare(
    "INSERT INTO app_settings(tenant_id,key,value_json,updated_at) VALUES(?,?,?,?) ON CONFLICT(tenant_id,key) DO UPDATE SET value_json=excluded.value_json,updated_at=excluded.updated_at"
  ).run(tenantId, themeDesignKey(userId), JSON.stringify(items.slice(0, 40)), Date.now());
}
export function saveThemeDesign(tenantId, userId, name, settings) {
  const clean = String(name || "")
    .trim()
    .slice(0, 80);
  if (!clean) throw Object.assign(new Error("Tasarım adı zorunludur."), { status: 422, expose: true });
  const items = listThemeDesigns(tenantId, userId);
  const id = `th_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const next = { id, name: clean, settings: { ...settings }, created_at: Date.now(), updated_at: Date.now() };
  const old = items.findIndex(
    (x) => String(x.name).toLocaleLowerCase("tr-TR") === clean.toLocaleLowerCase("tr-TR")
  );
  if (old >= 0) {
    next.id = items[old].id;
    next.created_at = items[old].created_at || next.created_at;
    items.splice(old, 1);
  }
  items.unshift(next);
  writeThemeDesigns(tenantId, userId, items);
  return next;
}
export function deleteThemeDesign(tenantId, userId, id) {
  const items = listThemeDesigns(tenantId, userId).filter((x) => x.id !== id);
  writeThemeDesigns(tenantId, userId, items);
  return items;
}
export function getThemeDesign(tenantId, userId, id) {
  return listThemeDesigns(tenantId, userId).find((x) => x.id === id) || null;
}
