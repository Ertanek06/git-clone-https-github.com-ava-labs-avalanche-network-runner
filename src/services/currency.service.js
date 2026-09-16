let cache = {
  at: 0,
  data: { ok: false, eur: null, usd: null, source: "TCMB", date: null, stale: false, error: null }
};
const between = (s, a, b) => s.split(a)[1]?.split(b)[0]?.trim() || null;
const positive = (v) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : null);
export async function currencyRates({ force = false } = {}) {
  if (!force && Date.now() - cache.at < 30 * 60 * 1000 && cache.data.eur && cache.data.usd) return cache.data;
  try {
    const xml = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
      signal: AbortSignal.timeout(7000)
    }).then((r) => {
      if (!r.ok) throw new Error(`TCMB ${r.status}`);
      return r.text();
    });
    const rate = (code) => {
      const block =
        xml.match(new RegExp(`<Currency[^>]*CurrencyCode="${code}"[\\s\\S]*?</Currency>`))?.[0] || "";
      return (
        positive(between(block, "<ForexSelling>", "</ForexSelling>")) ||
        positive(between(block, "<ForexBuying>", "</ForexBuying>"))
      );
    };
    const eur = rate("EUR"),
      usd = rate("USD");
    if (!eur || !usd) throw new Error("TCMB kur verisi eksik");
    const rawDate =
      (xml.match(/<(?:Tarih_Date|CurrencyDate)[^>]*(?:Tarih|Date)="([^"]+)"/i) ||
        xml.match(/<Tarih_Date[^>]*Date="([^"]+)"/i) ||
        [])[1] || "";
    const parts = rawDate.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})/);
    const sourceDate = parts
      ? `${parts[3]}-${parts[2].padStart(2, "0")}-${parts[1].padStart(2, "0")}`
      : new Date().toISOString().slice(0, 10);
    cache = {
      at: Date.now(),
      data: { ok: true, eur, usd, source: "TCMB", date: sourceDate, stale: false, error: null }
    };
    return cache.data;
  } catch (e) {
    return {
      ...cache.data,
      ok: Boolean(cache.data.eur && cache.data.usd),
      stale: Boolean(cache.data.eur || cache.data.usd),
      error: String(e?.message || "TCMB kur verisi alınamadı")
    };
  }
}
