import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const render=(file,locals)=>ejs.render(read(file),locals,{filename:path.join(root,file)});
let checks=0;
const check=(condition,message)=>{assert.ok(condition,message);checks+=1};
const equal=(actual,expected,message)=>{assert.equal(actual,expected,message);checks+=1};

const quoteBase={
  layout:()=>{},
  can:()=>true,
  canSeeFinancials:true,
  locale:"tr",
  t:key=>key,
  q:"",
  status:"",
  sort:"recent",
  total:0,
  csrfToken:"test",
  rows:[],
  statusLabel:value=>value,
  statusClass:()=>"",
  quoteDisplayNo:()=>"",
};
for(const [showMoney,expectedColumns] of [[true,10],[false,8]]){
  const html=render("views/quotes/index.ejs",{...quoteBase,canSeeFinancials:showMoney});
  equal((html.match(/<col\b/g)||[]).length,expectedColumns,`Proforma colgroup (${showMoney})`);
  equal((html.match(/<th\b/g)||[]).length,expectedColumns,`Proforma başlıkları (${showMoney})`);
  check(html.includes(`colspan="${expectedColumns}"`),`Proforma boş satır colspan (${showMoney})`);
}

const stats={pending:0,approved:0,revision:0,ordered:0,production:0,delivered:0,rejected:0,payments:0,approvals:0,followups:0};
for(const [financials,expectedColumns] of [[true,11],[false,10]]){
  const html=render("views/quotes/processes.ejs",{
    layout:()=>{},
    processCapabilities:{quoteCreate:true,quoteEdit:true,quoteExport:true,financials,orders:true,approvals:true},
    allowedFlows:["all","pending","approved","revision","ordered","production","delivered","rejected","payments","approvals","followups"],
    stats,
    flow:"all",
    rows:[],
    total:0,
    page:1,
    limit:50,
    showAll:false,
    csrfToken:"test",
    quoteDisplayNo:()=>"",
    statusLabel:value=>value,
    statusClass:()=>"",
  });
  equal((html.match(/<col\b/g)||[]).length,expectedColumns,`Süreç colgroup (${financials})`);
  equal((html.match(/<th\b/g)||[]).length,expectedColumns,`Süreç başlıkları (${financials})`);
  check(html.includes(`colspan="${expectedColumns}"`),`Süreç boş satır colspan (${financials})`);
}

for(const [role,expectedActions] of [["SUPER_ADMIN",2],["VIEWER",1]]){
  const html=render("views/customers/index.ejs",{
    layout:()=>{},
    user:{role},
    can:()=>role==="SUPER_ADMIN",
    q:"",
    sort:"recent",
    limit:10,
    total:0,
    page:1,
    csrfToken:"test",
    rows:[],
  });
  equal((html.match(/<col\b/g)||[]).length,10,`Müşteri colgroup (${role})`);
  equal((html.match(/<th\b/g)||[]).length,10,`Müşteri başlıkları (${role})`);
  check(html.includes(`actions-col--${expectedActions}`),`Müşteri işlem sayısı (${role})`);
  check(html.includes('colspan="10"'),`Müşteri boş satır colspan (${role})`);
}

for(const [financials,expectedColumns] of [[true,10],[false,9]]){
  const html=render("views/products/index.ejs",{
    layout:()=>{},
    user:{role:"SUPER_ADMIN"},
    can:()=>true,
    canSeeFinancials:financials,
    locale:"tr",
    q:"",
    sort:"recent",
    limit:10,
    total:0,
    page:1,
    csrfToken:"test",
    rows:[],
  });
  equal((html.match(/<col\b/g)||[]).length,expectedColumns,`Ürün colgroup (${financials})`);
  equal((html.match(/<th\b/g)||[]).length,expectedColumns,`Ürün başlıkları (${financials})`);
  check(html.includes(`colspan="${expectedColumns}"`),`Ürün boş satır colspan (${financials})`);
}

for(const [financials,expectedColumns] of [[true,9],[false,7]]){
  const html=render("views/quotes/archives.ejs",{
    layout:()=>{},
    q:"",
    csrfToken:"test",
    canSeeFinancials:financials,
    rows:[],
    statusLabel:value=>value,
    statusClass:()=>"",
    quoteDisplayNo:()=>"",
    page:1,
    limit:10,
    total:0,
  });
  equal((html.match(/<col\b/g)||[]).length,expectedColumns,`Arşiv colgroup (${financials})`);
  equal((html.match(/<th\b/g)||[]).length,expectedColumns,`Arşiv başlıkları (${financials})`);
  check(html.includes(`colspan="${expectedColumns}"`),`Arşiv boş satır colspan (${financials})`);
}

const actionViews=[
  "views/customers/index.ejs",
  "views/customers/preview.ejs",
  "views/products/index.ejs",
  "views/products/import-proforma-preview.ejs",
  "views/quotes/index.ejs",
  "views/quotes/processes.ejs",
  "views/quotes/archives.ejs",
  "views/users/index.ejs",
];
for(const file of actionViews){
  const source=read(file);
  check(source.includes("table-action-icon"),`${file} ortak işlem ikonunu kullanmalı`);
  check(!/<(?:a|button)[^>]*class="[^"]*\btable-action\b[^"]*"[^>]*>[\s\S]{0,160}<span\s+aria-hidden="true">(?:◉|✎|↗|⎙|🗑|🗄)<\/span>/.test(source),`${file} platforma bağlı tablo glifi içermemeli`);
}

for(const file of fs.readdirSync(path.join(root,"views"),{recursive:true}).filter(name=>String(name).endsWith(".ejs"))){
  const source=read(path.join("views",String(file)));
  let depth=0;
  for(const match of source.matchAll(/<form\b|<\/form>/gi)){
    if(match[0].startsWith("</")){
      depth=Math.max(0,depth-1);
    }else{
      check(depth===0,`${file} iç içe form içermemeli`);
      depth+=1;
    }
  }
}

const archive=read("views/quotes/archives.ejs");
const bulkStart=archive.indexOf('id="archiveBulkForm"');
const bulkClose=archive.indexOf("</form>",bulkStart);
const archiveTable=archive.indexOf("<table",bulkStart);
check(bulkStart>=0&&bulkClose>=0&&archiveTable>bulkClose,"Arşiv toplu formu satır formlarını sarmamalı");

console.log(`V3814_UI_CONTRACTS=${checks}/${checks} OK`);
