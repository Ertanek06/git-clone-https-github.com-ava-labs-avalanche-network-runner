import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import * as XLSXModule from "xlsx";
import { analyzeProformaFile } from "../src/services/proforma-product-import.service.js";

const XLSX=XLSXModule?.default||XLSXModule;
const root=fs.mkdtempSync(path.join(os.tmpdir(),"arteva-v359-excel-"));
const writeBook=(name,matrix)=>{
  const ws=XLSX.utils.aoa_to_sheet(matrix);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,"Teklif");
  const filePath=path.join(root,name);
  fs.writeFileSync(filePath,XLSX.write(wb,{type:"buffer",bookType:"xlsx"}));
  return filePath;
};
try{
  const good=writeBook("proforma.xlsx",[
    ["Firma Proforması"],
    ["Ürün Kodu","Ürün Adı","Açıklama","Miktar","Birim","Birim Fiyat","Para Birimi","KDV"],
    ["ABC-100","Laboratuvar Etüvü","120 litre fanlı",2,"ADET","1.250,50","EUR",20],
    ["XYZ-200","Manyetik Karıştırıcı","Isıtıcılı",1,"ADET",350,"USD",20]
  ]);
  const parsed=await analyzeProformaFile({path:good,originalname:"proforma.xlsx",size:fs.statSync(good).size,mimetype:"application/octet-stream"});
  assert.equal(parsed.rows.length,2);
  assert.equal(parsed.rows[0].code,"ABC-100");
  assert.equal(parsed.rows[0].price,1250.5);
  assert.equal(parsed.rows[0].currency,"EUR");
  assert.equal(parsed.rows[1].name,"Manyetik Karıştırıcı");
  assert.equal(parsed.source.sha256,crypto.createHash("sha256").update(fs.readFileSync(good)).digest("hex"));

  const shifted=writeBook("shifted-description.xlsx",[
    ["Ürün Kodu","Ürün Adı","Açıklama","Miktar","Birim","Birim Fiyat","Para Birimi","KDV"],
    ["ESD-1","ESD ÇALIŞMA MASASI","45.000,00 20%",8,"ADET","45.000,00","TRY",20],
    ["ESD-2","ESD SANDALYE","20%",28,"ADET","56.000,00","TRY",20],
    ["ETUV-1","Fanlı Etüv","Fanlı, PID kontrollü 1.250 EUR 20%",1,"ADET","1.250,00","EUR",20]
  ]);
  const cleaned=await analyzeProformaFile({path:shifted,originalname:"shifted-description.xlsx",size:fs.statSync(shifted).size,mimetype:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
  assert.deepEqual(cleaned.rows.map(row=>row.description),["","","Fanlı, PID kontrollü"]);
  assert.deepEqual(cleaned.rows.map(row=>row.price),[45000,56000,1250]);

  const empty=writeBook("empty.xlsx",[["Firma","Adres"],["Örnek Firma","Ankara"],["Genel Toplam","1500 EUR"]]);
  await assert.rejects(
    ()=>analyzeProformaFile({path:empty,originalname:"empty.xlsx",size:fs.statSync(empty).size,mimetype:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),
    error=>error?.code==="NO_PRODUCT_ROWS"&&error?.status===422
  );
  console.log("V359_EXCEL_PARSER_TESTS=12/12 OK");
}finally{
  fs.rmSync(root,{recursive:true,force:true});
}
