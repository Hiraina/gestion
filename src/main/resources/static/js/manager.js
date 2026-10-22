/* Gestion des brouillons et formulaire de demande Manager. */
function managerEndpoint(path) {
  const meta = document.querySelector('meta[name="context-path"]');
  let contextPath = meta ? meta.getAttribute("content") || "/" : "/";
  if (!contextPath.endsWith("/")) contextPath += "/";
  const dossier = document.body ? document.body.getAttribute("data-dossier") || "" : "";
  return contextPath + dossier + path;
}

function managerEscape(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
  });
}

function initManagerDraftList() {
  const list = document.getElementById("manager-brouillons-list");
  if (!list || list.dataset.ready === "1") return;
  list.dataset.ready = "1";

  fetch(managerEndpoint("/pages/brouillons"), { headers: { "Accept": "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("HTTP " + response.status);
      return response.json();
    })
    .then(function (drafts) {
      if (!drafts.length) {
        list.innerHTML = '<p class="ui-note">Vous n’avez aucun brouillon enregistré.</p>';
        return;
      }
      list.innerHTML = drafts.map(function (draft) {
        const data = draft.donnees || {};
        const title = data.posteTitre || (data.idPoste ? "Poste n°" + data.idPoste : "Demande de besoin");
        const created = draft.dateCreation ? new Date(draft.dateCreation).toLocaleString("fr-FR") : "";
        return '<article class="ui-card ui-request">' +
          '<div class="ui-request-head"><div><h3>' + managerEscape(title) + '</h3>' +
          '<span class="ui-ref">Brouillon n°' + managerEscape(draft.id) + (created ? ' · Enregistré le ' + managerEscape(created) : "") + '</span></div>' +
          '<span class="ui-badge is-pending">Brouillon</span></div>' +
          '<div class="ui-info">' +
          '<div><span>Manager demandeur</span><strong>' + managerEscape(data.nomManagerDemandeur || "—") + '</strong></div>' +
          '<div><span>Département</span><strong>' + managerEscape(data.departement || "—") + '</strong></div>' +
          '<div><span>Effectif</span><strong>' + managerEscape(data.effectif || "—") + '</strong></div>' +
          '<div><span>Date de la demande</span><strong>' + managerEscape(data.dateDemande || "—") + '</strong></div>' +
          '</div><p class="ui-request-note"><span>Motif</span>' + managerEscape(data.motif || "—") + '</p>' +
          '<div class="ui-actions ui-request-actions"><button type="button" class="ui-btn ui-btn-outline ui-btn-sm" data-edit-draft="' + managerEscape(draft.id) + '">Voir / modifier</button></div>' +
          '</article>';
      }).join("");

      list.addEventListener("click", function (event) {
        const button = event.target.closest("[data-edit-draft]");
        if (!button) return;
        const draft = drafts.find(function (item) { return String(item.id) === button.dataset.editDraft; });
        if (!draft) return;
        sessionStorage.setItem("manager-brouillon-a-editer", JSON.stringify(draft));
        window.location.hash = "#page=demande_besoin";
      });
    })
    .catch(function () {
      list.innerHTML = '<p class="ui-note">Impossible de charger les brouillons. Réessayez plus tard.</p>';
    });
}

function initManagerForm() {
  const form = document.getElementById("besoin-form");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const submitBtn = document.getElementById("submit-btn");
  const draftBtn = document.getElementById("draft-btn");
  const resetBtn = document.getElementById("reset-btn");
  const feedback = document.getElementById("besoin-feedback");

  if (!form || !nextBtn || !prevBtn || form.dataset.ready === "1") return;
  form.dataset.ready = "1";

  try {
    const savedDraft = sessionStorage.getItem("manager-brouillon-a-editer");
    if (savedDraft) {
      const draft = JSON.parse(savedDraft);
      const values = draft.donnees || {};
      Object.keys(values).forEach(function (name) {
        const field = form.elements.namedItem(name);
        if (field && typeof values[name] !== "object") field.value = values[name] == null ? "" : values[name];
      });
      form.dataset.draftId = draft.id;
      sessionStorage.removeItem("manager-brouillon-a-editer");
    }
  } catch (error) {
    sessionStorage.removeItem("manager-brouillon-a-editer");
  }

  const totalSteps = 3;
  let currentStep = 1;

  function say(message, ok) {
    if (!feedback) return;
    feedback.hidden = !message;
    feedback.textContent = message || "";
    feedback.style.background = ok ? "var(--success-bg)" : "var(--orange-50)";
    feedback.style.borderLeftColor = ok ? "var(--success)" : "var(--orange)";
    feedback.style.color = ok ? "var(--success)" : "#5c3d00";
  }

  function updateSteps() {
    for (let i = 1; i <= totalSteps; i++) {
      const step = document.getElementById("step-" + i);
      if (step) step.classList.toggle("active", i === currentStep);
      const dot = form.querySelector('[data-step-dot="' + i + '"]');
      if (dot) {
        dot.classList.toggle("is-active", i === currentStep);
        dot.classList.toggle("is-done", i < currentStep);
      }
    }
    prevBtn.classList.toggle("hidden", currentStep === 1);
    nextBtn.classList.toggle("hidden", currentStep === totalSteps);
    [submitBtn, draftBtn, resetBtn].forEach(function (btn) {
      if (btn) btn.classList.toggle("hidden", currentStep !== totalSteps);
    });
  }

  function currentStepIsValid() {
    const step = document.getElementById("step-" + currentStep);
    const fields = step ? step.querySelectorAll("input, select, textarea") : [];
    for (let i = 0; i < fields.length; i++) {
      if (!fields[i].checkValidity()) {
        fields[i].reportValidity();
        return false;
      }
    }
    return true;
  }

  prevBtn.addEventListener("click", function () {
    if (currentStep > 1) { currentStep--; say(""); updateSteps(); }
  });

  nextBtn.addEventListener("click", function () {
    if (currentStep < totalSteps && currentStepIsValid()) { currentStep++; say(""); updateSteps(); }
  });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const action = event.submitter ? event.submitter.value : "soumettre";
    const fields = Object.fromEntries(new FormData(form).entries());
    const posteField = form.elements.namedItem("idPoste");
    if (posteField && posteField.selectedIndex >= 0) {
      fields.posteTitre = posteField.options[posteField.selectedIndex].text;
    }
    const isDraft = action === "brouillon";
    const draftId = form.dataset.draftId;
    const url = isDraft
      ? managerEndpoint("/pages/brouillons")
      : managerEndpoint("/pages/demande_besoin/soumettre") + (draftId ? "?brouillonId=" + encodeURIComponent(draftId) : "");

    fetch(url, {
      method: "POST",
      headers: { "Content-Type": isDraft ? "application/json" : "application/x-www-form-urlencoded;charset=UTF-8" },
      body: isDraft
        ? JSON.stringify({ id: draftId ? Number(draftId) : null, donnees: fields })
        : new URLSearchParams(fields)
    })
    .then(function (response) {
      return response.text().then(function (body) {
        let data = {};
        try {
          data = body ? JSON.parse(body) : {};
        } catch (error) {
          data = {};
        }
        if (response.ok && data.success) {
          say(data.message || "Votre demande a été soumise.", true);
          if (isDraft) form.dataset.draftId = data.id;
          else delete form.dataset.draftId;
        } else {
          const serverMessage = data.message || data.detail || data.error;
          const responseText = body
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 300);
          say(serverMessage || responseText || "Le serveur a refusé la demande (" + response.status + "). Vérifiez les champs et réessayez.", false);
        }
      });
    })
    .catch(function () {
      say("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.", false);
    });
  });

  form.addEventListener("reset", function () {
    currentStep = 1;
    say("");
    updateSteps();
  });

  updateSteps();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initManagerForm);
} else {
  initManagerForm();
}

document.addEventListener("pageLoaded", initManagerForm);
document.addEventListener("pageLoaded", initManagerDraftList);
