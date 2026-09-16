import fs from "fs";
import path from "path";
const root = new URL("../views", import.meta.url);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".ejs")) files.push(full);
  }
}
function syntaxSource(source) {
  const pattern = /<%([_=\-#]?)([\s\S]*?)(?:-%>|%>)/g;
  let match;
  let code = "";
  while ((match = pattern.exec(source))) {
    const marker = match[1];
    const body = match[2];
    if (marker === "#") continue;
    if (marker === "=" || marker === "-") code += `\nvoid (${body});\n`;
    else code += `\n${body}\n`;
  }
  return `with (locals) {${code}}`;
}
walk(root.pathname);
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  try { new Function("locals", syntaxSource(source)); }
  catch (error) { throw new Error(`EJS syntax error in ${file}: ${error.message}`); }
  for (const match of source.matchAll(/\blayout\(\s*["']([^"']+)["']\s*\)/g)) {
    const layoutFile = path.resolve(root.pathname, `${match[1]}.ejs`);
    if (!fs.existsSync(layoutFile)) throw new Error(`Missing EJS layout in ${file}: ${layoutFile}`);
  }
}
console.log(`EJS_COMPILE_TESTS=${files.length}/${files.length} OK`);
