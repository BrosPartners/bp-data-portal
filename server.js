// Server tinh gian cho portal, thay the "npx serve" thuan tuy.
//
// La NOI DUY NHAT xu ly dang nhap that su (Google OAuth + ky/kiem cookie phien) —
// cac app khac (bp-banking-dashboard, bds-visualize, Streamlit trading monitor) chi
// CHUYEN HUONG ve day khi thieu cookie, khong tu xu ly dang nhap rieng. Nhu vay dia
// chi thanh trinh duyet luon la brospartners.com/... trong suot qua trinh dang nhap,
// khong nhay sang domain con nao khac.
//
// Cookie phien dat domain=.brospartners.com — dang nhap 1 lan o day dung duoc cho
// CA 4 dashboard tren *.brospartners.com.
//
// FAIL-CLOSED: thieu AUTH_SECRET/GOOGLE_CLIENT_ID thi chan tat ca.
"use strict";

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3003;
const ROOT = __dirname;
const COOKIE_NAME = "bp_banking_session";
const AUTH_SECRET = process.env.AUTH_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "526273088846-j356ovgic31ggf7g0qckle234h5mu74s.apps.googleusercontent.com";
const ALLOWED_DOMAIN = "brospartners.com";
const SESSION_HOURS = 12;

// ── Chong brute-force dang nhap ───────────────────────────────────────────
// Caddy reverse_proxy tu 172.18.0.1 (docker bridge) -> server nay; nhung port
// 3003 CUNG lo ra ngoai internet truc tiep (khong chi qua Caddy), nen KHONG
// duoc tin header X-Forwarded-For mu quang — chi tin no khi ket noi TCP that
// su den tu chinh Caddy (remoteAddress = trusted proxy), neu khong dung
// thang remoteAddress (khong the gia mao o tang TCP).
const TRUSTED_PROXY_IPS = new Set(["172.18.0.1", "::ffff:172.18.0.1", "127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;      // toi da 5 yeu cau dang nhap / phut / IP
const MAX_FAILS_BEFORE_LOCK = 10;   // sai qua 10 lan -> khoa VINH VIEN, can admin mo lai
const SECURITY_PATH = path.join(ROOT, "data", "auth_security.json");

function getClientIp(req) {
  const socketIp = req.socket.remoteAddress || "";
  if (TRUSTED_PROXY_IPS.has(socketIp)) {
    const xff = req.headers["x-forwarded-for"];
    if (xff) return xff.split(",")[0].trim();
  }
  return socketIp;
}

function loadSecurityDb() {
  try {
    const raw = JSON.parse(fs.readFileSync(SECURITY_PATH, "utf8"));
    return { ip: raw.ip || {}, email: raw.email || {} };
  } catch {
    return { ip: {}, email: {} };
  }
}

function saveSecurityDb(db) {
  try {
    fs.mkdirSync(path.dirname(SECURITY_PATH), { recursive: true });
    fs.writeFileSync(SECURITY_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error("Khong ghi duoc auth_security.json:", e.message);
  }
}

function isLocked(db, kind, key) {
  const rec = db[kind][key];
  return !!(rec && rec.locked);
}

function recordAuthFailure(db, kind, key) {
  if (!key) return;
  const rec = db[kind][key] || { fails: 0, locked: false };
  if (!rec.locked) {
    rec.fails += 1;
    if (rec.fails >= MAX_FAILS_BEFORE_LOCK) {
      rec.locked = true;
      rec.lockedAt = new Date().toISOString();
    }
  }
  db[kind][key] = rec;
}

function recordAuthSuccess(db, kind, key) {
  if (!key) return;
  const rec = db[kind][key];
  if (rec && !rec.locked) rec.fails = 0;   // khong reset neu da khoa — khoa la vinh vien
}

// Rate limit chi can trong bo nho (khong can song song nhieu tien trinh —
// pm2 chay che do fork, 1 instance duy nhat) — cua so truot don gian theo IP.
const rateLimitBuckets = new Map();   // ip -> [timestamps]

function isRateLimited(ip) {
  const now = Date.now();
  const arr = (rateLimitBuckets.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  arr.push(now);
  rateLimitBuckets.set(ip, arr);
  return arr.length > RATE_LIMIT_MAX;
}

const LOCKED_MSG = "Tài khoản/thiết bị này đã bị khoá do đăng nhập sai quá nhiều lần. " +
  "Liên hệ admin để được cấp lại quyền truy cập.";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function b64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s) {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(pad + "=".repeat((4 - (pad.length % 4)) % 4), "base64");
}

function signSession(session, secret) {
  const payload = b64url(Buffer.from(JSON.stringify(session), "utf8"));
  const sig = b64url(crypto.createHmac("sha256", secret).update(payload).digest());
  return `${payload}.${sig}`;
}

function verifySession(token, secret) {
  if (!token) return false;
  const dot = token.lastIndexOf(".");
  if (dot < 1) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  try {
    const expected = crypto.createHmac("sha256", secret).update(payload).digest();
    const got = b64urlDecode(sig);
    if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return false;
    const s = JSON.parse(b64urlDecode(payload).toString("utf8"));
    if (!s || !s.email || !s.exp) return false;
    return Date.now() / 1000 < s.exp;
  } catch {
    return false;
  }
}

function parseCookies(header) {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const eq = part.indexOf("=");
    if (eq < 0) return;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  });
  return out;
}

function isAllowedEmail(email, hd) {
  if (hd === ALLOWED_DOMAIN) return true;
  if (typeof email !== "string") return false;
  const suffix = "@" + ALLOWED_DOMAIN;
  const e = email.toLowerCase();
  return e.length > suffix.length && e.slice(-suffix.length) === suffix;
}

function verifyGoogleIdToken(idToken) {
  return new Promise((resolve, reject) => {
    https.get(
      "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken),
      (r) => {
        let body = "";
        r.on("data", (c) => (body += c));
        r.on("end", () => {
          if (r.statusCode !== 200) return reject(new Error("tokeninfo " + r.statusCode));
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    ).on("error", reject);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function loginPageHtml(nextUrl, error, hideButton) {
  const safeNext = nextUrl.replace(/"/g, "&quot;");
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Đăng nhập — Bros Partners</title>
<link rel="icon" href="./assets/logo.png">
<style>
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
         background:#FAFAF9; font-family:'DM Sans',system-ui,sans-serif; padding:24px; }
  .card { background:#fff; border:1px solid #E7E4E0; border-radius:18px; padding:38px 32px;
          max-width:390px; width:100%; text-align:center; box-shadow:0 8px 28px rgba(0,0,0,.06); }
  .card img { height:60px; width:auto; margin-bottom:18px; }
  h1 { font-size:18px; margin:0 0 8px; color:#0D0D0D; }
  p { font-size:13px; color:#615D59; margin:0 0 22px; }
  #btn { display:flex; justify-content:center; min-height:44px; }
  .err { font-size:13px; color:#B42318; margin-top:16px; }
</style>
</head><body>
  <div class="card">
    <img src="./assets/logo.png" alt="Bros Partners">
    ${hideButton ? "" : '<div id="btn"></div>'}
    ${error ? `<p class="err">${error}</p>` : ""}
  </div>
  ${hideButton ? "" : `<script src="https://accounts.google.com/gsi/client" async defer></script>
  <script>
    window.onload = function () {
      google.accounts.id.initialize({
        client_id: "${GOOGLE_CLIENT_ID}",
        callback: function (resp) {
          fetch("/api/auth/callback", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ credential: resp.credential, next: "${safeNext}" }),
          }).then(function (r) {
            if (r.redirected) { window.location.href = r.url; return; }
            return r.json().then(function (d) {
              window.location.href = "/login?next=${encodeURIComponent(nextUrl)}&error=" + encodeURIComponent(d.error || "Đăng nhập thất bại.");
            });
          });
        },
      });
      google.accounts.id.renderButton(document.getElementById("btn"), {
        theme: "outline", size: "large", text: "signin_with", locale: "vi",
      });
    };
  </script>`}
</body></html>`;
}

// Danh sach domain duoc phep nhung iframe — phai khop dashboards.js (embedUrl).
const FRAME_SRC = [
  "https://accounts.google.com",
  "https://brospartners.github.io",
  "https://data-nn.brospartners.com",
  "https://data-bds.brospartners.com",
  "https://data-nganhang.brospartners.com",
].join(" ");

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://accounts.google.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: https://accounts.google.com https://*.googleusercontent.com",
  `frame-src ${FRAME_SRC}`,
  "connect-src 'self' https://accounts.google.com",
  "frame-ancestors 'self'",
].join("; ");

function setSecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", CSP);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

const server = http.createServer(async (req, res) => {
  setSecurityHeaders(res);
  if (!AUTH_SECRET) {
    res.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    res.end("Máy chủ chưa cấu hình AUTH_SECRET — tạm khoá truy cập.");
    return;
  }

  const urlObj = new URL(req.url, "http://placeholder");
  const pathname = urlObj.pathname;
  const clientIp = getClientIp(req);

  // ── Trang login (khong bi chinh no chan lai) ────────────────────────────
  if (req.method === "GET" && pathname === "/login") {
    const next = urlObj.searchParams.get("next") || "/";
    let error = urlObj.searchParams.get("error") || "";
    if (isRateLimited(clientIp)) {
      res.writeHead(429, { "content-type": "text/html; charset=utf-8" });
      res.end(loginPageHtml(next, "Quá nhiều yêu cầu — thử lại sau 1 phút.", true));
      return;
    }
    const db = loadSecurityDb();
    const locked = isLocked(db, "ip", clientIp);
    if (locked) error = LOCKED_MSG;
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(loginPageHtml(next, error, locked));
    return;
  }

  // ── Nhan credential tu Google, xac minh, ky cookie phien chung ──────────
  if (req.method === "POST" && pathname === "/api/auth/callback") {
    if (isRateLimited(clientIp)) {
      res.writeHead(429, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Quá nhiều yêu cầu — thử lại sau 1 phút." }));
      return;
    }

    const db = loadSecurityDb();
    if (isLocked(db, "ip", clientIp)) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: LOCKED_MSG }));
      return;
    }

    let credential, next;
    try {
      const body = JSON.parse(await readBody(req));
      credential = body.credential;
      next = body.next || "/";
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Yêu cầu không hợp lệ." }));
      return;
    }
    if (!credential) {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Thiếu thông tin đăng nhập." }));
      return;
    }

    let info;
    try {
      info = await verifyGoogleIdToken(credential);
    } catch {
      recordAuthFailure(db, "ip", clientIp);
      saveSecurityDb(db);
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Không xác minh được tài khoản Google." }));
      return;
    }

    // Email da xac minh chu ky that su tu Google (khong phai nguoi dung tu go) —
    // dung duoc de khoa rieng theo tai khoan, khong chi theo IP/thiet bi.
    if (info.email && isLocked(db, "email", info.email)) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: LOCKED_MSG }));
      return;
    }

    const audOk = info.aud === GOOGLE_CLIENT_ID;
    const verified = info.email_verified === "true" || info.email_verified === true;
    const domainOk = isAllowedEmail(info.email, info.hd);

    if (!audOk || !verified || !domainOk) {
      recordAuthFailure(db, "ip", clientIp);
      recordAuthFailure(db, "email", info.email);
      saveSecurityDb(db);
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `Tài khoản ${info.email || ""} không thuộc @${ALLOWED_DOMAIN}.` }));
      return;
    }

    recordAuthSuccess(db, "ip", clientIp);
    recordAuthSuccess(db, "email", info.email);
    saveSecurityDb(db);

    const exp = Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600;
    const token = signSession({ email: info.email, exp }, AUTH_SECRET);

    let redirectTo = "/";
    try {
      const nu = new URL(next);
      if (nu.hostname === ALLOWED_DOMAIN || nu.hostname.endsWith("." + ALLOWED_DOMAIN)) {
        redirectTo = next;
      }
    } catch {
      redirectTo = next.startsWith("/") ? next : "/";
    }

    res.writeHead(302, {
      location: redirectTo,
      "set-cookie": `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=None; Path=/; Domain=.${ALLOWED_DOMAIN}; Max-Age=${SESSION_HOURS * 3600}`,
    });
    res.end();
    return;
  }

  // ── Tinh nang tinh (logo, css...) duoc phep xem truoc dang nhap — trang
  //    /login can hien logo, va bi chinh cong nay chan lai se vo dong anh. ──
  if (req.method === "GET" && pathname.startsWith("/assets/")) {
    const assetPath = path.normalize(path.join(ROOT, decodeURIComponent(pathname)));
    if (assetPath !== ROOT && !assetPath.startsWith(ROOT + path.sep)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    fs.readFile(assetPath, (err, data) => {
      if (err) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }
      const ext = path.extname(assetPath);
      res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
      res.end(data);
    });
    return;
  }

  // ── Moi thu con lai: bat buoc co cookie phien hop le ─────────────────────
  const cookies = parseCookies(req.headers.cookie);
  if (!verifySession(cookies[COOKIE_NAME], AUTH_SECRET)) {
    const host = req.headers.host || ALLOWED_DOMAIN;
    const currentUrl = `https://${host}${req.url}`;
    res.writeHead(302, { location: `/login?next=${encodeURIComponent(currentUrl)}` });
    res.end();
    return;
  }

  let reqPath = decodeURIComponent(pathname);
  if (reqPath === "/") reqPath = "/index.html";
  const filePath = path.normalize(path.join(ROOT, reqPath));

  // Chan path traversal — file phai nam trong ROOT.
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "content-type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Portal (auth-gated, central login) dang chay tai http://localhost:${PORT}`);
});
