import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.PRIVATE_UPLOAD_DIR=fs.mkdtempSync(path.join(os.tmpdir(),'arteva-v372-strict-'));
const {parseProformaTextForTest,analyzeProformaFile}=await import('../src/services/proforma-product-import.service.js');
const text=`FİYAT TEKLİFİ
Ürün Kodu    Ürün Adı ve Açıklama                    Miktar    Birim    Birim Fiyat    Para Birimi
ETV-120      Fanlı Etüv 120 L                        1         ADET     1.250,00       EUR
PMP-20       Vakum Pompası                           2         ADET     850,00         EUR
             İVEDİKKÖY MAHALLESİ MELİH               100       CM       160            TRY
             ESD ÇALIŞMA MASASI 160X100X2000 DERİNLİK 100      CM       160            TRY
TAŞIYICI     TAŞIYICI PROFİLLER 40X40 BOYA           1         ADET     3              TRY
GARANTİ: Cihazlar imalat hatalarına karşı ücretsiz olarak 2 yıl süre ile garanti
TESLİMAT: 4 hafta
ÖDENECEK TUTAR 2.950,00 EUR
`;
const parsed=parseProformaTextForTest(text);
assert.equal(parsed.rows.length,2);
assert.deepEqual(parsed.rows.map(x=>x.code),['ETV-120','PMP-20']);
assert.deepEqual(parsed.rows.map(x=>x.currency),['EUR','EUR']);
assert.ok(parsed.rows.every(x=>!/garanti|teslim|ödenecek|toplam/i.test(x.name)));
const ancillary=parseProformaTextForTest(`FİYAT TEKLİFİ\nGARANTİ: 2 YIL 2 EUR\nTESLİMAT: 4 HAFTA 4 EUR\nÖDENECEK TUTAR 100 EUR`);
assert.equal(ancillary.rows.length,0);
const fixture=path.resolve('tests/fixtures/proforma-sample.pdf');
const pdf=await analyzeProformaFile({path:fixture,originalname:'proforma-sample.pdf',size:fs.statSync(fixture).size});
assert.equal(pdf.rows.length,2);
console.log('V372_STRICT_IMPORT_TESTS=10/10 OK');
