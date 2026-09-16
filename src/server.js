import path from "path";
import fs from "fs";
import crypto from "crypto";
import express from "express";
import engine from "ejs-mate";
import session from "express-session";
import helmet from "helmet";
import { config } from "./config.js";
import { db } from "./db/db.js";
import "./db/migrate.js";
import { ensureOperationalSchema } from "./services/operational-schema.service.js";
import { context } from "./middleware/context.js";
import { csrfToken, verifyCsrf } from "./middleware/csrf.js";
import { notFound, errorHandler } from "./middleware/error-handler.js";
import { requireAuth, requireRole } from "./middleware/auth.js";
import { migrateStoredSecrets } from "./services/secret-migration.service.js";
import auth from "./routes/auth.js";
import dashboard from "./routes/dashboard.js";
import profiles from "./routes/profiles.js";
import customers from "./routes/customers.js";
import products from "./routes/products.js";
import quotes from "./routes/quotes.js";
import templates from "./routes/templates.js";
import settings from "./routes/settings.js";
import users from "./routes/users.js";
import audit from "./routes/audit.js";
import search from "./routes/search.js";
import backups from "./routes/backups.js";
import setup from "./routes/setup.js";
import livePublic from "./routes/live-public.js";
import live from "./routes/live.js";
import api from "./routes/api.js";
import integrations from "./routes/integrations.js";
import invoices from "./routes/invoices.js";
import excel from "./routes/excel.js";
import publicQuotes from "./routes/public-quotes.js";
import systemHealth from "./routes/system-health.js";
import recovery from "./routes/recovery.js";
import { createSessionStore } from "./services/session-store.service.js";
import { authorizeUploadRequest } from "./services/upload-access.service.js";
const app = express(),
  sessionStore = createSessionStore(config.dbFile);
const sessionMiddleware = session({
  name: "efsana36.sid",
  store: sessionStore,
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    maxAge: config.sessionHours * 60 * 60 * 1000
  }
});
for (const d of [
  path.dirname(config.dbFile),
  config.publicUploadDir,
  config.privateUploadDir,
  config.sharedDir
])
  fs.mkdirSync(d, { recursive: true });
