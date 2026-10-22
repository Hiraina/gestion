function initBesoinDetail(event) {
  if (event && event.detail && event.detail.page !== "detail-demande") return;
  const content = document.getElementById("besoin-detail-content");
  if (!content) return;

  const errorBox = document.getElementById("besoin-detail-error");
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
      setValue("besoin-detail-id", demande.id);
      setValue("besoin-detail-manager", demande.manager);
      setValue("besoin-detail-departement", demande.departement);
      setValue("besoin-detail-statut", statut || "Non renseigné");
      setValue("besoin-detail-statut-info", statut || "Non renseigné");
      setValue("besoin-detail-poste", demande.poste);
      setValue("besoin-detail-effectif", demande.effectif == null ? null : demande.effectif + (demande.effectif === 1 ? " personne" : " personnes"));
      setValue("besoin-detail-date", demande.dateSouhaitee
        ? new Date(demande.dateSouhaitee + "T00:00:00").toLocaleDateString("fr-FR")
        : null);
      setValue("besoin-detail-motif", demande.motif);
      setValue("besoin-detail-competence", demande.competence);

      const transmitButton = document.getElementById("besoin-transmettre-finance");
      const directionButton = document.getElementById("besoin-transmettre-direction");
      const feedback = document.getElementById("besoin-transmission-feedback");
      if (transmitButton) {
        if (statut === "validee finance" || statut === "transmis direction") {
          transmitButton.hidden = true;
          if (directionButton) {
            directionButton.hidden = false;
            directionButton.disabled = statut === "transmis direction";
            if (statut === "transmis direction") directionButton.textContent = "Déjà transmis à la Direction";
          }
        } else {
          transmitButton.hidden = false;
          if (directionButton) directionButton.hidden = true;
          transmitButton.disabled = statut !== "en attente";
          if (statut === "transmis finance") transmitButton.textContent = "Déjà transmise à la Finance";
          transmitButton.addEventListener("click", function () {
            transmitButton.disabled = true;
            fetch(contextPath + dossier + "/api/besoins/" + encodeURIComponent(requestId) + "/transmettre", { method: "POST", headers: { "Accept": "application/json" } })
              .then(function (response) {
                return response.json().then(function (payload) {
                  if (!response.ok) throw new Error(payload.message || "La transmission a échoué.");
                  return payload;
                });
              })
              .then(function (payload) {
                feedback.hidden = false;
                feedback.textContent = payload.message;
                transmitButton.textContent = "Transmise à la Finance";
                setValue("besoin-detail-statut", "transmis finance");
                setValue("besoin-detail-statut-info", "transmis finance");
              })
              .catch(function (error) {
                feedback.hidden = false;
                feedback.textContent = error.message;
                transmitButton.disabled = false;
              });
          });
        }
      }
      if (directionButton && statut === "validee finance") {
        directionButton.addEventListener("click", function () {
          directionButton.disabled = true;
          fetch(contextPath + dossier + "/api/besoins/" + encodeURIComponent(requestId) + "/transmettre-direction", {
            method: "POST",
            headers: { "Accept": "application/json" }
          })
            .then(function (response) {
              return response.json().then(function (payload) {
                if (!response.ok) throw new Error(payload.message || "La transmission a échoué.");
                return payload;
              });
            })
            .then(function (payload) {
              feedback.hidden = false;
              feedback.textContent = payload.message;
              directionButton.textContent = "Déjà transmis à la Direction";
              setValue("besoin-detail-statut", "transmis direction");
              setValue("besoin-detail-statut-info", "transmis direction");
            })
            .catch(function (error) {
              feedback.hidden = false;
              feedback.textContent = error.message;
              directionButton.disabled = false;
            });
        });
      }
    })
    .catch(function (error) {
      content.hidden = true;
      errorBox.hidden = false;
      errorBox.textContent = error.message;
    });
}

document.addEventListener("pageLoaded", initBesoinDetail);
