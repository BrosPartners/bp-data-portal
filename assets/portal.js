(function () {
  "use strict";

  var LIST = window.BP_DASHBOARDS || [];
  var EMBED_TIMEOUT_MS = 20000;

  // Dashboard đánh dấu `hidden` không xuất hiện ở sidebar / trang chủ / footer,
  // nhưng trang nhúng vẫn mở được bằng URL trực tiếp (findDashboard dùng LIST đầy đủ).
  var VISIBLE = LIST.filter(function (d) { return !d.hidden; });

  var COLLAPSE_KEY = "bp_sidebar_collapsed";
  var THEME_KEY = "bp_theme";

  /* ---------- Icon: SVG nội tuyến, không phụ thuộc thư viện ngoài ---------- */
  var ICONS = {
    trending: '<path d="M22 7L13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
    landmark: '<path d="M3 21h18"/><path d="M6 18v-7M10 18v-7M14 18v-7M18 18v-7"/><path d="M12 3l9 5H3l9-5z"/>',
    mappin:   '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    research: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h5M8 17h8"/>',
    grid:     '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    panel:    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/>',
    sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon:     '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    external: '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>'
  };

  function svg(name, cls) {
    var s = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
            'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
    if (cls) s += ' class="' + cls + '"';
    return s + ">" + (ICONS[name] || ICONS.grid) + "</svg>";
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function findDashboard(id) {
    for (var i = 0; i < LIST.length; i++) if (LIST[i].id === id) return LIST[i];
    return null;
  }

  /* ---------- Sáng / tối ---------- */
  function currentTheme() {
    try { return window.localStorage.getItem(THEME_KEY) || ""; } catch (e) { return ""; }
  }
  function applyTheme(t) {
    if (t) document.documentElement.setAttribute("data-theme", t);
    else document.documentElement.removeAttribute("data-theme");
  }
  function prefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  function effectiveDark() {
    var t = currentTheme();
    return t ? t === "dark" : prefersDark();
  }
  function toggleTheme(btn) {
    var next = effectiveDark() ? "light" : "dark";
    try { window.localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
    paintThemeBtn(btn);
  }
  function paintThemeBtn(btn) {
    var dark = effectiveDark();
    btn.innerHTML = svg(dark ? "sun" : "moon");
    var label = dark ? "Chuyển sang nền sáng" : "Chuyển sang nền tối";
    btn.title = label;
    btn.setAttribute("aria-label", label);
  }
  applyTheme(currentTheme());

  /* ---------- Thu gọn sidebar ---------- */
  function collapsed() {
    try { return window.localStorage.getItem(COLLAPSE_KEY) === "1"; } catch (e) { return false; }
  }
  function applyCollapsed(v) {
    document.body.classList.toggle("bp-collapsed", !!v);
  }
  function toggleCollapsed(btn) {
    var v = !collapsed();
    try { window.localStorage.setItem(COLLAPSE_KEY, v ? "1" : "0"); } catch (e) {}
    applyCollapsed(v);
    paintCollapseBtn(btn);
  }
  function paintCollapseBtn(btn) {
    var label = collapsed() ? "Mở rộng thanh bên" : "Thu gọn thanh bên";
    btn.title = label;
    btn.setAttribute("aria-label", label);
    btn.setAttribute("aria-expanded", collapsed() ? "false" : "true");
  }

  /* ---------- Sidebar ---------- */
  function buildSidebar(currentId) {
    var aside = el("aside", "bp-sidebar");
    aside.setAttribute("aria-label", "Danh sách dashboard");

    var brand = el("a", "bp-brand");
    brand.href = "./index.html";
    brand.title = "Về trang chủ cổng dữ liệu";
    // Logo đã chứa sẵn chữ "BROS PARTNERS" nên không thêm chữ riêng bên cạnh.
    var img = el("img");
    img.src = "./assets/logo.png";
    img.alt = "Bros Partners";
    brand.appendChild(img);
    aside.appendChild(brand);

    var nav = el("nav", "bp-nav");

    // Gom theo `group`, giữ thứ tự nhóm theo lần xuất hiện đầu tiên
    var order = [], byGroup = {};
    VISIBLE.forEach(function (d) {
      var g = d.group || "Khác";
      if (!byGroup[g]) { byGroup[g] = []; order.push(g); }
      byGroup[g].push(d);
    });

    order.forEach(function (g) {
      var box = el("div", "bp-group");
      box.appendChild(el("div", "bp-group-label", g));
      byGroup[g].forEach(function (d) {
        var a = el("a", "bp-item" + (d.id === currentId ? " is-active" : ""));
        a.href = "./" + d.id + ".html";
        a.innerHTML = svg(d.icon);
        a.appendChild(el("span", "bp-item-label", d.title));
        a.title = d.title;
        if (d.id === currentId) a.setAttribute("aria-current", "page");
        box.appendChild(a);
      });
      nav.appendChild(box);
    });
    aside.appendChild(nav);

    var foot = el("div", "bp-sidebar-foot");

    var colBtn = el("button", "bp-iconbtn", svg("panel"));
    colBtn.type = "button";
    paintCollapseBtn(colBtn);
    colBtn.addEventListener("click", function () { toggleCollapsed(colBtn); });

    var themeBtn = el("button", "bp-iconbtn");
    themeBtn.type = "button";
    paintThemeBtn(themeBtn);
    themeBtn.addEventListener("click", function () { toggleTheme(themeBtn); });

    foot.appendChild(colBtn);
    foot.appendChild(themeBtn);
    var slot = el("span", "bp-spacer");
    foot.appendChild(slot);
    aside.appendChild(foot);

    return aside;
  }

  /* ---------- Thanh trên ---------- */
  function buildTopbar(title, d) {
    var bar = el("header", "bp-topbar");
    bar.appendChild(el("div", "bp-topbar-title", title));
    if (d && d.cadence) bar.appendChild(el("span", "bp-topbar-cadence", d.cadence));
    bar.appendChild(el("span", "bp-spacer"));

    if (d) {
      var src = el("a", "bp-ghostbtn", svg("external"));
      src.href = d.sourceUrl;
      src.target = "_blank";
      src.rel = "noopener";
      src.setAttribute("aria-label", "Mở app gốc ở tab mới");
      src.appendChild(el("span", null, "Mở app gốc"));
      bar.appendChild(src);
    }

    // Chỗ để auth.js gắn nút Đăng xuất
    bar.appendChild(el("span", "bp-user-slot"));
    return bar;
  }

  function buildShell(currentId, title, d) {
    var root = document.getElementById("bpApp");
    root.innerHTML = "";
    applyCollapsed(collapsed());

    var shell = el("div", "bp-shell");
    shell.appendChild(buildSidebar(currentId));

    var main = el("div", "bp-main");
    main.appendChild(buildTopbar(title, d));
    var content = el("div", "bp-content");
    main.appendChild(content);
    shell.appendChild(main);
    root.appendChild(shell);

    return { content: content, main: main };
  }

  /* ---------- Trang chủ: 2 giao diện chuyển đổi được (như dark/light mode) ---------- */
  var HOME_SKIN_KEY = "bp_home_skin";

  function homeSkin() {
    try { return window.localStorage.getItem(HOME_SKIN_KEY) || "legal"; } catch (e) { return "legal"; }
  }
  function setHomeSkin(v) {
    try { window.localStorage.setItem(HOME_SKIN_KEY, v); } catch (e) {}
  }

  function buildSkinSwitch(current) {
    var wrap = el("div", "bp-skin-switch");
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "Chọn giao diện trang chủ");
    [["classic", "Giao diện gốc"], ["legal", "Giao diện mới"]].forEach(function (opt) {
      var b = el("button", "bp-skin-opt" + (opt[0] === current ? " is-active" : ""), opt[1]);
      b.type = "button";
      if (opt[0] === current) b.setAttribute("aria-pressed", "true");
      b.addEventListener("click", function () {
        if (opt[0] === current) return;
        setHomeSkin(opt[0]);
        renderHome();
        if (window.BP_REATTACH_USER_UI) window.BP_REATTACH_USER_UI();
      });
      wrap.appendChild(b);
    });
    return wrap;
  }

  function renderHome() {
    var root = document.getElementById("bpApp");
    if (root) root.innerHTML = "";
    if (homeSkin() === "legal") renderHomeLegal();
    else renderHomeClassic();
  }

  function renderHomeClassic() {
    var parts = buildShell(null, "Cổng dữ liệu thị trường", null);
    var page = el("div", "bp-home");

    var heroRow = el("div", "bp-hero-row");
    var hero = el("div", "bp-hero");
    heroRow.appendChild(hero);
    heroRow.appendChild(buildSkinSwitch("classic"));
    page.appendChild(heroRow);

    hero.appendChild(el("h1", null, "Cổng dữ liệu thị trường"));
    hero.appendChild(el("p", null,
      "Tổng hợp các dashboard thị trường của Bros Partners: giao dịch khối ngoại, " +
      "vĩ mô — ngân hàng, và bất động sản."));

    var grid = el("div", "bp-grid");
    VISIBLE.forEach(function (d) {
      var card = el("article", "bp-card");
      card.appendChild(el("div", "bp-card-icon", svg(d.icon)));
      card.appendChild(el("h2", null, d.title));
      card.appendChild(el("p", null, d.blurb));

      var cad = el("div", "bp-card-cadence");
      cad.appendChild(el("span", "bp-dot"));
      cad.appendChild(el("span", null, "Cập nhật: " + d.cadence));
      card.appendChild(cad);

      var a = el("a", "bp-btn");
      a.href = "./" + d.id + ".html";
      a.textContent = "Mở dashboard";
      a.style.marginTop = "14px";
      a.style.alignSelf = "flex-start";
      card.appendChild(a);

      grid.appendChild(card);
    });
    page.appendChild(grid);

    var foot = el("div", "bp-foot");
    foot.appendChild(el("p", null,
      "Dữ liệu do Bros Partners tổng hợp từ nguồn công khai và khảo sát nội bộ."));
    foot.appendChild(el("p", null,
      "Các mức giá mục tiêu và dự phóng là quan điểm phân tích của Bros Partners tại thời điểm " +
      "công bố, có thể thay đổi mà không cần báo trước. Nội dung mang tính tham khảo, không phải " +
      "lời chào mua hay chào bán chứng khoán."));

    var srcLine = el("p");
    srcLine.appendChild(document.createTextNode("Nguồn: "));
    VISIBLE.forEach(function (d, i) {
      if (i > 0) srcLine.appendChild(document.createTextNode(" · "));
      var a = el("a");
      a.href = d.sourceUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = d.title;
      srcLine.appendChild(a);
    });
    foot.appendChild(srcLine);
    page.appendChild(foot);

    parts.content.appendChild(page);
  }

  /* Hoạ tiết 3 vệt chéo lấy từ logo — dùng trang trí hero, không phải ảnh stock. */
  function heroStripesSvg() {
    return (
      '<svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
      '<defs><linearGradient id="bpStripe" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0" stop-color="#F2B738" stop-opacity="0"/>' +
      '<stop offset="1" stop-color="#F2B738" stop-opacity=".55"/></linearGradient></defs>' +
      '<g stroke="url(#bpStripe)" stroke-width="10" stroke-linecap="round">' +
      '<line x1="80" y1="60" x2="230" y2="60"/>' +
      '<line x1="110" y1="95" x2="260" y2="95"/>' +
      '<line x1="140" y1="130" x2="290" y2="130"/>' +
      "</g></svg>"
    );
  }

  function renderHomeLegal() {
    var root = document.getElementById("bpApp");
    var page = el("div", "bp-legal");

    /* Thanh điều hướng trên cùng — không có sidebar, khác hẳn giao diện gốc */
    var nav = el("header", "bp-legal-nav");
    var brand = el("div", "bp-legal-brand");
    var img = el("img"); img.src = "./assets/logo.png"; img.alt = "Bros Partners";
    brand.appendChild(img);
    brand.appendChild(el("span", "bp-legal-wordmark", "BROS PARTNERS"));
    nav.appendChild(brand);

    var navRight = el("div", "bp-legal-nav-right");
    navRight.appendChild(buildSkinSwitch("legal"));
    var siteLink = el("a", "bp-legal-navlink", "Website công ty");
    siteLink.href = "http://brospartners.webstarterz.com/?lang=vi";
    navRight.appendChild(siteLink);
    navRight.appendChild(el("span", "bp-user-slot"));
    nav.appendChild(navRight);
    page.appendChild(nav);

    /* Hero full-bleed */
    var hero = el("section", "bp-legal-hero");
    hero.appendChild(el("div", "bp-legal-hero-deco", heroStripesSvg()));
    var heroInner = el("div", "bp-legal-hero-inner");
    heroInner.appendChild(el("span", "bp-legal-kicker", "CỔNG DỮ LIỆU NỘI BỘ"));
    heroInner.appendChild(el("h1", null, "Bros Partners Database"));
    heroInner.appendChild(el("p", "bp-legal-lede",
      "Tổng hợp các dashboard thị trường của Bros Partners: giao dịch khối ngoại, " +
      "vĩ mô — ngân hàng, và bất động sản — ở một nơi duy nhất."));

    var ctaRow = el("div", "bp-legal-cta-row");
    var ctaPrimary = el("a", "bp-legal-btn bp-legal-btn-primary", "Truy cập các Dashboard");
    ctaPrimary.href = "#bpLegalGrid";
    var ctaSecondary = el("a", "bp-legal-btn bp-legal-btn-ghost", "Về Bros Partners");
    ctaSecondary.href = "http://brospartners.webstarterz.com/?lang=vi";
    ctaRow.appendChild(ctaPrimary);
    ctaRow.appendChild(ctaSecondary);
    heroInner.appendChild(ctaRow);

    hero.appendChild(heroInner);
    page.appendChild(hero);

    /* Lưới thẻ dạng dịch vụ */
    var section = el("section", "bp-legal-section");
    section.id = "bpLegalGrid";
    var head = el("div", "bp-legal-section-head");
    head.appendChild(el("span", "bp-legal-kicker", "CÁC DASHBOARD"));
    head.appendChild(el("h2", null, "Dữ liệu &amp; Phân tích"));
    head.appendChild(el("p", "bp-legal-lede", "Bấm vào một dashboard để mở toàn màn hình."));
    section.appendChild(head);

    var grid = el("div", "bp-legal-grid");
    VISIBLE.forEach(function (d) {
      var card = el("article", "bp-legal-card");
      card.appendChild(el("div", "bp-legal-card-icon", svg(d.icon)));
      card.appendChild(el("h3", null, d.title));
      card.appendChild(el("p", null, d.blurb));
      var a = el("a", "bp-legal-more", "Mở dashboard →");
      a.href = "./" + d.id + ".html";
      card.appendChild(a);
      grid.appendChild(card);
    });
    section.appendChild(grid);
    page.appendChild(section);

    /* Footer — cùng nội dung với giao diện gốc, chỉ đổi kiểu chữ/màu */
    var foot = el("footer", "bp-legal-footer");
    foot.appendChild(el("p", null,
      "Dữ liệu do Bros Partners tổng hợp từ nguồn công khai và khảo sát nội bộ."));
    foot.appendChild(el("p", null,
      "Các mức giá mục tiêu và dự phóng là quan điểm phân tích của Bros Partners tại thời điểm " +
      "công bố, có thể thay đổi mà không cần báo trước. Nội dung mang tính tham khảo, không phải " +
      "lời chào mua hay chào bán chứng khoán."));
    var srcLine = el("p");
    srcLine.appendChild(document.createTextNode("Nguồn: "));
    VISIBLE.forEach(function (d, i) {
      if (i > 0) srcLine.appendChild(document.createTextNode(" · "));
      var a = el("a");
      a.href = d.sourceUrl; a.target = "_blank"; a.rel = "noopener"; a.textContent = d.title;
      srcLine.appendChild(a);
    });
    foot.appendChild(srcLine);
    page.appendChild(foot);

    root.appendChild(page);
  }

  /* ---------- Trang nhúng ---------- */
  function mountEmbed() {
    var id = document.body.getAttribute("data-dashboard");
    var d = findDashboard(id);
    if (!d) { window.location.replace("./index.html"); return; }

    document.title = d.title + " — Bros Partners";
    var parts = buildShell(d.id, d.title, d);

    if (d.note) {
      var note = el("div", "bp-note", "");
      note.textContent = d.note;
      parts.main.insertBefore(note, parts.content);
    }

    var wrap = el("div", "bp-frame-wrap");

    var frame = document.createElement("iframe");
    frame.src = d.embedUrl;
    frame.title = d.title;
    frame.setAttribute("allow", "fullscreen");

    var overlay = el("div", "bp-overlay");
    var overlayLogo = document.createElement("img");
    overlayLogo.className = "bp-overlay-logo";
    overlayLogo.src = "./assets/logo.png";
    overlayLogo.alt = "";
    var spinner = el("div", "bp-spinner");
    var msg = el("div", "bp-msg");
    msg.setAttribute("role", "status");
    msg.setAttribute("aria-live", "polite");
    msg.textContent = "Đang tải " + d.title + "…";
    overlay.appendChild(overlayLogo);
    overlay.appendChild(spinner);
    overlay.appendChild(msg);

    var settled = false;
    var timer = window.setTimeout(function () {
      if (settled) return;
      spinner.remove();
      msg.textContent =
        "Bảng theo dõi mất nhiều thời gian hơn thường lệ để khởi động. " +
        "Ứng dụng có thể đang được đánh thức sau thời gian không sử dụng — vui lòng chờ thêm hoặc mở ở tab mới.";
      var btn = el("a", "bp-btn");
      btn.href = d.sourceUrl;
      btn.target = "_blank";
      btn.rel = "noopener";
      btn.textContent = "Mở ở tab mới";
      overlay.appendChild(btn);
    }, EMBED_TIMEOUT_MS);

    frame.addEventListener("load", function () {
      settled = true;
      window.clearTimeout(timer);
      overlay.hidden = true;
    });

    wrap.appendChild(frame);
    wrap.appendChild(overlay);
    parts.content.appendChild(wrap);
  }

  // Gỡ màn hình chờ (logo + spinner) hiện sẵn trong HTML tĩnh — gọi sau khi
  // nội dung thật (trang chủ hoặc trang nhúng) đã dựng xong trong #bpApp.
  function hideBootSplash() {
    var el = document.getElementById("bpBootSplash");
    if (!el) return;
    el.classList.add("bp-boot-gone");
    window.setTimeout(function () { el.remove(); }, 300);
  }

  // portal.js không tự chạy — assets/auth.js (nạp SAU file này) gọi BP_RENDER()
  // sau khi xác nhận đăng nhập hợp lệ (hoặc ngay nếu đã có session còn hạn).
  window.BP_RENDER = function () {
    var page = document.body.getAttribute("data-page");
    if (page === "home") renderHome();
    else if (page === "embed") mountEmbed();
    hideBootSplash();
  };
})();
