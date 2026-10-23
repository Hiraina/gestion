(function () {
  "use strict";
  document.addEventListener("pageLoaded", function (event) {
    if (!event || !event.detail || event.detail.page !== "contrats-travail") return;
    var tbody = document.getElementById("ctCandidateTable");
    if (!tbody) return;
    var ctx = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
    fetch(ctx + "/api/contrats", { headers: { Accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        tbody.innerHTML = "";
        data.forEach(function (c) {
          var tr = document.createElement("tr");
          tr.innerHTML = "<td>" + (c.idProposition || "") + "</td>" +
            "<td>" + (c.idTypeContrat || "") + "</td>" +
            "<td>" + (c.salaireMensuel || "") + "</td>" +
            "<td>" + (c.dateDebut || "") + "</td>" +
            "<td>" + (c.dateFin || "") + "</td>";
          tbody.appendChild(tr);
        });
      })
      .catch(function () { tbody.innerHTML = "<tr><td colspan='5'>Impossible de charger les contrats.</td></tr>"; });
  });
})();
