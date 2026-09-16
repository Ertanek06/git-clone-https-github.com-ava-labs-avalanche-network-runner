import { db } from "../db/db.js";
import { id } from "../utils/id.js";
import { jsonParse, jsonString } from "../utils/json.js";
import { nextQuoteNo } from "./numbering.service.js";
import { searchText, safePublicUrl } from "../utils/text.js";
import { runWithNewCustomerCode } from "./customer-code.service.js";
const n = (v, d = 0) => {
  const x = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : d;
};
const decimalParts = (value) => {
  const raw = String(value ?? "")
    .trim()
    .replace(",", ".");
  const m = raw.match(/^([+-]?)(\d+)(?:\.(\d+))?$/);
  return m ? { negative: m[1] === "-", whole: m[2], fraction: m[3] || "" } : null;
};
const toScaled = (value, digits, { fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const parsed = decimalParts(value ?? fallback);
  if (!parsed) return toScaled(fallback, digits, { fallback: 0, min, max });
  const padded = (parsed.fraction + "0".repeat(digits + 1)).slice(0, digits + 1);
  let scaled = BigInt(parsed.whole) * 10n ** BigInt(digits) + BigInt(padded.slice(0, digits) || "0");
  if (Number(padded[digits] || 0) >= 5) scaled += 1n;
  if (parsed.negative) scaled = -scaled;
  const minScaled = BigInt(Math.round(min * 10 ** digits)),
    maxScaled = BigInt(Math.round(max * 10 ** digits));
  if (scaled < minScaled || scaled > maxScaled)
    throw Object.assign(new Error(`Sayısal değer izin verilen aralığın dışında: ${value}`), {
      status: 422,
      expose: true
    });
  return scaled;
};
const centsToNumber = (v) => Number(v) / 100;
const money = (v) =>
  centsToNumber(toScaled(v, 2, { fallback: 0, min: -90_000_000_000_000, max: 90_000_000_000_000 }));
const text = (v) => String(v ?? "").trim();
const meaningfulAddress = (v) => {
  const value = text(v)
    .replace(/\uFFFD/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return /[\p{L}\p{N}]/u.test(value) ? value : "";
};
const firstAddress = (...values) => values.map(meaningfulAddress).find(Boolean) || "";
const upperTr = (v) => text(v).toLocaleUpperCase("tr-TR");
const safeAssetUrl = (v) => safePublicUrl(v);
const cleanProductSnapshot = (s) => ({
  ...s,
  image_url: safeAssetUrl(s?.image_url),
  brochure_url: safeAssetUrl(s?.brochure_url),
  ce_certificate_url: safeAssetUrl(s?.ce_certificate_url),
  manual_url: safeAssetUrl(s?.manual_url)
});
export function calcItem(item) {
  const quantityUnits = toScaled(item.quantity ?? 1, 6, { fallback: 1, min: 0, max: 1_000_000 }),
    priceCents = toScaled(item.unit_price, 2, { fallback: 0, min: 0, max: 1_000_000_000 });
  const type = String(item.discount_type || "PERCENT").toUpperCase() === "AMOUNT" ? "AMOUNT" : "PERCENT";
  const grossCents = (quantityUnits * priceCents + 500_000n) / 1_000_000n;
  if (grossCents > 9_000_000_000_000_000n)
    throw Object.assign(new Error("Satır toplamı güvenli parasal sınırı aşıyor."), {
      status: 422,
      expose: true
    });
  let discountCents, discountValue;
  if (type === "AMOUNT") {
    const requested = toScaled(item.discount_value, 2, { fallback: 0, min: 0, max: 90_000_000_000_000 });
    discountCents = requested > grossCents ? grossCents : requested;
    discountValue = centsToNumber(discountCents);
  } else {
    const basis = toScaled(item.discount_value, 2, { fallback: 0, min: 0, max: 100 });
    discountCents = (grossCents * basis + 5_000n) / 10_000n;
    discountValue = Number(basis) / 100;
  }
  const vatBasis = toScaled(item.vat_rate ?? 20, 2, { fallback: 20, min: 0, max: 100 }),
    netCents = grossCents - discountCents,
    taxCents = (netCents * vatBasis + 5_000n) / 10_000n;
  return {
    ...item,
    quantity: Number(quantityUnits) / 1_000_000,
    unit_price: centsToNumber(priceCents),
    discount_type: type,
    discount_value: discountValue,
    vat_rate: Number(vatBasis) / 100,
    line_net: centsToNumber(netCents),
    line_vat: centsToNumber(taxCents),
    line_total: centsToNumber(netCents + taxCents),
    _gross_cents: grossCents.toString(),
    _discount_cents: discountCents.toString()
  };
}
export function calcQuote(items = [], quoteDiscount = {}) {
  const normalized = items.map(calcItem),
    included = normalized.filter((x) => Number(x.include_total ?? 1) === 1);
  let baseSubtotal = 0n,
    lineDiscount = 0n;
  for (const row of included) {
    baseSubtotal += toScaled(row.line_net, 2);
    lineDiscount += BigInt(row._discount_cents || 0);
  }
  const quoteDiscountType =
    String(quoteDiscount.type || "PERCENT").toUpperCase() === "AMOUNT" ? "AMOUNT" : "PERCENT";
  let quoteDiscountCents = 0n,
    quoteDiscountValue = 0;
  if (quoteDiscountType === "AMOUNT") {
    const requested = toScaled(quoteDiscount.value, 2, { fallback: 0, min: 0, max: 90_000_000_000_000 });
    quoteDiscountCents = requested > baseSubtotal ? baseSubtotal : requested;
    quoteDiscountValue = centsToNumber(quoteDiscountCents);
  } else {
    const basis = toScaled(quoteDiscount.value, 2, { fallback: 0, min: 0, max: 100 });
    quoteDiscountCents = (baseSubtotal * basis + 5_000n) / 10_000n;
    quoteDiscountValue = Number(basis) / 100;
  }
  const subtotal = baseSubtotal - quoteDiscountCents;
  let vat = 0n,
    remainingDiscount = quoteDiscountCents,
    remainingBase = baseSubtotal;
  included.forEach((row, index) => {
    const rowNet = toScaled(row.line_net, 2),
      last = index === included.length - 1;
    let share = 0n;
    if (remainingDiscount > 0n && remainingBase > 0n) {
      share = last ? remainingDiscount : (remainingDiscount * rowNet + remainingBase / 2n) / remainingBase;
      if (share > rowNet) share = rowNet;
      if (share > remainingDiscount) share = remainingDiscount;
    }
    const taxable = rowNet - share,
      vatBasis = toScaled(row.vat_rate ?? 20, 2, { fallback: 20, min: 0, max: 100 });
    vat += (taxable * vatBasis + 5_000n) / 10_000n;
    remainingDiscount -= share;
    remainingBase -= rowNet;
  });
  const discount = lineDiscount + quoteDiscountCents,
    grand = subtotal + vat;
  return {
    items: normalized.map(({ _gross_cents, _discount_cents, ...row }) => row),
    subtotal: centsToNumber(subtotal),
    vat_total: centsToNumber(vat),
    grand_total: centsToNumber(grand),
    discount_total: centsToNumber(discount),
    line_discount_total: centsToNumber(lineDiscount),
    quote_discount_type: quoteDiscountType,
    quote_discount_value: quoteDiscountValue,
    quote_discount_total: centsToNumber(quoteDiscountCents)
  };
}
const customerSearch = (row) =>
  searchText(
    row.code,
    row.company_name,
    row.short_name,
    row.contact_name,
    row.contact_title,
    row.phone,
    row.mobile,
    row.email,
    row.tax_office,
    row.tax_no,
    row.billing_address,
    row.delivery_address,
    row.address1,
    row.address2,
    row.district,
    row.city,
    row.country,
    row.postal_code,
    row.sector,
    row.payment_method,
    row.note
  );
export function customerSnapshot(c) {
  return { ...c };
}
export function profileSnapshot(p) {
  return { ...p };
}
export function productSnapshot(p) {
  return { ...p };
}
export function customerSnapshotFromPayload(payload = {}, fallback = {}) {
  const pick = (key) => text(payload[`customer_${key}`] ?? fallback[key]),
    up = (key) => upperTr(payload[`customer_${key}`] ?? fallback[key]),
    billing = upperTr(
      firstAddress(
        payload.customer_billing_address,
        payload.customer_address1,
        fallback.billing_address,
        fallback.address1,
        fallback.address2
      )
    ),
    delivery = upperTr(firstAddress(payload.customer_delivery_address, fallback.delivery_address));
  return {
    ...fallback,
    company_name: up("company_name"),
    contact_name: up("contact_name"),
    contact_title: up("contact_title"),
    phone: pick("phone"),
    mobile: pick("mobile"),
    email: pick("email"),
    website: pick("website"),
    tax_office: up("tax_office"),
    tax_no: pick("tax_no"),
    billing_address: billing,
    delivery_address: delivery,
    address1: billing,
    address2: "",
    district: up("district"),
    city: up("city"),
    country: up("country") || "TÜRKİYE",
    note: pick("note"),
    currency: up("currency") || fallback.currency || "TRY",
    payment_method: up("payment_method")
  };
}

function resolveCustomer(tenantId, payload = {}) {
  const requested = text(payload.customer_id);
  if (requested) {
    const byId = db
      .prepare(
        "SELECT * FROM customers WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0 AND UPPER(COALESCE(status,'ACTIVE')) NOT IN ('DELETED','SILINDI','ARCHIVED','ARSIVLENDI')"
      )
      .get(tenantId, requested);
    if (byId) return byId;
  }
  const snap = customerSnapshotFromPayload(payload, {});
  if (!snap.company_name) return null;
  const exact = db
    .prepare(
      `SELECT * FROM customers WHERE tenant_id=? AND COALESCE(deleted_at,0)=0 AND UPPER(COALESCE(status,'ACTIVE')) NOT IN ('DELETED','SILINDI','ARCHIVED','ARSIVLENDI') AND ((tax_no<>'' AND tax_no=?) OR (email<>'' AND lower(email)=lower(?)) OR (mobile<>'' AND mobile=?) OR (phone<>'' AND phone=?) OR lower(company_name)=lower(?)) ORDER BY updated_at DESC LIMIT 1`
    )
    .get(
      tenantId,
      snap.tax_no || "",
      snap.email || "",
      snap.mobile || "",
      snap.phone || "",
      snap.company_name
    );
  if (exact) return exact;
  const now = Date.now(),
    cid = id("cus"),
    row = {
      id: cid,
      tenant_id: tenantId,
      company_name: snap.company_name,
      short_name: text(payload.customer_short_name),
      contact_name: snap.contact_name,
      contact_title: snap.contact_title,
      phone: snap.phone,
      mobile: snap.mobile,
      email: snap.email,
      website: snap.website,
      tax_office: snap.tax_office,
      tax_no: snap.tax_no,
      billing_address: snap.billing_address,
      delivery_address: snap.delivery_address,
      address1: snap.address1,
      address2: snap.address2,
      district: snap.district,
      city: snap.city,
      country: snap.country || "Türkiye",
      postal_code: "",
      sector: "",
      currency: snap.currency || "TRY",
      payment_method: snap.payment_method,
      note: snap.note,
      logo_url: null,
      status: "ACTIVE",
      deleted_at: null,
      deleted_by: null,
      created_at: now,
      updated_at: now
    };
  const insert = db.prepare(
    `INSERT INTO customers(id,tenant_id,code,company_name,short_name,contact_name,contact_title,phone,mobile,email,website,tax_office,tax_no,billing_address,delivery_address,address1,address2,district,city,country,postal_code,sector,currency,payment_method,note,logo_url,status,deleted_at,deleted_by,search_text,created_at,updated_at) VALUES(@id,@tenant_id,@code,@company_name,@short_name,@contact_name,@contact_title,@phone,@mobile,@email,@website,@tax_office,@tax_no,@billing_address,@delivery_address,@address1,@address2,@district,@city,@country,@postal_code,@sector,@currency,@payment_method,@note,@logo_url,@status,@deleted_at,@deleted_by,@search_text,@created_at,@updated_at)`
  );
  const code = runWithNewCustomerCode(tenantId, (nextCode) =>
    insert.run({ ...row, code: nextCode, search_text: customerSearch({ ...row, code: nextCode }) })
  );
  return { ...row, code, search_text: customerSearch({ ...row, code }) };
}

export function loadQuote(tenantId, quoteId, { includeArchived = false } = {}) {
  const quote = db
    .prepare(
      `SELECT * FROM quotes WHERE tenant_id=? AND id=? ${includeArchived ? "" : "AND COALESCE(deleted_at,0)=0"}`
    )
    .get(tenantId, quoteId);
  if (!quote) return null;
  const items = db
    .prepare("SELECT * FROM quote_items WHERE quote_id=? AND COALESCE(deleted_at,0)=0 ORDER BY sort_order")
    .all(quoteId)
    .map((x) => ({ ...x, product_snapshot: jsonParse(x.product_snapshot_json, {}) }));
  const customerSnapshot = jsonParse(quote.customer_snapshot_json, {});
  if (quote.customer_id) {
    const currentCustomer = db
      .prepare(
        "SELECT billing_address,delivery_address,address1,address2,district,city,country,postal_code FROM customers WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0"
      )
      .get(tenantId, quote.customer_id);
    if (currentCustomer) {
      const billing = firstAddress(
        customerSnapshot.billing_address,
        customerSnapshot.address1,
        currentCustomer.billing_address,
        currentCustomer.address1,
        currentCustomer.address2
      );
      const delivery = firstAddress(customerSnapshot.delivery_address, currentCustomer.delivery_address);
      customerSnapshot.billing_address = billing;
      customerSnapshot.address1 = billing;
      customerSnapshot.delivery_address = delivery;
      customerSnapshot.district = text(customerSnapshot.district) || text(currentCustomer.district);
      customerSnapshot.city = text(customerSnapshot.city) || text(currentCustomer.city);
      customerSnapshot.country = text(customerSnapshot.country) || text(currentCustomer.country);
      customerSnapshot.postal_code = text(customerSnapshot.postal_code) || text(currentCustomer.postal_code);
    }
  }
  return {
    ...quote,
    customer_snapshot: customerSnapshot,
    profile_snapshot: jsonParse(quote.profile_snapshot_json, {}),
    items
  };
}

function revisionCompare(oldItems = [], newItems = []) {
  const keyOf = (i) =>
    String(i.product_id || i.product_snapshot?.code || i.product_snapshot?.name || "")
      .trim()
      .toUpperCase();
  const oldMap = new Map(oldItems.map((i) => [keyOf(i), i]));
  const newMap = new Map(newItems.map((i) => [keyOf(i), i]));
  const changes = [];
  for (const [k, nw] of newMap) {
    const old = oldMap.get(k);
    const name = nw.product_snapshot?.name || nw.manual_text || nw.product_snapshot?.code || "Ürün";
    if (!old) {
      changes.push({ type: "PRODUCT", label: name, old: "—", new: "Yeni ürün" });
      continue;
    }
    const oldPrice = Number(old.unit_price || 0),
      newPrice = Number(nw.unit_price || 0);
    if (oldPrice !== newPrice)
      changes.push({
        type: "PRICE",
        label: name,
        old: oldPrice,
        new: newPrice,
        currency: nw.currency || old.currency || "TRY"
      });
    const oldQty = Number(old.quantity || 0),
      newQty = Number(nw.quantity || 0);
    if (oldQty !== newQty)
      changes.push({ type: "QTY", label: name, old: oldQty, new: newQty, unit: nw.unit || old.unit || "" });
    const oldName = String(old.product_snapshot?.name || old.manual_text || "").trim();
    const newName = String(nw.product_snapshot?.name || nw.manual_text || "").trim();
    if (oldName && newName && oldName !== newName)
      changes.push({ type: "PRODUCT", label: newName, old: oldName, new: newName });
  }
  for (const [k, old] of oldMap) {
    if (!newMap.has(k))
      changes.push({
        type: "PRODUCT",
        label: old.product_snapshot?.name || old.manual_text || "Ürün",
        old: "Eski üründe vardı",
        new: "Kaldırıldı"
      });
  }
  return changes.slice(0, 80);
}
export function saveQuote({ tenantId, userId, quoteId = null, payload }) {
  const profile =
    db
      .prepare("SELECT * FROM profiles WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
      .get(tenantId, payload.profile_id) ||
    db
      .prepare(
        "SELECT * FROM profiles WHERE tenant_id=? AND is_active=1 AND COALESCE(deleted_at,0)=0 LIMIT 1"
      )
      .get(tenantId);
  if (!profile)
    throw Object.assign(new Error("Aktif firma profili bulunamadı."), { status: 422, expose: true });
  const customer = resolveCustomer(tenantId, payload);
  if (!customer)
    throw Object.assign(
      new Error("Müşteri seçilmedi veya bulunamadı. Listeden müşteri seçin ya da firma unvanını doldurun."),
      { status: 422, expose: true }
    );
  const existing = quoteId
    ? db
        .prepare("SELECT * FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
        .get(tenantId, quoteId)
    : null;
  const existingItems = quoteId
    ? db
        .prepare(
          "SELECT * FROM quote_items WHERE quote_id=? AND COALESCE(deleted_at,0)=0 ORDER BY sort_order"
        )
        .all(quoteId)
        .map((x) => ({ ...x, product_snapshot: jsonParse(x.product_snapshot_json, {}) }))
    : [];
  const previousCustomer = existing ? jsonParse(existing.customer_snapshot_json, {}) : customer;
  const customerFallback = { ...customer, ...previousCustomer };
  customerFallback.billing_address = firstAddress(
    previousCustomer.billing_address,
    previousCustomer.address1,
    customer.billing_address,
    customer.address1,
    customer.address2
  );
  customerFallback.delivery_address = firstAddress(
    previousCustomer.delivery_address,
    customer.delivery_address
  );
  customerFallback.address1 = firstAddress(
    previousCustomer.address1,
    previousCustomer.billing_address,
    customer.address1,
    customer.billing_address,
    customer.address2
  );
  const editedCustomer = customerSnapshotFromPayload(payload, customerFallback);
  const items = (payload.items || [])
    .filter((it) => it?.product_id || it?.product_snapshot?.code || it?.product_snapshot?.name)
    .map((it, i) => {
      const p = it.product_id
        ? db
            .prepare(
              "SELECT * FROM products WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0 AND UPPER(COALESCE(status,'ACTIVE')) NOT IN ('DELETED','SILINDI','ARCHIVED','ARSIVLENDI')"
            )
            .get(tenantId, it.product_id)
        : null;
      const snap = cleanProductSnapshot(
        it.product_snapshot && Object.keys(it.product_snapshot).length
          ? it.product_snapshot
          : p
            ? productSnapshot(p)
            : {}
      );
      return { ...it, sort_order: i, product_snapshot_json: jsonString(snap) };
    });
  if (!items.length)
    throw Object.assign(new Error("En az bir ürün veya hizmet satırı ekleyin."), {
      status: 422,
      expose: true
    });
  const oldProfileSnap =
    existing && existing.profile_id === profile.id
      ? jsonParse(existing.profile_snapshot_json, {})
      : profileSnapshot(profile);
  const profileSnap = jsonString({
    ...oldProfileSnap,
    ...profileSnapshot(profile),
    footer_address:
      text(payload.footer_address) ||
      oldProfileSnap.footer_address ||
      profile.footer_address ||
      profile.delivery_address ||
      profile.billing_address ||
      profile.address ||
      "",
    footer_email:
      text(payload.footer_email) ||
      oldProfileSnap.footer_email ||
      profile.footer_email ||
      profile.email ||
      "",
    footer_phone:
      text(payload.footer_phone) ||
      oldProfileSnap.footer_phone ||
      profile.footer_phone ||
      profile.phone ||
      profile.mobile ||
      ""
  });
  const customerSnap = jsonString(editedCustomer),
    totals = calcQuote(items, { type: payload.quote_discount_type, value: payload.quote_discount_value }),
    now = Date.now(),
    manualQuoteNo = text(payload.quote_no).slice(0, 60),
    formInstanceId = text(payload.form_instance_id).slice(0, 100),
    editing = Boolean(quoteId);
  const oldSnapshot = editing ? { quote: existing, items: existingItems } : null;
  return db.transaction(() => {
    let quote;
    if (editing) {
      quote = db
        .prepare("SELECT * FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0")
        .get(tenantId, quoteId);
      if (!quote)
        throw Object.assign(new Error("Proforma bulunamadı veya arşivlenmiş."), {
          status: 404,
          expose: true
        });
      if (payload.record_version && Number(payload.record_version) !== Number(quote.updated_at))
        throw Object.assign(
          new Error(
            "Bu proforma başka bir kullanıcı tarafından güncellendi. Kayıp değişikliği önlemek için sayfayı yenileyip tekrar deneyin."
          ),
          { status: 409, expose: true }
        );
      db.prepare(
        `UPDATE quotes SET quote_no=?,profile_id=?,customer_id=?,profile_snapshot_json=?,customer_snapshot_json=?,quote_date=?,valid_until=?,delivery_date=?,status=?,payment_status=?,order_status=?,production_status=?,currency=?,fx_rate=?,fx_source=?,fx_date=?,subject=?,description=?,project_name=?,project_code=?,paid_amount=?,payment_note=?,payment_terms=?,delivery_terms=?,shipping_terms=?,installation_terms=?,warranty_terms=?,legal_note=?,extra_note=?,template_key=?,quote_discount_type=?,quote_discount_value=?,quote_discount_total=?,subtotal=?,discount_total=?,vat_total=?,grand_total=?,revision_new_total=CASE WHEN revision_no>0 THEN ? ELSE revision_new_total END,revision_compare_json=CASE WHEN revision_no>0 THEN ? ELSE revision_compare_json END,show_try_total=?,updated_at=? WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0`
      ).run(
        manualQuoteNo || quote.quote_no,
        profile.id,
        customer.id,
        profileSnap,
        customerSnap,
        payload.quote_date,
        payload.valid_until || null,
        payload.delivery_date || null,
        quote.status || "DRAFT",
        quote.payment_status || "UNPAID",
        quote.order_status || "NONE",
        quote.production_status || "NOT_STARTED",
        payload.currency || "TRY",
        n(payload.fx_rate, 1),
        payload.fx_source || "MANUAL",
        payload.fx_date || payload.quote_date,
        payload.subject || "",
        payload.description || "",
        payload.project_name || "",
        payload.project_code || "",
        n(payload.paid_amount, existing?.paid_amount || 0),
        payload.payment_note || existing?.payment_note || "",
        payload.payment_terms || "",
        payload.delivery_terms || "",
        payload.shipping_terms || "",
        payload.installation_terms || "",
        payload.warranty_terms || "",
        payload.legal_note || "",
        payload.extra_note || "",
        payload.template_key || "corporate-main",
        totals.quote_discount_type,
        totals.quote_discount_value,
        totals.quote_discount_total,
        totals.subtotal,
        totals.discount_total,
        totals.vat_total,
        totals.grand_total,
        totals.grand_total,
        jsonString(
          revisionCompare(
            existingItems,
            totals.items.map((x) => ({ ...x, product_snapshot: jsonParse(x.product_snapshot_json, {}) }))
          )
        ),
        Number(payload.show_try_total ?? 1) ? 1 : 0,
        now,
        tenantId,
        quoteId
      );
      if (formInstanceId)
        db.prepare(
          "UPDATE quotes SET form_instance_id=COALESCE(NULLIF(form_instance_id,''),?) WHERE tenant_id=? AND id=?"
        ).run(formInstanceId, tenantId, quoteId);
    } else {
      quoteId = id("quo");
      const no = manualQuoteNo || nextQuoteNo(tenantId);
      db.prepare(
        `INSERT INTO quotes(id,tenant_id,quote_no,revision_no,profile_id,customer_id,profile_snapshot_json,customer_snapshot_json,quote_date,valid_until,delivery_date,status,payment_status,order_status,production_status,currency,fx_rate,fx_source,fx_date,subject,description,project_name,project_code,paid_amount,payment_note,payment_terms,delivery_terms,shipping_terms,installation_terms,warranty_terms,legal_note,extra_note,template_key,quote_discount_type,quote_discount_value,quote_discount_total,subtotal,discount_total,vat_total,grand_total,show_try_total,created_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(
        quoteId,
        tenantId,
        no,
        0,
        profile.id,
        customer.id,
        profileSnap,
        customerSnap,
        payload.quote_date,
        payload.valid_until || null,
        payload.delivery_date || null,
        "DRAFT",
        "UNPAID",
        "NONE",
        "NOT_STARTED",
        payload.currency || "TRY",
        n(payload.fx_rate, 1),
        payload.fx_source || "MANUAL",
        payload.fx_date || payload.quote_date,
        payload.subject || "",
        payload.description || "",
        payload.project_name || "",
        payload.project_code || "",
        n(payload.paid_amount, 0),
        payload.payment_note || "",
        payload.payment_terms || "",
        payload.delivery_terms || "",
        payload.shipping_terms || "",
        payload.installation_terms || "",
        payload.warranty_terms || "",
        payload.legal_note || "",
        payload.extra_note || "",
        payload.template_key || "corporate-main",
        totals.quote_discount_type,
        totals.quote_discount_value,
        totals.quote_discount_total,
        totals.subtotal,
        totals.discount_total,
        totals.vat_total,
        totals.grand_total,
        Number(payload.show_try_total ?? 1) ? 1 : 0,
        userId,
        now,
        now
      );
      if (formInstanceId)
        db.prepare("UPDATE quotes SET form_instance_id=? WHERE tenant_id=? AND id=?").run(
          formInstanceId,
          tenantId,
          quoteId
        );
    }
    const itemArgs = (it, i) => [
      i,
      it.product_id || null,
      it.product_snapshot_json,
      it.quantity,
      it.unit || "ADET",
      it.unit_price,
      it.currency || payload.currency || "TRY",
      it.discount_type || "PERCENT",
      it.discount_value,
      it.vat_rate,
      it.line_net,
      it.line_vat,
      it.line_total,
      n(it.is_optional),
      n(it.is_alternative),
      n(it.include_total, 1),
      n(it.show_image, 1),
      n(it.show_description, 1),
      n(it.show_technical),
      text(it.alternative_to_product_id) || null,
      text(it.alternative_to_name),
      text(it.alternative_type) || "EQUIVALENT",
      text(it.alternative_note)
    ];
    const ins = db.prepare(
      `INSERT INTO quote_items(id,quote_id,sort_order,product_id,product_snapshot_json,quantity,unit,unit_price,currency,discount_type,discount_value,vat_rate,line_net,line_vat,line_total,is_optional,is_alternative,include_total,show_image,show_description,show_technical,alternative_to_product_id,alternative_to_name,alternative_type,alternative_note,deleted_at,deleted_by,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    );
    const upd = db.prepare(
      `UPDATE quote_items SET sort_order=?,product_id=?,product_snapshot_json=?,quantity=?,unit=?,unit_price=?,currency=?,discount_type=?,discount_value=?,vat_rate=?,line_net=?,line_vat=?,line_total=?,is_optional=?,is_alternative=?,include_total=?,show_image=?,show_description=?,show_technical=?,alternative_to_product_id=?,alternative_to_name=?,alternative_type=?,alternative_note=?,deleted_at=NULL,deleted_by=NULL,updated_at=? WHERE quote_id=? AND id=?`
    );
    const existingMap = new Map(existingItems.map((item) => [String(item.id), item])),
      kept = new Set();
    totals.items.forEach((it, i) => {
      const requested = text(it.id),
        reuse = editing && requested && existingMap.has(requested) && !kept.has(requested),
        itemId = reuse ? requested : id("qit");
      if (reuse) upd.run(...itemArgs(it, i), now, quoteId, itemId);
      else ins.run(itemId, quoteId, ...itemArgs(it, i), null, null, now, now);
      kept.add(itemId);
    });
    if (editing) {
      const archive = db.prepare(
        "UPDATE quote_items SET deleted_at=?,deleted_by=?,updated_at=? WHERE quote_id=? AND id=? AND COALESCE(deleted_at,0)=0"
      );
      for (const old of existingItems) {
        if (!kept.has(String(old.id))) archive.run(now, userId, now, quoteId, old.id);
      }
    }
    const result = loadQuote(tenantId, quoteId);
    if (editing)
      db.prepare(
        "INSERT INTO quote_events(id,tenant_id,quote_id,event_type,old_json,new_json,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
      ).run(
        id("qev"),
        tenantId,
        quoteId,
        "QUOTE_CONTENT_UPDATE",
        jsonString(oldSnapshot),
        jsonString({ quote: result, items: result.items }),
        "Proforma düzenleme öncesi ve sonrası otomatik içerik anlık görüntüsü.",
        userId,
        now
      );
    return result;
  })();
}
export function createRevision(tenantId, userId, quoteId) {
  const source = loadQuote(tenantId, quoteId);
  if (!source) throw Object.assign(new Error("Proforma bulunamadı."), { status: 404, expose: true });
  const now = Date.now(),
    rid = id("quo");
  return db.transaction(() => {
    const rev = Number(
      db
        .prepare("SELECT COALESCE(MAX(revision_no),0)+1 AS n FROM quotes WHERE tenant_id=? AND quote_no=?")
        .get(tenantId, source.quote_no).n || 1
    );
    db.prepare(
      `INSERT INTO quotes(id,tenant_id,quote_no,revision_no,revision_parent_id,profile_id,customer_id,profile_snapshot_json,customer_snapshot_json,quote_date,valid_until,delivery_date,status,payment_status,order_status,production_status,currency,fx_rate,fx_source,fx_date,subject,description,project_name,project_code,paid_amount,payment_note,payment_terms,delivery_terms,shipping_terms,installation_terms,warranty_terms,legal_note,extra_note,template_key,quote_discount_type,quote_discount_value,quote_discount_total,subtotal,discount_total,vat_total,grand_total,revision_old_total,revision_new_total,show_try_total,created_by,created_at,updated_at) SELECT ?,tenant_id,quote_no,?,id,profile_id,customer_id,profile_snapshot_json,customer_snapshot_json,quote_date,valid_until,delivery_date,'REVISION_REQUESTED',payment_status,order_status,production_status,currency,fx_rate,fx_source,fx_date,subject,description,project_name,project_code,paid_amount,payment_note,payment_terms,delivery_terms,shipping_terms,installation_terms,warranty_terms,legal_note,extra_note,template_key,COALESCE(quote_discount_type,'PERCENT'),COALESCE(quote_discount_value,0),COALESCE(quote_discount_total,0),subtotal,discount_total,vat_total,grand_total,grand_total,grand_total,show_try_total,?,?,? FROM quotes WHERE tenant_id=? AND id=? AND COALESCE(deleted_at,0)=0`
    ).run(rid, rev, userId, now, now, tenantId, quoteId);
    db.prepare(
      `INSERT INTO quote_items(id,quote_id,sort_order,product_id,product_snapshot_json,quantity,unit,unit_price,currency,discount_type,discount_value,vat_rate,line_net,line_vat,line_total,is_optional,is_alternative,include_total,show_image,show_description,show_technical,alternative_to_product_id,alternative_to_name,alternative_type,alternative_note,deleted_at,deleted_by,created_at,updated_at) SELECT lower(hex(randomblob(16))),?,sort_order,product_id,product_snapshot_json,quantity,unit,unit_price,currency,discount_type,discount_value,vat_rate,line_net,line_vat,line_total,is_optional,is_alternative,include_total,show_image,show_description,show_technical,alternative_to_product_id,alternative_to_name,alternative_type,alternative_note,NULL,NULL,?,? FROM quote_items WHERE quote_id=? AND COALESCE(deleted_at,0)=0`
    ).run(rid, now, now, quoteId);
    db.prepare(
      "INSERT INTO quote_events(id,tenant_id,quote_id,event_type,old_json,new_json,note,created_by,created_at) VALUES(?,?,?,?,?,?,?,?,?)"
    ).run(
      id("qev"),
      tenantId,
      rid,
      "REVISION_CREATED",
      jsonString({
        source_quote_id: quoteId,
        source_revision: source.revision_no,
        source_items: source.items
      }),
      jsonString({ revision_no: rev }),
      "Kaynak proformadan geri getirilebilir revizyon oluşturuldu.",
      userId,
      now
    );
    return loadQuote(tenantId, rid);
  })();
}
