import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { currencyRates } from "../services/currency.service.js";
const r = Router();
r.use(requireAuth);
r.get("/currency", async (req, res) =>
  res.json(await currencyRates({ force: String(req.query.refresh || "") === "1" }))
);

const FALLBACK_PROVINCES = [
  "ADANA",
  "ADIYAMAN",
  "AFYONKARAHİSAR",
  "AĞRI",
  "AKSARAY",
  "AMASYA",
  "ANKARA",
  "ANTALYA",
  "ARDAHAN",
  "ARTVİN",
  "AYDIN",
  "BALIKESİR",
  "BARTIN",
  "BATMAN",
  "BAYBURT",
  "BİLECİK",
  "BİNGÖL",
  "BİTLİS",
  "BOLU",
  "BURDUR",
  "BURSA",
  "ÇANAKKALE",
  "ÇANKIRI",
  "ÇORUM",
  "DENİZLİ",
  "DİYARBAKIR",
  "DÜZCE",
  "EDİRNE",
  "ELAZIĞ",
  "ERZİNCAN",
  "ERZURUM",
  "ESKİŞEHİR",
  "GAZİANTEP",
  "GİRESUN",
  "GÜMÜŞHANE",
  "HAKKÂRİ",
  "HATAY",
  "IĞDIR",
  "ISPARTA",
  "İSTANBUL",
  "İZMİR",
  "KAHRAMANMARAŞ",
  "KARABÜK",
  "KARAMAN",
  "KARS",
  "KASTAMONU",
  "KAYSERİ",
  "KIRIKKALE",
  "KIRKLARELİ",
  "KIRŞEHİR",
  "KİLİS",
  "KOCAELİ",
  "KONYA",
  "KÜTAHYA",
  "MALATYA",
  "MANİSA",
  "MARDİN",
  "MERSİN",
  "MUĞLA",
  "MUŞ",
  "NEVŞEHİR",
  "NİĞDE",
  "ORDU",
  "OSMANİYE",
  "RİZE",
  "SAKARYA",
  "SAMSUN",
  "SİİRT",
  "SİNOP",
  "SİVAS",
  "ŞANLIURFA",
  "ŞIRNAK",
  "TEKİRDAĞ",
  "TOKAT",
  "TRABZON",
  "TUNCELİ",
  "UŞAK",
  "VAN",
  "YALOVA",
  "YOZGAT",
  "ZONGULDAK"
];
const FALLBACK_DISTRICTS = {
  ANKARA: [
    "AKYURT",
    "ALTINDAĞ",
    "AYAŞ",
    "BALA",
    "BEYPAZARI",
    "ÇAMLIDERE",
    "ÇANKAYA",
    "ÇUBUK",
    "ELMADAĞ",
    "ETİMESGUT",
    "EVREN",
    "GÖLBAŞI",
    "GÜDÜL",
    "HAYMANA",
    "KAHRAMANKAZAN",
    "KALECİK",
    "KEÇİÖREN",
    "KIZILCAHAMAM",
    "MAMAK",
    "NALLIHAN",
    "POLATLI",
    "PURSAKLAR",
    "SİNCAN",
    "ŞEREFLİKOÇHİSAR",
    "YENİMAHALLE"
  ],
  İSTANBUL: [
    "ADALAR",
    "ARNAVUTKÖY",
    "ATAŞEHİR",
    "AVCILAR",
    "BAĞCILAR",
    "BAHÇELİEVLER",
    "BAKIRKÖY",
    "BAŞAKŞEHİR",
    "BAYRAMPAŞA",
    "BEŞİKTAŞ",
    "BEYKOZ",
    "BEYLİKDÜZÜ",
    "BEYOĞLU",
    "BÜYÜKÇEKMECE",
    "ÇATALCA",
    "ÇEKMEKÖY",
    "ESENLER",
    "ESENYURT",
    "EYÜPSULTAN",
    "FATİH",
    "GAZİOSMANPAŞA",
    "GÜNGÖREN",
    "KADIKÖY",
    "KAĞITHANE",
    "KARTAL",
    "KÜÇÜKÇEKMECE",
    "MALTEPE",
    "PENDİK",
    "SANCAKTEPE",
    "SARIYER",
    "SİLİVRİ",
    "SULTANBEYLİ",
    "SULTANGAZİ",
    "ŞİLE",
    "ŞİŞLİ",
    "TUZLA",
    "ÜMRANİYE",
    "ÜSKÜDAR",
    "ZEYTİNBURNU"
  ],
  İZMİR: [
    "ALİAĞA",
    "BALÇOVA",
    "BAYINDIR",
    "BAYRAKLI",
    "BERGAMA",
    "BEYDAĞ",
    "BORNOVA",
    "BUCA",
    "ÇEŞME",
    "ÇİĞLİ",
    "DİKİLİ",
    "FOÇA",
    "GAZİEMİR",
    "GÜZELBAHÇE",
    "KARABAĞLAR",
    "KARABURUN",
    "KARŞIYAKA",
    "KEMALPAŞA",
    "KINIK",
    "KİRAZ",
    "KONAK",
    "MENDERES",
    "MENEMEN",
    "NARLIDERE",
    "ÖDEMİŞ",
    "SEFERİHİSAR",
    "SELÇUK",
    "TİRE",
    "TORBALI",
    "URLA"
  ]
};
const cache = new Map();
const upper = (v) =>
  String(v || "")
    .trim()
    .toLocaleUpperCase("tr-TR");
async function getJson(url) {
  const ctrl = new AbortController(),
    timer = setTimeout(() => ctrl.abort(), 3500);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: ctrl.signal });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
const rowsOf = (x) =>
  Array.isArray(x) ? x : Array.isArray(x?.data) ? x.data : Array.isArray(x?.result) ? x.result : [];
r.get("/locations/provinces", async (_req, res) => {
  const key = "provinces";
  if (cache.has(key)) return res.json(cache.get(key));
  let rows = [];
  try {
    rows = rowsOf(await getJson("https://api.turkiyeapi.dev/v1/provinces?limit=100&sort=name"))
      .map((x) => upper(x.name || x.il || x.city))
      .filter(Boolean);
  } catch {}
  const result = [...new Set((rows.length ? rows : FALLBACK_PROVINCES).map(upper))].sort((a, b) =>
    a.localeCompare(b, "tr")
  );
  cache.set(key, result);
  res.json(result);
});
r.get("/locations/districts", async (req, res) => {
  const province = upper(req.query.province);
  if (!province) return res.json([]);
  const key = "districts:" + province;
  if (cache.has(key)) return res.json(cache.get(key));
  let rows = [];
  try {
    rows = rowsOf(
      await getJson(
        "https://api.turkiyeapi.dev/v1/districts?limit=1000&sort=name&province=" +
          encodeURIComponent(province)
      )
    )
      .map((x) => upper(x.name || x.ilce || x.district))
      .filter(Boolean);
  } catch {}
  const result = [...new Set((rows.length ? rows : FALLBACK_DISTRICTS[province] || []).map(upper))].sort(
    (a, b) => a.localeCompare(b, "tr")
  );
  cache.set(key, result);
  res.json(result);
});
export default r;
