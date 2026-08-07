// Server tinh gian cho portal, thay the "npx serve" thuan tuy — them lop kiem tra
// dang nhap TRUOC khi tra file tinh. Dung CHUNG cookie phien voi bp-banking-dashboard
// (COOKIE_NAME + AUTH_SECRET giong het, cookie domain=.brospartners.com) — dang nhap
// 1 lan o trang login cua bp-banking-dashboard la dung duoc cho ca portal.
//
// FAIL-CLOSED: thieu AUTH_SECRET thi chan tat ca.
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 3003;
const ROOT = __dirname;
const COOKIE_NAME = "bp_banking_session";
const CENTRAL_LOGIN_URL = "https://data-nganhang.brospartners.com/login";
const AUTH_SECRET = process.env.AUTH_SECRET;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function b64urlDecode(s) {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(pad + "=".repeat((4 - (pad.length % 4)) % 4), "base64");
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

const server = http.createServer((req, res) => {
  if (!AUTH_SECRET) {
    res.writeHead(503, { "content-type": "text/plain; charset=utf-8" });
    res.end("Máy chủ chưa cấu hình AUTH_SECRET — tạm khoá truy cập.");
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  if (!verifySession(cookies[COOKIE_NAME], AUTH_SECRET)) {
    const host = req.headers.host || "data.brospartners.com";
    const currentUrl = `https://${host}${req.url}`;
    const loginUrl = `${CENTRAL_LOGIN_URL}?next=${encodeURIComponent(currentUrl)}`;
    res.writeHead(302, { location: loginUrl });
    res.end();
    return;
  }

  let reqPath = decodeURIComponent(req.url.split("?")[0]);
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
  console.log(`Portal (auth-gated) dang chay tai http://localhost:${PORT}`);
});
