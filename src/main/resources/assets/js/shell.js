/* Coque de l'application : menu mobile, lien actif, titre de la barre supérieure. */
(function () {
  "use strict";

  var body = document.body;
  var toggle = document.getElementById("menu-toggle");
  var scrim = document.getElementById("scrim");
  var titleEl = document.getElementById("topbar-title");
  var links = Array.prototype.slice.call(document.querySelectorAll(".nav a[data-page]"));

  function setMenu(open) {
    body.classList.toggle("nav-open", open);
    if (toggle) toggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  if (toggle) toggle.addEventListener("click", function () { setMenu(!body.classList.contains("nav-open")); });
  if (scrim) scrim.addEventListener("click", function () { setMenu(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
  links.forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });

  function currentPage() {
    var m = (window.location.hash || "").match(/page=([^&]+)/);
    return m ? decodeURIComponent(m[1]) : "welcome";
  }

  function syncActive() {
    var page = currentPage();
    var active = null;

    links.forEach(function (a) {
      var kids = (a.getAttribute("data-children") || "").split(",");
      var match = a.getAttribute("data-page") === page || kids.indexOf(page) !== -1;
      a.classList.toggle("is-active", match);
      if (match) {
        a.setAttribute("aria-current", "page");
        if (!active) active = a;
      } else {
        a.removeAttribute("aria-current");
      }
    });

    if (titleEl) titleEl.textContent = active ? active.getAttribute("data-label") : "Tableau de bord";
    window.scrollTo(0, 0);
  }

  window.addEventListener("hashchange", syncActive);
  document.addEventListener("pageLoaded", syncActive);
  syncActive();
})();

/* Notifications légères : tout élément portant data-toast affiche un message. */
(function () {
  "use strict";
  var timer;
  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-toast]");
    if (!el) return;
    e.preventDefault();
    var toast = document.getElementById("app-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "app-toast";
      toast.className = "app-toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = el.getAttribute("data-toast");
    toast.classList.add("is-visible");
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove("is-visible"); }, 2800);
  });
})();

/* Filtres de tableaux : recherche, listes déroulantes et date, appliqués côté client. */
(function () {
  "use strict";

  function frDate(value) {
    var p = value.split("-");
    return p.length === 3 ? p[2] + "/" + p[1] + "/" + p[0] : value;
  }

  function apply(bar) {
    var card = bar.closest(".ui-card");
    if (!card) return;
    var rows = card.querySelectorAll("tbody tr");
    var query = "";
    var search = bar.querySelector("input[type='search'], input[type='text']");
    if (search) query = search.value.trim().toLowerCase();
    var terms = [];
    bar.querySelectorAll("select").forEach(function (s) { if (s.value) terms.push(s.value.toLowerCase()); });
    var date = bar.querySelector("input[type='date']");
    if (date && date.value) terms.push(frDate(date.value));

    var visible = 0;
    rows.forEach(function (row) {
      var text = row.textContent.toLowerCase();
      var ok = (!query || text.indexOf(query) !== -1) && terms.every(function (t) { return text.indexOf(t) !== -1; });
      row.hidden = !ok;
      if (ok) visible++;
    });

    var empty = card.querySelector(".ui-empty-row");
    if (!visible) {
      if (!empty) {
        empty = document.createElement("p");
        empty.className = "ui-empty-row";
        empty.textContent = "Aucun résultat ne correspond à votre recherche.";
        var wrap = card.querySelector(".ui-table-wrap");
        if (wrap) wrap.insertAdjacentElement("afterend", empty);
      }
    } else if (empty) {
      empty.remove();
    }
  }

  document.addEventListener("input", function (e) {
    var bar = e.target.closest("[data-filter-table]");
    if (bar) apply(bar);
  });
  document.addEventListener("change", function (e) {
    var bar = e.target.closest("[data-filter-table]");
    if (bar) apply(bar);
  });
})();
