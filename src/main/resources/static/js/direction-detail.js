function initDirectionDemandeDetail(event) {
  if (event && event.detail && !["detail-demande", "detail-demande-validee", "detail-demande-terminee"].includes(event.detail.page)) return;
  const content = document.getElementById("direction-detail-content");
  if (!content) return;

  const errorBox = document.getElementById("direction-detail-error");
  const requestId = window.currentPageId;
  if (!requestId) {
    content.hidden = true;
    errorBox.hidden = false;
    errorBox.textContent = "Aucune demande n’a été sélectionnée.";
    return;
  }

  const meta = document.querySelector('meta[name="context-path"]');
  let contextPath = meta ? meta.getAttribute("content") || "/" : "/";
  if (!contextPath.endsWith("/")) contextPath += "/";
  const dossier = document.body ? document.body.getAttribute("data-dossier") || "" : "";

  fetch(contextPath + dossier + "/api/besoins/" + encodeURIComponent(requestId), {
    headers: { "Accept": "application/json" }
  })
    .then(function (response) {
      if (!response.ok) throw new Error(response.status === 404 ? "Demande introuvable." : "Impossible de charger cette demande.");
      return response.json();
    })
    .then(function (demande) {
      function setValue(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value == null || value === "" ? "Non renseigné" : value;
      }
      const statut = String(demande.statut || "").replace(/_/g, " ");
      setValue("direction-detail-id", demande.id);
      setValue("direction-detail-manager", demande.manager);
      setValue("direction-detail-departement", demande.departement);
      setValue("direction-detail-statut", statut || "Non renseigné");
      setValue("direction-detail-statut-info", statut || "Non renseigné");
      setValue("direction-detail-poste", demande.poste);
      setValue("direction-detail-effectif", demande.effectif == null ? null : demande.effectif + (demande.effectif === 1 ? " personne" : " personnes"));
      setValue("direction-detail-date", demande.dateSouhaitee
        ? new Date(demande.dateSouhaitee + "T00:00:00").toLocaleDateString("fr-FR")
        : null);
      setValue("direction-detail-motif", demande.motif);
      setValue("direction-detail-competence", demande.competence);

      const decisionLink = document.querySelector('[data-page="decision"]');
      if (decisionLink) {
        decisionLink.dataset.id = requestId;
        decisionLink.href = "#page=decision&id=" + encodeURIComponent(requestId);
      }
    })
    .catch(function (error) {
      content.hidden = true;
      errorBox.hidden = false;
      errorBox.textContent = error.message;
    });
}

document.addEventListener("pageLoaded", initDirectionDemandeDetail);
