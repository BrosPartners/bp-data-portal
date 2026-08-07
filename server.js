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

function loginPageHtml(nextUrl, error) {
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
    <h1>Cổng dữ liệu Bros Partners</h1>
    <p>Nội dung nội bộ. Đăng nhập bằng email công ty (@${ALLOWED_DOMAIN}) để tiếp tục.</p>
    <div id="btn"></div>
    ${error ? `<p class="err">${error}</p>` : ""}
  </div>
  <script src="https://accounts.google.com/gsi/client" async defer></script>
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
  </script>
</body></html>`;
}

const server = http.createServer(async (req, res) => {
  if (!AUTH_SECRET) {
    res.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    res.end("Máy chủ chưa cấu hình AUTH_SECRET — tạm khoá truy cập.");
    return;
  }

  const urlObj = new URL(req.url, "http://placeholder");
  const pathname = urlObj.pathname;

  // ── Trang login (khong bi chinh no chan lai) ────────────────────────────
  if (req.method === "GET" && pathname === "/login") {
    const next = urlObj.searchParams.get("next") || "/";
    const error = urlObj.searchParams.get("error") || "";
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(loginPageHtml(next, error));
    return;
  }

  // ── Nhan credential tu Google, xac minh, ky cookie phien chung ──────────
  if (req.method === "POST" && pathname === "/api/auth/callback") {
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
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "Không xác minh được tài khoản Google." }));
      return;
    }

    const audOk = info.aud === GOOGLE_CLIENT_ID;
    const verified = info.email_verified === "true" || info.email_verified === true;
    const domainOk = isAllowedEmail(info.email, info.hd);

    if (!audOk || !verified || !domainOk) {
      res.writeHead(403, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: `Tài khoản ${info.email || ""} không thuộc @${ALLOWED_DOMAIN}.` }));
      return;
    }

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
  if (!filePath.startsWith(ROOT)) {
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
