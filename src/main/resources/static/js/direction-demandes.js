function initDemandesDirection(event) {
  if (event && event.detail && event.detail.page !== "demandes-en-attente") return;
  const tbody = document.getElementById("direction-demandes-tbody");
  if (!tbody || tbody.dataset.loaded === "1") return;
  tbody.dataset.loaded = "1";

  const count = document.getElementById("direction-demand-count");
  const countFoot = document.getElementById("direction-demand-count-foot");
  const meta = document.querySelector('meta[name="context-path"]');
  const base = (meta ? meta.getAttribute("content") || "" : "").replace(/\/$/, "");

  fetch(base + "/api/direction/besoins-a-approuver", { headers: { "Accept": "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("Chargement impossible (HTTP " + response.status + ").");
      return response.json();
    })
    .then(function (rows) {
      function escape(value) {
        return String(value == null || value === "" ? "—" : value).replace(/[&<>"']/g, function (char) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
        });
      }
      function date(value) {
        return value ? new Date(value).toLocaleDateString("fr-FR") : "—";
      }
      tbody.innerHTML = rows.length ? rows.map(function (row) {
        return '<tr>' +
          '<td class="ref">DEM-' + escape(row.id) + '</td>' +
          '<td>' + escape(row.poste) + '</td>' +
          '<td>' + escape(row.departement) + '</td>' +
          '<td>' + escape(row.manager) + '</td>' +
          '<td class="num">' + escape(row.effectif) + '</td>' +
          '<td>' + escape(date(row.dateSouhaitee)) + '</td>' +
          '<td><a href="#page=detail-demande&id=' + encodeURIComponent(row.id) + '" data-page="detail-demande" data-id="' + encodeURIComponent(row.id) + '" class="ui-btn ui-btn-outline ui-btn-sm">Consulter</a></td>' +
          '</tr>';
      }).join("") : '<tr><td colspan="7">Aucune demande n’a été transmise à la Direction.</td></tr>';
      count.textContent = rows.length + " demande(s) en attente de décision";
      countFoot.textContent = rows.length + " demande(s)";
    })
    .catch(function (error) {
      tbody.innerHTML = '<tr><td colspan="7">' + error.message + '</td></tr>';
      count.textContent = "Erreur de chargement";
    });
}

document.addEventListener("pageLoaded", initDemandesDirection);
