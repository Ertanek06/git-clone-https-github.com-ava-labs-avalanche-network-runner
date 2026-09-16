const PREFIX = "MUS";
const WIDTH = 5;
const AUTO_CODE = /^MUS(\d+)$/i;

const asCode = (value) => `${PREFIX}${String(value).padStart(WIDTH, "0")}`;
const codeNumber = (value) => {
  const match = AUTO_CODE.exec(String(value ?? "").trim());
  return match ? Number(match[1]) || 0 : 0;
};

export function nextCustomerCodeFromCodes(codes = [], { minimum = 1 } = {}) {
  let current = Math.max(1, Number(minimum) || 1);
  const used = new Set();
  for (const value of codes) {
    const code = String(value ?? "")
      .trim()
      .toUpperCase();
    if (code) used.add(code);
    current = Math.max(current, codeNumber(value) + 1);
  }
  while (used.has(asCode(current))) current += 1;
  return asCode(current);
}

export function customerCodeNumber(value) {
  return codeNumber(value);
}
