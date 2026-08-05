(function () {
  "use strict";

  var LIST = window.BP_DASHBOARDS || [];

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

  if (document.body.getAttribute("data-page") === "home") {
    renderHome();
  }
})();
