function compact(value = "") {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .trim();
}
function fold(value = "") {
  return compact(value)
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
const knownVariantNumbers = new Set(["60", "75", "80", "90", "100", "120", "130", "150", "180", "200", "210", "240"]);
export function targetVariantTokens(title) {
  const value = compact(title);
  const found = [];
  for (const m of value.matchAll(/\b(\d{2,4}(?:[.,]\d+)?)\s*(mm|cm|ml|µl|ul|litre|liter|lt|l|kg|g|rpm|°c|c)\b/gi))
    found.push({ number: m[1].replace(",", "."), unit: m[2].toLowerCase().replace("ul", "µl"), raw: compact(m[0]) });
  for (const m of value.matchAll(/\b(\d{2,4})\s*(?:lik|lık|luk|lük)\b/gi))
    found.push({ number: m[1], unit: "model", raw: compact(m[0]) });
  if (!found.length) {
    for (const m of value.matchAll(/\b(60|75|80|90|100|120|130|150|180|200|210|240)\b/g))
      found.push({ number: m[1], unit: "model", raw: m[1] });
  }
  const seen = new Set();
  return found.filter((x) => {
    const key = `${x.number}:${x.unit}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function lineLooksHeading(line) {
  const value = compact(line);
  if (!value || value.length > 110) return false;
  if (/[:.;!?]$/.test(value) && value.length > 45) return false;
  const letters = value.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");
  const upper = letters && letters === letters.toLocaleUpperCase("tr-TR");
  return upper || /^(teknik|ürün|model|özellik|kullanım|ölçü|dimensions?|technical|features?|avantaj|kurulum|sss|sıkça)/i.test(fold(value));
}
function isDimensionRow(line) {
  return /\d\s*[x×]\s*\d/i.test(line);
}
function competitorNumbers(lines, targets) {
  const targetNumbers = new Set(targets.map((x) => x.number));
  const found = new Set();
  for (const line of lines) {
    if (isDimensionRow(line)) continue;
    const short = compact(line);
    if (!short || short.length > 120 || /[.;!?]$/.test(short)) continue;
    const looksVariantHeading =
      /\b\d{2,4}\s*(?:cm|mm|lik|lık|luk|lük)\b/i.test(short) ||
      /\b(model|tip|type|seri|series)\b/i.test(fold(short));
    if (!looksVariantHeading) continue;
    for (const m of short.matchAll(/\b(\d{2,4})\b/g)) {
      const n = m[1];
      if (knownVariantNumbers.has(n) && !targetNumbers.has(n)) found.add(n);
    }
  }
  return [...found];
}
function isNeutralSectionBoundary(line) {
  const f = fold(line);
  return /^(kullanim|avantaj|kurulum|sss|sikca sorulan|faq|applications?|usage|benefits?)/.test(f);
}
function variantHeadingNumbers(line) {
  const value = compact(line);
  if (!value || value.length > 140 || isDimensionRow(value)) return [];
  const folded = fold(value);
  const measurementRow =
    /^(?:kabin|dis|ic|çalisma|calisma|genislik|yükseklik|yukseklik|derinlik|en|boy|width|height|depth|dimensions?|olcu|ölçü)\b/i.test(folded) &&
    !/(?:ozellik|teknik|model|tip|type|seri|series)/i.test(folded);
  if (measurementRow) return [];
  const headingShape =
    lineLooksHeading(value) ||
    /^\s*\d{2,4}\s*(?:cm|mm|lik|lık|luk|lük)?\b/i.test(value) ||
    /\b(?:ozellik|özellik|teknik|model|tip|type|seri|series)\b/i.test(folded) ||
    (/\b\d{2,4}\s*(?:cm|mm|lik|lık|luk|lük)\b/i.test(value) && value.split(/\s+/).length <= 8);
  if (!headingShape) return [];
  const found = [];
  for (const m of value.matchAll(/\b(\d{2,4})\b/g)) {
    if (knownVariantNumbers.has(m[1])) found.push(m[1]);
  }
  return [...new Set(found)];
}
function exactTargetVariantBlock(lines, targets) {
  const targetNumbers = new Set(targets.map((x) => x.number));
  const candidates = [];
  for (let start = 0; start < lines.length; start++) {
    const nums = variantHeadingNumbers(lines[start]);
    if (!nums.some((n) => targetNumbers.has(n))) continue;
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      const nextNums = variantHeadingNumbers(lines[i]);
      if (nextNums.some((n) => !targetNumbers.has(n))) { end = i; break; }
    }
    const block = lines.slice(start, end);
    if (!block.length) continue;
    const f = fold(lines[start]);
    let score = Math.min(block.join("\n").length, 4000);
    if (/ozellik|teknik|model|tip|type|seri|series/.test(f)) score += 5000;
    if (/\b(?:cm|mm|lik|lık|luk|lük)\b/i.test(lines[start])) score += 2500;
    if (block.length >= 2) score += 1000;
    candidates.push({ start, end, block, score });
  }
  candidates.sort((a, b) => b.score - a.score || a.start - b.start);
  return candidates[0] || null;
}
export function variantAwareDescription(description, title) {
  const targets = targetVariantTokens(title);
  if (!targets.length)
    return {
      description,
      variant: { status: "NONE", tokens: [], confidence: 0.72, note: "Başlıkta özel varyant/ölçü belirteci bulunmadı." }
    };
  const lines = String(description || "").split("\n").map(compact).filter(Boolean);
  const targetNumbers = new Set(targets.map((x) => x.number));
  const exact = exactTargetVariantBlock(lines, targets);
  if (exact) {
    const kept = [...exact.block];
    // Hedef varyanttan sonra 150 cm gibi başka varyant blokları gelebilir;
    // onların arkasındaki KULLANIM / AVANTAJ gibi ortak bölümler ise ürüne aittir.
    // Bu ortak kuyruğu rakip varyantları almadan yeniden ekle.
    if (exact.end < lines.length) {
      const neutralTail = lines.findIndex((line, index) =>
        index >= exact.end && lineLooksHeading(line) && isNeutralSectionBoundary(line)
      );
      if (neutralTail >= exact.end) kept.push(...lines.slice(neutralTail));
    }
    const focused = kept.join("\n").trim();
    return {
      description: focused,
      variant: {
        status: "MATCHED",
        tokens: targets.map((x) => x.raw),
        confidence: 0.995,
        note: `Başlıktaki ${targets.map((x) => x.raw).join(", ")} varyantına ait başlık ve özellik bloğu birebir korundu.`
      }
    };
  }
  const targetPresent = targets.some((t) =>
    new RegExp(`(^|\\D)${String(t.number).replace(".", "[.,]")}(\\D|$)`).test(description)
  );
  const competitors = competitorNumbers(lines, targets);
  if (!competitors.length) {
    return {
      description,
      variant: {
        status: targetPresent ? "MATCHED" : "REVIEW",
        tokens: targets.map((x) => x.raw),
        confidence: targetPresent ? 0.98 : 0.62,
        note: targetPresent
          ? `Açıklama başlıktaki ${targets.map((x) => x.raw).join(", ")} varyantıyla eşleşiyor.`
          : "Başlıktaki varyant açıklamada açıkça doğrulanamadı."
      }
    };
  }
  const output = [];
  let skipCompetitorBlock = false;
  for (const line of lines) {
    const targetHit = [...targetNumbers].some((n) => new RegExp(`(^|\\D)${n}(\\D|$)`).test(line));
    const competitorHit = competitors.some((n) => new RegExp(`(^|\\D)${n}(\\D|$)`).test(line));
    const candidateVariantHeading =
      !isDimensionRow(line) &&
      line.length <= 120 &&
      !/[.;!?]$/.test(line) &&
      /\b\d{2,4}\s*(?:cm|mm|lik|lık|luk|lük)\b/i.test(line);
    if (candidateVariantHeading && competitorHit && !targetHit) skipCompetitorBlock = true;
    if (candidateVariantHeading && targetHit) skipCompetitorBlock = false;
    if (skipCompetitorBlock && lineLooksHeading(line) && isNeutralSectionBoundary(line)) skipCompetitorBlock = false;
    if (!skipCompetitorBlock) output.push(line);
  }
  const focused = output.join("\n").trim() || description;
  return {
    description: focused,
    variant: {
      status: targetPresent ? "MATCHED" : "REVIEW",
      tokens: targets.map((x) => x.raw),
      confidence: targetPresent ? 0.96 : 0.6,
      note: targetPresent
        ? `Başlıktaki ${targets.map((x) => x.raw).join(", ")} varyantı korunarak rakip ölçü/model blokları ayıklandı.`
        : "Birden fazla varyant bulundu; başlıkla birebir eşleşme manuel kontrol gerektiriyor."
    }
  };
}