try {
  fs.mkdirSync(config.backupDir, { recursive: true });
} catch (e) {
  console.warn(
    "[startup] BACKUP_DIR oluşturulamadı; yedekleme paneli yazılabilir güvenli klasöre geçecek:",
    e.message || e
  );
}
ensureOperationalSchema();
migrateStoredSecrets();
app.disable("x-powered-by");
app.set("trust proxy", config.trustProxy);
app.use((_req, res, next) => {
  res.setHeader("X-CRM-Build", config.buildId);
  next();
});
app.engine("ejs", engine);
app.set("view engine", "ejs");
app.set("views", path.join(config.root, "views"));
app.use((_req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(18).toString("base64");
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", (_req, res) => `'nonce-${res.locals.cspNonce}'`],
        "script-src-attr": ["'none'"],
        "style-src": ["'self'", (_req, res) => `'nonce-${res.locals.cspNonce}'`],
        "style-src-attr": ["'none'"],
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "font-src": ["'self'", "data:"],
        "frame-src": ["'self'"],
        "connect-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'self'"]
      }
    },
    crossOriginEmbedderPolicy: false
  })
);
app.use(express.urlencoded({ extended: true, limit: "2mb", parameterLimit: 2000 }));
app.use(express.json({ limit: "2mb" }));
app.use(
  "/public/uploads",
  sessionMiddleware,
  authorizeUploadRequest,
  express.static(config.publicUploadDir, {
    maxAge: config.isProd ? "1h" : 0,
    dotfiles: "deny",
    fallthrough: true,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
      res.setHeader("Cache-Control", config.isProd ? "private, max-age=3600" : "private, no-store");
      if (ext === ".pdf") {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=\"${path.basename(filePath).replace(/[\"\r\n]/g, "_")}\"`
        );
        res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
      }
    }
  }),
  (_req, res) => res.status(404).end()
);
app.use(
  "/assets/fonts/inter",
  express.static(path.join(config.root, "node_modules/@fontsource/inter/files"), {
    maxAge: config.isProd ? "30d" : 0,
    dotfiles: "deny",
    fallthrough: false,
    index: false,
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    }
  })
);
app.use("/public/build", (req, res, next) => {
  const file = path.basename(req.path),
    hashed = /^crm-(?:styles|print|app)\.[a-f0-9]{16}\.(?:css|js)$/.test(file);
  if (!hashed) return next();
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("Vary", "Accept-Encoding");
  if (
    !String(req.get("accept-encoding") || "")
      .split(",")
      .some((x) => x.trim().startsWith("gzip"))
  )
    return next();
  const compressed = path.join(config.root, "public", "build", `${file}.gz`);
  if (!fs.existsSync(compressed)) return next();
  res.setHeader("Content-Encoding", "gzip");
  res.setHeader(
    "Content-Type",
    file.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  return res.sendFile(compressed);
});
app.use(
  "/public",
  express.static(path.join(config.root, "public"), {
    maxAge: config.isProd ? "7d" : 0,
    dotfiles: "deny",
    fallthrough: true
  })
);
const faviconFiles = new Set([
  "favicon.ico",
  "favicon-16.png",
  "favicon-32.png",
  "favicon-48.png",
  "favicon-64.png",
  "favicon-128.png",
  "favicon-180.png",
  "favicon-192.png",
  "favicon-512.png",
  "apple-touch-icon.png",
  "android-chrome-192x192.png",
  "android-chrome-512x512.png",
  "site.webmanifest"
]);
app.get(
  /^\/(favicon\.ico|favicon-\d+\.png|apple-touch-icon\.png|android-chrome-\d+x\d+\.png|site\.webmanifest)$/,
  (req, res, next) => {
    const file = path.basename(req.path);
    if (!faviconFiles.has(file)) return next();
    res.setHeader("Cache-Control", config.isProd ? "public, max-age=604800" : "no-store");
    res.sendFile(path.join(config.root, "public", file));
  }
);
app.get("/health", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  try {
    db.prepare("SELECT 1").get();
    res.json({
      ok: true,
      service: "crm-erp-efsana36",
      version: config.appVersion,
      release: config.releaseId,
      build: config.buildId
    });
  } catch {
    res.status(503).json({
      ok: false,
      service: "crm-erp-efsana36",
      version: config.appVersion,
      release: config.releaseId,
      build: config.buildId
    });
  }
});
app.use("/live", livePublic);
app.use("/q", publicQuotes);
app.use(sessionMiddleware);
app.use(context, csrfToken, verifyCsrf);
app.get("/auth/csrf-token", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.setHeader("Pragma", "no-cache");
  res.json({ ok: true, csrfToken: req.session.csrfToken });
});
app.get("/health/details", requireAuth, requireRole("SUPER_ADMIN", "TENANT_ADMIN"), (_req, res) => {
  try {
    const migration = db.prepare("SELECT MAX(version) AS version FROM schema_migrations").get()?.version || 0;
    const storage = [path.dirname(config.dbFile), config.privateUploadDir, config.backupDir].every((d) => {
      try {
        fs.accessSync(d, fs.constants.R_OK | fs.constants.W_OK);
        return true;
      } catch {
        return false;
      }
    });
    res.setHeader("Cache-Control", "no-store");
    res.json({
      ok: true,
      service: "crm-erp-efsana36",
      version: config.appVersion,
      release: config.releaseId,
      build: config.buildId,
      environment: config.isProd ? "production" : "development",
      db: true,
      migration,
      buildTime: config.buildTime,
      storage
    });
  } catch (e) {
    res.status(503).json({ ok: false, version: config.appVersion, error: "health_check_failed" });
  }
});
app.use(auth);
app.use("/api", api);
app.use("/search", search);
app.use("/live", live);
app.use("/excel", excel);
app.use("/invoices", invoices);
app.use("/integrations", integrations);
app.use("/backups", backups);
app.use("/system-health", systemHealth);
app.use("/recovery", recovery);
app.use("/setup", setup);
app.use("/profiles", profiles);
app.use("/customers", customers);
app.use("/products", products);
app.use("/quotes", quotes);
app.use("/templates", templates);
app.use("/settings", settings);
app.use("/users", users);
app.use("/audit", audit);
app.use("/", dashboard);
app.use(notFound);
app.use(errorHandler);
const server = app.listen(config.port, config.host, () =>
  console.log(`[crm-erp] v${config.appVersion} http://${config.host}:${config.port}`)
);
let closing = false;
const shutdown = (signal) => {
  if (closing) return;
  closing = true;
  console.log(`[crm-erp] ${signal}: güvenli kapanış`);
  server.close(() => {
    try {
      sessionStore.close();
    } catch {}
    try {
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {}
    try {
      db.close();
    } catch {}
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
