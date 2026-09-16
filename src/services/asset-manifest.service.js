import fs from "fs";
import path from "path";
import { config } from "../config.js";

let cached = null;
const validAsset = (value, extension) =>
  new RegExp(`^/public/build/crm-[a-z]+\\.[a-f0-9]{16}\\.${extension}$`, "i").test(value);

const pageScriptsFor = (manifest, pathname) => {
  const pathValue = String(pathname || "");
  if (pathValue === "/" || pathValue === "/dashboard") return [manifest.pageJs.dashboard];
  if (/^\/quotes(?:\/|$)/.test(pathValue)) return [manifest.pageJs.quotes];
  if (/^\/templates(?:\/|$)/.test(pathValue)) return [manifest.pageJs.templates];
  if (pathValue === "/settings/theme") return [manifest.pageJs.theme];
  if (pathValue === "/settings/login") return [manifest.pageJs.loginStudio];
  if (["/login", "/forgot-password", "/reset-password", "/change-password"].includes(pathValue))
    return [manifest.pageJs.auth];
  return [];
};

export function getAssetManifest(pathname = "") {
  if (cached) return { ...cached, pageScripts: pageScriptsFor(cached, pathname).filter(Boolean) };
  try {
    const raw = JSON.parse(
      fs.readFileSync(path.join(config.root, "public/build/asset-manifest.json"), "utf8")
    );
    if (
      Number(raw.schema) !== 3 ||
      !validAsset(raw.stylesCss, "css") ||
      !validAsset(raw.printCss, "css") ||
      !validAsset(raw.appJs, "js") ||
      !validAsset(raw.printJs, "js") ||
      !raw.pageJs ||
      Object.values(raw.pageJs).some((value) => !validAsset(value, "js"))
    ) {
      throw new Error("invalid asset manifest");
    }
    cached = {
      styles: raw.stylesCss,
      print: raw.printCss,
      js: raw.appJs,
      printJs: raw.printJs,
      pageJs: raw.pageJs
    };
  } catch {
    cached = {
      styles: "/public/css/app.css",
      print: "/public/css/print.css",
      js: "/public/js/app.js",
      printJs: "/public/js/print-paginator.js",
      pageJs: {
        dashboard: "/public/js/dashboard-proforma-visits-v16.js",
        quotes: "/public/js/quote-form.js",
        templates: "/public/js/template-studio.js",
        theme: "/public/js/theme-studio.js",
        loginStudio: "/public/js/login-studio-v356.js",
        auth: "/public/js/login-page-v356.js"
      }
    };
  }
  return { ...cached, pageScripts: pageScriptsFor(cached, pathname).filter(Boolean) };
}
