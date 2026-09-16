const EMAIL_PATTERN = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]{2,}$/i;

function parts(value) {
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => String(item || "").split(/[\s,;]+/))
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseEmailList(value, { required = false, label = "E-posta", max = 25 } = {}) {
  const result = [];
  const seen = new Set();
  for (const address of parts(value)) {
    const key = address.toLocaleLowerCase("en-US");
    if (seen.has(key)) continue;
    if (!EMAIL_PATTERN.test(address))
      throw Object.assign(new Error(`${label} alanında geçersiz adres: ${address}`), {
        status: 422,
        expose: true
      });
    seen.add(key);
    result.push(address);
    if (result.length > max)
      throw Object.assign(new Error(`${label} alanına en fazla ${max} adres eklenebilir.`), {
        status: 422,
        expose: true
      });
  }
  if (required && !result.length)
    throw Object.assign(new Error(`${label} alanına en az bir e-posta adresi ekleyin.`), {
      status: 422,
      expose: true
    });
  return result;
}

export function emailListText(value) {
  return parseEmailList(value).join(", ");
}
