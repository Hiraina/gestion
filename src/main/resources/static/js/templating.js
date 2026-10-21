/* Chemin de contexte de l'application (meta context-path) et dossier de l'espace
   de travail (body[data-dossier]) : les URLs restent valides quel que soit le
   context path ou le dossier de la vue. */
function appBaseUrl() {
  var meta = document.querySelector('meta[name="context-path"]');
  var path = meta ? meta.getAttribute("content") || "/" : "/";
  if (path.charAt(path.length - 1) !== "/") path += "/";
  return path;
}

function appDossier() {
  return document.body ? document.body.getAttribute("data-dossier") || "" : "";
}

document.addEventListener("DOMContentLoaded", function () {
  var mainContent = document.getElementById("main-content");
  if (!mainContent) {
    console.error("main-content missing");
    return;
  }

  /* Évite de recharger deux fois la même page. */
  var currentKey = null;

  function loadPage(page, id) {
    if (!page) return;

    page = page.split("?")[0].split("#")[0];
    id = id || "";

    var key = page + "|" + id;
    if (key === currentKey) return;
    currentKey = key;

    window.currentPage = page;
    window.currentPageId = id;

    var url = appBaseUrl() + appDossier() + "/pages/" + page + ".html";

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error("Failed: " + res.status);
        return res.text();
      })
      .then(function (html) {
        mainContent.innerHTML = html;

        /* innerHTML n'exécute pas les scripts : on les réactive pour les pages qui en contiennent. */
        Array.prototype.forEach.call(mainContent.querySelectorAll("script"), function (oldScript) {
          if (oldScript.src) { oldScript.remove(); return; }
          var script = document.createElement("script");
          script.textContent = oldScript.textContent;
          oldScript.parentNode.replaceChild(script, oldScript);
        });
        document.dispatchEvent(
          new CustomEvent("pageLoaded", {
            detail: { page: page, id: id }
          })
        );
      })
      .catch(function (err) {
        currentKey = null;
        mainContent.innerHTML =
          "<div class='page-content'><h1>Erreur</h1><p>" +
          err.message +
          "</p></div>";
      });
  }

  /* Lit le hash : #page=xxx&id=yyy */
  function getParamsFromHash() {
    var hash = window.location.hash || "";
    var pageMatch = hash.match(/page=([^&]+)/);
    var idMatch = hash.match(/id=([^&]+)/);

    return {
      page: pageMatch ? decodeURIComponent(pageMatch[1]) : null,
      id: idMatch ? decodeURIComponent(idMatch[1]) : ""
    };
  }

  /* Charge la page demandée au démarrage. */
  var initial = getParamsFromHash();
  loadPage(initial.page || "welcome", initial.id);

  /* Délégation pour les liens de la sidebar et du contenu. */
  document.addEventListener("click", function (event) {
    var link = event.target.closest("a[data-page]");
    if (!link) return;

    event.preventDefault();

    var page = link.getAttribute("data-page");
    var id = link.getAttribute("data-id") || link.dataset.id || "";

    if (id) {
      try {
        sessionStorage.setItem("publication-offre-id", id);
      } catch (error) {}
    }

    var hash =
      "page=" + encodeURIComponent(page) +
      (id ? "&id=" + encodeURIComponent(id) : "");

    if (window.location.hash !== "#" + hash) {
      window.location.hash = hash;
    }

    loadPage(page, id);
  });

  /* Gère aussi les changements de hash faits ailleurs dans l'application. */
  window.addEventListener("hashchange", function () {
    var params = getParamsFromHash();
    if (params.page) loadPage(params.page, params.id);
  });
});