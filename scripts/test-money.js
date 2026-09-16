import fs from "fs";
import vm from "vm";

const source = fs.readFileSync(new URL("../src/services/quote.service.js", import.meta.url), "utf8");
const start = source.search(/const\s+n\s*=/);
const end = source.search(/const\s+customerSearch\s*=/);
if (start < 0 || end < 0) throw new Error("Para hesaplama bölümü bulunamadı.");
const code = source.slice(start, end)
  .replaceAll("export function calcItem", "function calcItem")
  .replaceAll("export function calcQuote", "function calcQuote") + "\nthis.calcItem=calcItem;this.calcQuote=calcQuote;";
const sandbox = { console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const eq = (actual, expected, label) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`${label}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`);
};
eq(sandbox.calcItem({ quantity: 3, unit_price: 0.1, vat_rate: 0 }).line_total, 0.3, "ondalık çarpım");
eq(sandbox.calcItem({ quantity: 1, unit_price: 100, discount_type: "PERCENT", discount_value: 33.33, vat_rate: 0 }).line_net, 66.67, "yüzde indirim");
eq(sandbox.calcItem({ quantity: 1, unit_price: 10, discount_type: "AMOUNT", discount_value: 20, vat_rate: 0 }).line_net, 0, "indirim üst sınırı");
eq(sandbox.calcQuote([{ quantity: 2, unit_price: 10.005, vat_rate: 20 }, { quantity: 1, unit_price: 5, vat_rate: 20 }]).grand_total, 30.02, "teklif toplamı");
console.log("MONEY_CALC_TESTS=4/4 OK");
