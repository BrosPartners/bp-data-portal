#!/usr/bin/env node
// Cong cu admin: xem / mo khoa cac IP hoac email bi khoa vinh vien sau khi
// dang nhap sai qua 10 lan (xem server.js — MAX_FAILS_BEFORE_LOCK).
//
//   node scripts/unlock_auth.js --list                 xem danh sach dang bi khoa
//   node scripts/unlock_auth.js user@brospartners.com   mo khoa 1 email
//   node scripts/unlock_auth.js 1.2.3.4                 mo khoa 1 IP
//
// Chay truc tiep tren VPS (cung thu muc voi server.js va data/auth_security.json).
"use strict";

const fs = require("fs");
const path = require("path");

const SECURITY_PATH = path.join(__dirname, "..", "data", "auth_security.json");

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(SECURITY_PATH, "utf8"));
    return { ip: raw.ip || {}, email: raw.email || {} };
  } catch {
    return { ip: {}, email: {} };
  }
}

function save(db) {
  fs.writeFileSync(SECURITY_PATH, JSON.stringify(db, null, 2));
}

function main() {
  const arg = process.argv[2];
  const db = load();

  if (!arg || arg === "--list") {
    let any = false;
    for (const kind of ["ip", "email"]) {
      for (const [key, rec] of Object.entries(db[kind])) {
        if (rec.locked) {
          any = true;
          console.log(`[${kind}] ${key} — khoá lúc ${rec.lockedAt} (${rec.fails} lần sai)`);
        }
      }
    }
    if (!any) console.log("Không có IP/email nào đang bị khoá.");
    return;
  }

  let found = false;
  for (const kind of ["ip", "email"]) {
    if (db[kind][arg]) {
      db[kind][arg] = { fails: 0, locked: false };
      found = true;
    }
  }
  if (found) {
    save(db);
    console.log(`Đã mở khoá cho "${arg}".`);
  } else {
    console.log(`Không tìm thấy "${arg}" trong danh sách theo dõi/khoá.`);
  }
}

main();
