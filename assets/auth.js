(function () {
  "use strict";

  // ĐANG LÀ GIÁ TRỊ GIẢ ĐỂ TEST — thay bằng Client ID thật lấy từ
  // console.cloud.google.com (APIs & Services → Credentials) rồi mới coi là live.
  // Client ID KHÔNG phải bí mật, an toàn để để thẳng trong code công khai.
  var GOOGLE_CLIENT_ID = "REPLACE_WITH_REAL_CLIENT_ID.apps.googleusercontent.com";
  var ALLOWED_DOMAIN = "brospartners.com";
  var SESSION_KEY = "bp_auth_v1";

  function isLocalhost() {
    return location.hostname === "localhost" || location.hostname === "127.0.0.1";
  }

  function readSession() {
    try {
      var raw = window.sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      var s = JSON.parse(raw);
      if (!s || !s.email || !s.exp) return null;
      if (Date.now() / 1000 >= s.exp) return null;
      return s;
    } catch (e) {
      return null;
    }
  }

  function writeSession(email, exp) {
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email: email, exp: exp }));
    } catch (e) {}
  }

  function clearSession() {
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function isAllowedEmail(email, hd) {
    if (hd === ALLOWED_DOMAIN) return true;
    return typeof email === "string" && email.toLowerCase().indexOf("@" + ALLOWED_DOMAIN) ===
      email.length - (ALLOWED_DOMAIN.length + 1);
  }

  function buildGate() {
    var overlay = document.createElement("div");
    overlay.id = "bp-auth-gate";
    overlay.className = "bp-auth-gate";

    var card = document.createElement("div");
    card.className = "bp-auth-card";

    var img = document.createElement("img");
    img.src = "./assets/logo.png";
    img.alt = "";
    img.className = "bp-auth-logo";

    var h1 = document.createElement("h1");
    h1.textContent = "Cổng dữ liệu Bros Partners";

    var p = document.createElement("p");
    p.className = "bp-auth-sub";
    p.textContent = "Đăng nhập bằng email công ty (@" + ALLOWED_DOMAIN + ") để tiếp tục.";

    var btnHost = document.createElement("div");
    btnHost.id = "bp-google-btn";
    btnHost.className = "bp-auth-btn-host";

    var msg = document.createElement("div");
    msg.id = "bp-auth-msg";
    msg.className = "bp-auth-msg";
    msg.setAttribute("role", "status");
    msg.setAttribute("aria-live", "polite");

    card.appendChild(img);
    card.appendChild(h1);
    card.appendChild(p);
    card.appendChild(btnHost);
    card.appendChild(msg);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    return { overlay: overlay, msg: msg, btnHost: btnHost };
  }

  function showRejected(gate, email) {
    gate.msg.className = "bp-auth-msg bp-auth-msg-error";
    gate.msg.textContent =
      "Email " + email + " không thuộc @" + ALLOWED_DOMAIN + " — không có quyền truy cập. " +
      "Đăng nhập lại bằng email công ty.";
    clearSession();
  }

  function grantAccess(email, exp) {
    writeSession(email, exp);
    var gate = document.getElementById("bp-auth-gate");
    if (gate) gate.remove();
    window.BP_RENDER();
    addSignOut(email);
  }

  function addSignOut(email) {
    if (document.getElementById("bp-signout")) return;
    var target = document.querySelector(".bp-home-header-inner") || document.querySelector(".bp-nav");
    if (!target) return;
    var wrap = document.createElement("span");
    wrap.id = "bp-signout";
    wrap.className = "bp-signout";
    wrap.title = email;
    var a = document.createElement("a");
    a.href = "#";
    a.textContent = "Đăng xuất";
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      clearSession();
      window.location.reload();
    });
    wrap.appendChild(a);
    target.appendChild(wrap);
  }

  function verifyToken(idToken, onDone) {
    fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken))
      .then(function (res) {
        if (!res.ok) throw new Error("tokeninfo " + res.status);
        return res.json();
      })
      .then(function (info) {
        var okAud = info.aud === GOOGLE_CLIENT_ID;
        var okVerified = info.email_verified === "true" || info.email_verified === true;
        var okDomain = isAllowedEmail(info.email, info.hd);
        onDone({
          ok: okAud && okVerified && okDomain,
          email: info.email,
          exp: parseInt(info.exp, 10)
        });
      })
      .catch(function () {
        onDone({ ok: false, email: "(không xác minh được)", exp: 0 });
      });
  }

  function handleCredentialResponse(resp) {
    var gate = { msg: document.getElementById("bp-auth-msg") };
    verifyToken(resp.credential, function (result) {
      if (result.ok) {
        grantAccess(result.email, result.exp);
      } else {
        showRejected({ msg: gate.msg }, result.email);
      }
    });
  }

  function renderGoogleButton(btnHost) {
    var s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = function () {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse
      });
      window.google.accounts.id.renderButton(btnHost, {
        theme: "outline",
        size: "large",
        text: "signin_with",
        locale: "vi"
      });
    };
    document.head.appendChild(s);
  }

  // Chỉ hoạt động trên localhost, để kiểm thử luồng chấp nhận/từ chối domain
  // KHÔNG cần mật khẩu thật. Không có tác dụng gì trên domain production.
  function debugLogin(gate) {
    var m = /[?&]authdebug=([^&]+)/.exec(location.search);
    if (!m || !isLocalhost()) return false;
    var email = decodeURIComponent(m[1]);
    var hd = email.split("@")[1];
    var okDomain = isAllowedEmail(email, hd);
    window.setTimeout(function () {
      if (okDomain) {
        grantAccess(email, Date.now() / 1000 + 3600);
      } else {
        showRejected(gate, email);
      }
    }, 300);
    return true;
  }

  function init() {
    var cached = readSession();
    if (cached) {
      window.BP_RENDER();
      addSignOut(cached.email);
      return;
    }

    var gate = buildGate();
    if (debugLogin(gate)) return;
    renderGoogleButton(gate.btnHost);
  }

  init();
})();
