(function () {
  "use strict";

  var LIST = window.BP_DASHBOARDS || [];
  var EMBED_TIMEOUT_MS = 20000;

  function renderHome() {
    var grid = document.getElementById("bpGrid");
    if (!grid) return;
    LIST.forEach(function (d) {
      var card = document.createElement("article");
      card.className = "bp-card";

      var h2 = document.createElement("h2");
      h2.textContent = d.title;

      var p = document.createElement("p");
      p.textContent = d.blurb;

      var cad = document.createElement("div");
      cad.className = "bp-cadence";
      cad.textContent = d.cadence;

      var a = document.createElement("a");
      a.className = "bp-btn";
      a.href = "./" + d.id + ".html";
      a.textContent = "Mở bảng theo dõi";

      card.appendChild(h2);
      card.appendChild(p);
      card.appendChild(cad);
      card.appendChild(a);
      grid.appendChild(card);
    });
  }

  function findDashboard(id) {
    for (var i = 0; i < LIST.length; i++) {
      if (LIST[i].id === id) return LIST[i];
    }
    return null;
  }

  function buildNav(current) {
    var nav = document.createElement("nav");
    nav.className = "bp-nav";

    var logo = document.createElement("a");
    logo.className = "bp-logo";
    logo.href = "./index.html";
    logo.title = "Về trang chủ cổng dữ liệu";
    var img = document.createElement("img");
    img.src = "./assets/logo.png";
    img.alt = "Bros Partners";
    logo.appendChild(img);

    var tabs = document.createElement("div");
    tabs.className = "bp-tabs";
    LIST.forEach(function (d) {
      var a = document.createElement("a");
      a.className = "bp-tab" + (d.id === current.id ? " is-active" : "");
      a.href = "./" + d.id + ".html";
      a.textContent = d.title;
      tabs.appendChild(a);
    });

    var spacer = document.createElement("span");
    spacer.className = "bp-spacer";

    var src = document.createElement("a");
    src.className = "bp-source";
    src.href = current.sourceUrl;
    src.target = "_blank";
    src.rel = "noopener";
    src.textContent = "↗ Mở app gốc";

    nav.appendChild(logo);
    nav.appendChild(tabs);
    nav.appendChild(spacer);
    nav.appendChild(src);
    return nav;
  }

  function mountEmbed() {
    var root = document.getElementById("bpApp");
    if (!root) return;
    var id = document.body.getAttribute("data-dashboard");
    var d = findDashboard(id);
    if (!d) {
      window.location.replace("./index.html");
      return;
    }
    document.title = d.title + " — Bros Partners";

    var wrap = document.createElement("div");
    wrap.className = "bp-frame-wrap";

    var frame = document.createElement("iframe");
    frame.src = d.embedUrl;
    frame.title = d.title;
    frame.setAttribute("allow", "fullscreen");

    var overlay = document.createElement("div");
    overlay.className = "bp-overlay";

    var spinner = document.createElement("div");
    spinner.className = "bp-spinner";

    var msg = document.createElement("div");
    msg.className = "bp-msg";
    msg.textContent = "Đang tải " + d.title + "…";

    overlay.appendChild(spinner);
    overlay.appendChild(msg);

    var settled = false;
    var timer = window.setTimeout(function () {
      if (settled) return;
      spinner.remove();
      msg.textContent =
        "Bảng theo dõi mất nhiều thời gian hơn thường lệ để khởi động. " +
        "Ứng dụng có thể đang được đánh thức sau thời gian không sử dụng — vui lòng chờ thêm hoặc mở ở tab mới.";
      var btn = document.createElement("a");
      btn.className = "bp-btn";
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
    root.appendChild(buildNav(d));
    root.appendChild(wrap);
  }

  var page = document.body.getAttribute("data-page");
  if (page === "home") {
    renderHome();
  } else if (page === "embed") {
    mountEmbed();
  }
})();
