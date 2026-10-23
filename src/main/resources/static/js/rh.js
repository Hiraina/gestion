/* =========================================
   RH - Espace de travail commun
   =========================================
   Ce fichier pilote les pages RH suivantes :
   - Responsable-RH/pages/publication-offre.html
   - Responsable-RH/pages/brouillons-offre.html

   Les données des brouillons sont enregistrées dans le navigateur.
   ========================================= */

/* Remonte dans la console F12 les erreurs globales et les promesses rejetées.
   Le navigateur fournit le fichier, la ligne et la pile d'appel. */
(function installRhDiagnostics() {
  if (window.__rhDiagnosticsInstalled) return;
  window.__rhDiagnosticsInstalled = true;

  window.addEventListener("error", function (event) {
    console.error("[RH] Erreur JavaScript", {
      message: event.message,
      fichier: event.filename,
      ligne: event.lineno,
      colonne: event.colno,
      pile: event.error && event.error.stack
    });
  });

  window.addEventListener("unhandledrejection", function (event) {
    var reason = event.reason;
    console.error("[RH] Promesse rejetée sans gestionnaire", {
      raison: reason,
      pile: reason && reason.stack
    });
  });
})();

/* Liste des brouillons partagée entre les deux pages.
   Elle est stockée dans le navigateur (localStorage). */
var RHDrafts = (function () {
  "use strict";

  var STORAGE_KEY = "rh-brouillons-demo";

  function all() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);

      if (saved !== null) {
        var drafts = JSON.parse(saved);
        if (!Array.isArray(drafts)) return [];
        var demoIds = ["DEM-001", "DEM-004", "DEM-006", "DEM-009", "DEM-010"];
        var cleanDrafts = drafts.filter(function (draft) { return draft && demoIds.indexOf(draft.id) === -1; });
        return cleanDrafts.map(function (draft) {
          return Object.assign({ title: "Titre à définir", department: "À définir", contract: "À préciser", author: "Responsable RH", status: "Brouillon", data: {}, request: null, requestId: null }, draft || {});
        });
      }
    } catch (error) {
      console.warn("Impossible de charger les brouillons.");
    }

    return [];
  }

  function save(drafts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch (error) {
      console.warn("Impossible d'enregistrer les brouillons.");
    }
  }

  function get(reference) {
    var found = null;

    all().forEach(function (draft) {
      if (draft.id === reference) found = draft;
    });

    return found;
  }

  /* Ajoute le brouillon s'il est nouveau, sinon met à jour ses informations. */
  function upsert(draft) {
    var drafts = all();
    var updated = false;

    drafts.forEach(function (item) {
      if (item.id !== draft.id) return;

      item.title = draft.title || "Titre à définir";
      item.department = draft.department || "À définir";
      item.contract = draft.contract || "À préciser";
      item.modified = draft.modified || item.modified;
      item.data = draft.data || item.data || {};
      item.request = draft.request || item.request || null;
      item.requestId = draft.requestId || item.requestId || null;

      updated = true;
    });

    if (!updated) {
      drafts.push({
        id: draft.id,
        title: draft.title || "Titre à définir",
        department: draft.department || "À définir",
        contract: draft.contract || "À préciser",
        modified: draft.modified,
        author: draft.author || "Responsable RH",
        status: "Brouillon",
        data: draft.data || {},
        request: draft.request || null,
        requestId: draft.requestId || null
      });
    }

    save(drafts);

    return drafts;
  }

  function remove(reference) {
    var drafts = all().filter(function (draft) {
      return draft.id !== reference;
    });

    save(drafts);

    try {
      localStorage.removeItem("offre-brouillon-" + reference);
    } catch (error) {
      console.warn("Impossible de supprimer le contenu du brouillon.");
    }

    return drafts;
  }

  return {
    all: all,
    save: save,
    get: get,
    upsert: upsert,
    remove: remove
  };
})();

/* =========================================
   RH - Préparation et publication d'une offre
   ========================================= */

(function () {
  "use strict";

  var publicationRequests = {};

  /* ------------------------------------------------------------
     Utilitaires
     ------------------------------------------------------------ */

  function byId(id) {
    return document.getElementById(id);
  }

  function setText(id, value) {
    var element = byId(id);
    if (element) element.textContent = value;
  }

  function setValue(id, value) {
    var element = byId(id);
    if (element) element.value = value;
  }

  /* Récupère l'identifiant du brouillon ou du besoin transmis par la liste. */
  function resolveReference(event) {
    var id = "";

    if (event && event.detail && event.detail.id) {
      id = event.detail.id;
    }

    if (!id && typeof window.currentPageId === "string") {
      id = window.currentPageId;
    }

    if (!id) {
      var match = (window.location.hash || "").match(/id=([^&]+)/);
      if (match) id = decodeURIComponent(match[1]);
    }

    return id || "nouveau";
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      var entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
  }

  function linesToHTML(value) {
    return String(value || "")
      .split("\n")
      .map(function (line) {
        return line.trim();
      })
      .filter(Boolean)
      .map(function (line) {
        return "<li>" + escapeHTML(line) + "</li>";
      })
      .join("");
  }

  /* ------------------------------------------------------------
     Préremplissage à partir de la demande validée
     ------------------------------------------------------------ */

  function ensureSelectOption(selectId, value) {
    if (!value) return;

    var select = byId(selectId);

    if (!select) return;

    var options = select.options || [];
    var exists = Array.prototype.some.call(options, function (option) {
      return option.value === value;
    });

    if (!exists) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }

    select.value = value;
  }

  function fillRequestInformation(request) {
    var standalone = Boolean(request.standalone);
    setText("requestReference", standalone ? "Brouillon libre" : "Demande " + request.reference);
    setText("infoReference", standalone ? "Non associée" : request.reference);
    setText("infoManager", request.manager || "Non renseigné");
    setText("infoDepartment", request.department || "À définir");
    setText(
      "infoPositions",
      request.positions ? request.positions + (request.positions > 1 ? " postes" : " poste") : "À définir"
    );
    setText("infoStartDate", request.startDate || "À définir");
    setText("infoReason", request.reason || "Aucun motif renseigné.");

    setValue("jobTitle", request.jobTitle || "");
    setValue("skills", request.skills || request.competence || "");
    var salaryEstimate = Number(request.salaryMonthlyEstimate || 0);
    setValue("salaryMonthlyEstimate", salaryEstimate > 0 ? String(salaryEstimate) : "");
    var salaryEstimateDisplay = byId("salaryEstimateDisplay");
    if (salaryEstimateDisplay) {
      salaryEstimateDisplay.textContent = salaryEstimate > 0
        ? new Intl.NumberFormat("fr-FR").format(salaryEstimate) + " Ar / mois / personne"
        : "Aucune estimation financière associée";
    }
    var approximateOption = document.querySelector('#salaryDisplay option[value="Salaire approximatif"]');
    if (approximateOption) approximateOption.disabled = salaryEstimate <= 0;
    /* La valeur par défaut vient du champ HTML. Ne pas appeler valueOf ici :
       cette aide n'existe que dans generatePreview(). */
    setValue("positions", request.positions || (standalone ? "" : 1));
    setValue("startDate", request.startDate || "");

    if (standalone) {
      var approvalBanner = document.querySelector(".approval-banner");
      var steps = document.querySelector(".steps");
      if (approvalBanner) approvalBanner.style.display = "none";
      if (steps) steps.style.display = "none";
      var positionInput = byId("positions");
      if (positionInput) positionInput.readOnly = false;
      var positionHelp = positionInput && positionInput.parentNode.querySelector(".field-help");
      if (positionHelp) positionHelp.textContent = "Renseignez le nombre de postes souhaités.";
    }

    /* Si une valeur issue de la demande n'existe pas dans la liste,
       on l'ajoute pour éviter de perdre l'information. */
    ensureSelectOption("department", request.department);
  }

  function clearOfferForm(form) {
    Array.prototype.forEach.call(form.elements, function (element) {
      if (!element.name) return;
      if (element.type === "checkbox" || element.type === "radio") {
        element.checked = false;
      } else if (element.tagName === "SELECT") {
        var emptyOption = Array.prototype.find.call(element.options, function (option) { return option.value === ""; });
        if (!emptyOption) {
          emptyOption = document.createElement("option");
          emptyOption.value = "";
          emptyOption.textContent = "À choisir";
          element.insertBefore(emptyOption, element.firstChild);
        }
        element.value = "";
      } else {
        element.value = "";
      }
    });
  }

  function createBlankRequest() {
    var suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    return {
      reference: "BROUILLON-" + suffix,
      requestId: null,
      standalone: true,
      approvalDate: "Non associée",
      manager: "",
      department: "",
      positions: "",
      needType: "",
      contract: "",
      startDate: "",
      education: "",
      reason: "",
      jobTitle: ""
    };
  }

  /* ------------------------------------------------------------
     Résumé latéral
     ------------------------------------------------------------ */

  function updateSummary() {
    var title = byId("jobTitle");
    var department = byId("department");
    var positions = byId("positions");

    if (title) {
      setText("summaryTitle", title.value || "Non renseigné");
    }

    if (department) {
      setText("summaryDepartment", department.value || "Non renseigné");
    }

    if (positions) {
      var count = Number(positions.value);
      setText(
        "summaryPositions",
        positions.value + (count > 1 ? " postes" : " poste")
      );
    }
  }

  /* ------------------------------------------------------------
     Rémunération
     ------------------------------------------------------------ */

  function updateSalaryFields() {
    var salaryDisplay = byId("salaryDisplay");

    if (!salaryDisplay) return;
    if (!["Salaire approximatif", "À négocier"].includes(salaryDisplay.value)) {
      salaryDisplay.value = "À négocier";
    }

    var estimate = Number((byId("salaryMonthlyEstimate") || {}).value || 0);
    if (salaryDisplay.value === "Salaire approximatif" && estimate <= 0) {
      salaryDisplay.value = "À négocier";
      showNotification("Aucune estimation Finance n'est associée à cette demande. Le salaire reste à négocier.", "error");
    }
  }

  function getSalaryText() {
    var salaryDisplay = byId("salaryDisplay");

    if (!salaryDisplay) return "";

    var mode = salaryDisplay.value;

    if (mode === "À négocier") {
      return "Rémunération à négocier selon le profil.";
    }

    var estimate = Number((byId("salaryMonthlyEstimate") || {}).value || 0);
    if (mode !== "Salaire approximatif" || estimate <= 0) return "Estimation salariale indisponible.";
    return new Intl.NumberFormat("fr-FR").format(estimate) + " Ar par mois et par personne (estimation Finance).";
  }

  /* ------------------------------------------------------------
     Aperçu de l'offre
     ------------------------------------------------------------ */

  function generatePreview() {
    var content = byId("jobPreviewContent");
    var modal = byId("previewModal");

    if (!content || !modal) return;

    function valueOf(id) {
      var element = byId(id);
      return element ? element.value : "";
    }

    var jobTitle = valueOf("jobTitle");
    var company = valueOf("company");
    var department = valueOf("department");
    var positions = valueOf("positions");
    var contract = valueOf("contract");
    var education = valueOf("education");
    var companyDescription = valueOf("companyDescription");
    var jobDescription = valueOf("jobDescription");
    var missions = valueOf("missions");
    var skills = valueOf("skills");
    var qualities = valueOf("qualities");
    var advantages = valueOf("advantages");
    var benefits = valueOf("benefits");
    var instructions = valueOf("applicationInstructions");

    var salaryText = getSalaryText();

    var salaryHTML = salaryText
      ? '<h2>Rémunération</h2><p>' + escapeHTML(salaryText) + "</p>"
      : "";

    content.innerHTML =
      "<h1>" +
      escapeHTML(jobTitle) +
      "</h1>" +
      "<p><strong>" +
      escapeHTML(company) +
      "</strong></p>" +
      '<div class="job-meta">' +
      "<span>💼 " +
      escapeHTML(contract) +
      "</span>" +
      "<span>👥 " +
      escapeHTML(positions) +
      " poste(s)</span>" +
      "</div>" +
      "<h2>Présentation de l'entreprise</h2>" +
      "<p>" +
      escapeHTML(companyDescription) +
      "</p>" +
      "<h2>Description du poste</h2>" +
      "<p>" +
      escapeHTML(jobDescription) +
      "</p>" +
      "<h2>Vos missions</h2>" +
      "<ul>" +
      linesToHTML(missions) +
      "</ul>" +
      "<h2>Profil recherché</h2>" +
      '<p style="margin-top:6px;"><strong>Formation :</strong> ' +
      escapeHTML(education) +
      "</p>" +
      "<h2>Compétences requises</h2>" +
      "<ul>" +
      linesToHTML(skills) +
      "</ul>" +
      (qualities.trim()
        ? "<h2>Qualités personnelles</h2><ul>" +
          linesToHTML(qualities) +
          "</ul>"
        : "") +
      (advantages.trim()
        ? "<h2>Atouts supplémentaires</h2><p>" +
          escapeHTML(advantages) +
          "</p>"
        : "") +
      salaryHTML +
      (benefits.trim()
        ? "<h2>Avantages</h2><ul>" + linesToHTML(benefits) + "</ul>"
        : "") +
      '<div class="apply-banner">' +
      "<strong>Comment postuler ?</strong>" +
      "<p>" +
      escapeHTML(instructions) +
      "</p>" +
      '<p style="margin-top:10px;">La candidature se fait exclusivement via le ' +
      "formulaire en ligne. À la fin du formulaire, vous pourrez joindre votre CV " +
      "et votre lettre de motivation.</p>" +
      "</div>";

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closePreview() {
    var modal = byId("previewModal");

    if (!modal) return;

    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  /* ------------------------------------------------------------
     Notifications
     ------------------------------------------------------------ */

  function showNotification(message, type) {
    var notification = byId("notification");

    if (!notification) return;

    notification.textContent = message;
    notification.className = "notification show " + type;

    notification.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  /* ------------------------------------------------------------
     Brouillon local
     Le brouillon est enregistré dans le navigateur.
     Il ne sera pas partagé entre plusieurs utilisateurs.
     ------------------------------------------------------------ */

  function getFormData(form, request) {
    var data = {};

    Array.prototype.forEach.call(form.elements, function (element) {
      if (!element.name) return;

      if (element.type === "checkbox") {
        data[element.name] = element.checked;
      } else {
        data[element.name] = element.value;
      }
    });

    data.reference = request.reference;

    ["checkInformation", "checkContent", "checkSalary", "checkApplication"].forEach(
      function (id) {
        var check = byId(id);
        data[id] = check ? check.checked : false;
      }
    );

    return data;
  }

  function saveDraft(form, request) {
    try {
      var data = getFormData(form, request);
      var modified = new Date().toISOString();
      localStorage.setItem(
        "offre-brouillon-" + request.reference,
        JSON.stringify(data)
      );

      /* Met à jour la liste des brouillons des offres. */
      RHDrafts.upsert({
        id: request.reference,
        requestId: request.requestId || null,
        request: request,
        data: data,
        title: (byId("jobTitle") || {}).value || "Titre à définir",
        department: (byId("department") || {}).value || "À définir",
        contract: (byId("contract") || {}).value || "À préciser",
        modified: modified
      });

      if (window.currentPageId === "nouveau") {
        window.location.hash = "page=publication-offre&id=" + encodeURIComponent(request.reference);
      }

      showNotification(
        "Brouillon enregistré dans ce navigateur. Il ne sera pas encore visible par les autres utilisateurs.",
        "success"
      );
    } catch (error) {
      showNotification(
        "Impossible d'enregistrer le brouillon dans ce navigateur.",
        "error"
      );
    }
  }

  function loadDraft(form, request) {
    var data = null;

    try {
      var saved = localStorage.getItem("offre-brouillon-" + request.reference);

      if (saved) data = JSON.parse(saved);
    } catch (error) {
      data = null;
    }

    if (!data) {
      var entry = RHDrafts.get(request.reference);
      if (entry && entry.data) data = entry.data;
      else if (entry) data = { jobTitle: entry.title, department: entry.department, contract: entry.contract };
    }

    if (!data || typeof data !== "object" || Array.isArray(data)) return;

    try {
      Object.keys(data || {}).forEach(function (key) {
        var element = form.elements.namedItem(key);

        if (!element) return;

        if (element.type === "checkbox") {
          element.checked = Boolean(data[key]);
        } else if (key !== "reference" && key !== "salaryMonthlyEstimate") {
          element.value = data[key];
        }
      });
    } catch (error) {
      console.warn("Le brouillon n'a pas pu être chargé.");
    }
  }

  /* ------------------------------------------------------------
     Validation avant publication
     ------------------------------------------------------------ */

  function validatePublication(form) {
    if (!form.reportValidity()) {
      return false;
    }

    var salaryDisplay = byId("salaryDisplay");

    if (salaryDisplay && salaryDisplay.value === "Salaire approximatif") {
      var estimate = Number((byId("salaryMonthlyEstimate") || {}).value || 0);
      if (!estimate || estimate < 0) {
        showNotification(
          "Aucune estimation mensuelle Finance n'est associée à cette demande.",
          "error"
        );

        return false;
      }
    }

    var checks = ["checkInformation", "checkContent", "checkSalary", "checkApplication"];
    var allChecked = checks.every(function (id) {
      var check = byId(id);
      return !!check && check.checked;
    });

    if (!allChecked) {
      showNotification(
        "Veuillez confirmer les quatre points de vérification avant de publier l'offre.",
        "error"
      );

      return false;
    }

    return true;
  }

  /* Publication et enregistrement d'une offre côté RH. */

  function publishOffer(form, request) {
    if (!validatePublication(form)) {
      return;
    }

    var confirmed = window.confirm(
      "Confirmer la publication de cette offre ?\n\n" +
        "Elle sera enregistrée comme publiée dans le suivi RH."
    );

    if (!confirmed) return;

    var data = getFormData(form, request);
    var buttons = form.querySelectorAll('button[type="submit"]');
    var previewPublishButton = byId("publishFromPreviewButton");
    buttons.forEach(function (button) { button.disabled = true; });
    if (previewPublishButton) previewPublishButton.disabled = true;
    var contextPath = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");

    fetch(contextPath + "/Responsable-RH/api/offres", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        data: data,
        request: {
          requestId: request.requestId || null,
          reference: request.reference,
          standalone: Boolean(request.standalone)
        }
      })
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok) throw new Error(body.message || "La publication a échoué.");
          return body;
        });
      })
      .then(function (result) {
        RHDrafts.remove(request.reference);
        showNotification(result.message || "L'offre a été publiée et enregistrée.", "success");
        closePreview();
        window.location.hash = "page=suivi-offres-publiees";
      })
      .catch(function (error) {
        showNotification(error.message || "Impossible d'enregistrer l'offre.", "error");
      })
      .finally(function () {
        buttons.forEach(function (button) { button.disabled = false; });
        if (previewPublishButton) previewPublishButton.disabled = false;
      });
  }

  /* ------------------------------------------------------------
     Initialisation de la page
     ------------------------------------------------------------ */

  function initPublicationOffre(event) {
    var form = byId("offerForm");

    if (!form) return;

    /* Évite une double initialisation sur la même page. */
    if (form.dataset.publicationOffreReady === "true") return;
    var contextPath = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");

    if (form.dataset.departmentOptionsLoaded !== "true") {
      if (form.dataset.departmentOptionsLoading === "true") return;
      form.dataset.departmentOptionsLoading = "true";
      var departmentsUrl = form.dataset.departmentsUrl || contextPath + "/Responsable-RH/api/offres/referentiels/departements";
      fetch(departmentsUrl, { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("Réponse HTTP " + response.status + " pour le chargement des départements.");
          return response.json();
        })
        .then(function (departements) {
          var select = byId("department");
          if (!select || !Array.isArray(departements)) throw new Error("La liste des départements est invalide.");
          select.innerHTML = "";
          var placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = departements.length ? "À choisir" : "Aucun département disponible";
          select.appendChild(placeholder);
          departements.forEach(function (departement) {
            if (!departement || !departement.nom) return;
            var option = document.createElement("option");
            option.value = departement.nom;
            option.textContent = departement.nom;
            select.appendChild(option);
          });
          form.dataset.departmentOptionsLoaded = "true";
          form.dataset.departmentOptionsLoading = "false";
          return true;
        })
        .catch(function (error) {
          console.error("Erreur pendant le chargement des départements de l'offre :", error);
          form.dataset.departmentOptionsLoading = "false";
          var select = byId("department");
          if (select) {
            select.innerHTML = "";
            var option = document.createElement("option");
            option.value = "";
            option.textContent = "Départements indisponibles";
            select.appendChild(option);
          }
          showNotification("Les départements n'ont pas pu être chargés : " + error.message, "error");
          form.querySelectorAll("button[type='submit'], #saveDraftButton, #previewButton").forEach(function (button) {
            button.disabled = true;
          });
          return false;
        })
        .then(function (departmentsLoaded) {
          if (!departmentsLoaded) return;
          try {
            initPublicationOffre(event);
          } catch (error) {
            console.error("Erreur pendant l'initialisation du formulaire d'offre :", error);
            form.dataset.publicationOffreReady = "false";
            showNotification("Impossible de préparer le formulaire : " + error.message, "error");
          }
        });
      return;
    }

    if (form.dataset.contractOptionsLoaded !== "true") {
      if (form.dataset.contractOptionsLoading === "true") return;
      form.dataset.contractOptionsLoading = "true";
      var contractsUrl = form.dataset.contractsUrl || contextPath + "/Responsable-RH/api/offres/referentiels/contrats";
      fetch(contractsUrl, { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("Réponse HTTP " + response.status + " pour le chargement des types de contrat.");
          return response.json();
        })
        .then(function (contracts) {
          var select = byId("contract");
          if (!select || !Array.isArray(contracts)) throw new Error("La liste des types de contrat est invalide.");
          select.innerHTML = "";
          var placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = contracts.length ? "À choisir" : "Aucun type disponible";
          select.appendChild(placeholder);
          contracts.forEach(function (contract) {
            if (typeof contract !== "string" || !contract.trim()) return;
            var option = document.createElement("option");
            option.value = contract;
            option.textContent = contract;
            select.appendChild(option);
          });
          form.dataset.contractOptionsLoaded = "true";
        })
        .catch(function (error) {
          console.error("Erreur pendant le chargement des types de contrat :", error);
          showNotification("Les types de contrat n'ont pas pu être chargés : " + error.message, "error");
          form.querySelectorAll("button[type='submit'], #saveDraftButton, #previewButton").forEach(function (button) {
            button.disabled = true;
          });
        })
        .finally(function () {
          form.dataset.contractOptionsLoading = "false";
          if (form.dataset.contractOptionsLoaded === "true") initPublicationOffre(event);
        });
      return;
    }

    if (form.dataset.educationOptionsLoaded !== "true") {
      if (form.dataset.educationOptionsLoading === "true") return;
      form.dataset.educationOptionsLoading = "true";
      var educationUrl = form.dataset.educationLevelsUrl || contextPath + "/Responsable-RH/api/offres/referentiels/niveaux-etude";
      fetch(educationUrl, { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("Réponse HTTP " + response.status + " pour le chargement des niveaux d'étude.");
          return response.json();
        })
        .then(function (levels) {
          var select = byId("education");
          if (!select || !Array.isArray(levels)) throw new Error("La liste des niveaux d'étude est invalide.");
          select.innerHTML = "";
          var placeholder = document.createElement("option");
          placeholder.value = "";
          placeholder.textContent = levels.length ? "À choisir" : "Aucun niveau disponible";
          select.appendChild(placeholder);
          levels.forEach(function (level) {
            if (typeof level !== "string" || !level.trim()) return;
            var option = document.createElement("option");
            option.value = level;
            option.textContent = level;
            select.appendChild(option);
          });
          form.dataset.educationOptionsLoaded = "true";
        })
        .catch(function (error) {
          console.error("Erreur pendant le chargement des niveaux d'étude :", error);
          showNotification("Les niveaux d'étude n'ont pas pu être chargés : " + error.message, "error");
          form.querySelectorAll("button[type='submit'], #saveDraftButton, #previewButton").forEach(function (button) {
            button.disabled = true;
          });
        })
        .finally(function () {
          form.dataset.educationOptionsLoading = "false";
          if (form.dataset.educationOptionsLoaded === "true") initPublicationOffre(event);
        });
      return;
    }

    form.dataset.publicationOffreReady = "true";

    var reference = resolveReference(event);
    var savedDraft = RHDrafts.get(reference);
    var request = (savedDraft && savedDraft.request) || publicationRequests[reference] || null;
    if (!request && reference === "nouveau") {
      request = createBlankRequest();
      publicationRequests[reference] = request;
      clearOfferForm(form);
      form.dataset.publicationOffreReady = "false";
      initPublicationOffre(event);
      return;
    }
    if (!request && (/^\d+$/.test(reference) || /^DEM-\d+$/.test(reference))) {
      var requestId = /^\d+$/.test(reference) ? reference : reference.slice(4);
      fetch((document.querySelector('meta[name="context-path"]')?.content || '').replace(/\/$/, '') + '/api/rh/besoins-valides')
        .then(function (response) { if (!response.ok) throw new Error('Chargement impossible'); return response.json(); })
        .then(function (items) {
          var row = items.find(function (item) { return String(item.id) === requestId; });
          if (!row) throw new Error('Cette demande n’est plus dans la liste des demandes validées.');
          publicationRequests[reference] = {
            reference: 'DEM-' + row.id,
            requestId: row.id,
            standalone: false,
            approvalDate: 'Non enregistrée',
            manager: row.manager,
            department: row.departement || '',
            positions: row.effectif,
            salaryMonthlyEstimate: row.salaireMensuelEstime || null,
            needType: 'Type non renseigné dans la demande',
            contract: 'À préciser',
            startDate: row.dateSouhaitee || '',
            education: 'À préciser',
            reason: row.motif || 'Aucun motif renseigné.',
            jobTitle: row.poste,
            skills: row.competence || ''
          };
          form.dataset.publicationOffreReady = 'false';
          initPublicationOffre(event);
        })
        .catch(function (error) {
          setText('requestReference', error.message);
          form.querySelectorAll('button[type="submit"], #saveDraftButton, #previewButton').forEach(function (button) { button.disabled = true; });
        });
      return;
    }
    if (!request) {
      setText('requestReference', 'Brouillon introuvable ou demande non validée');
      form.querySelectorAll('button[type="submit"], #saveDraftButton, #previewButton').forEach(function (button) { button.disabled = true; });
      return;
    }
    var modal = byId("previewModal");

    fillRequestInformation(request);
    loadDraft(form, request);
    updateSalaryFields();
    updateSummary();

    /* Écouteurs d'événements. */
    ["jobTitle", "department", "contract", "positions"].forEach(
      function (id) {
        var element = byId(id);

        if (!element) return;

        element.addEventListener("input", updateSummary);
        element.addEventListener("change", updateSummary);
      }
    );

    var salaryDisplay = byId("salaryDisplay");

    if (salaryDisplay) {
      salaryDisplay.addEventListener("change", updateSalaryFields);
    }

    var previewButton = byId("previewButton");

    if (previewButton) {
      previewButton.addEventListener("click", generatePreview);
    }

    var closeModalButton = byId("closeModalButton");

    if (closeModalButton) {
      closeModalButton.addEventListener("click", closePreview);
    }

    var closePreviewButton = byId("closePreviewButton");

    if (closePreviewButton) {
      closePreviewButton.addEventListener("click", closePreview);
    }

    var publishFromPreviewButton = byId("publishFromPreviewButton");

    if (publishFromPreviewButton) {
      publishFromPreviewButton.addEventListener("click", function () {
        publishOffer(form, request);
      });
    }

    var saveDraftButton = byId("saveDraftButton");

    if (saveDraftButton) {
      saveDraftButton.addEventListener("click", function () {
        saveDraft(form, request);
      });
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      publishOffer(form, request);
    });

    if (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) {
          closePreview();
        }
      });
    }
  }

  /* Fermeture de l'aperçu avec la touche Échap.
     Écouté une seule fois, peu importe le nombre de pages chargées. */
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closePreview();
    }
  });

  /* Point d'entrée public, conservé pour compatibilité. */
  window.initPublicationOffrePage = initPublicationOffre;

  document.addEventListener("pageLoaded", initPublicationOffre);

  if (document.readyState !== "loading") {
    initPublicationOffre();
  } else {
    document.addEventListener("DOMContentLoaded", initPublicationOffre);
  }
})();

/* =========================================
   RH - Brouillons des offres
   =========================================
   Pilote la page
   Responsable-RH/pages/brouillons-offre.html

   Les brouillons sont stockés dans le navigateur (localStorage).
   ========================================= */

(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (character) {
      var entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      };

      return entities[character];
    });
  }

  function formatDate(dateValue) {
    var date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      return "Date inconnue";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(date);
  }

  function formatTime(dateValue) {
    var date = new Date(dateValue);

    if (isNaN(date.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("fr-FR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function initBrouillonsOffre() {
    var tableBody = byId("draftTableBody");

    if (!tableBody) return;

    var drafts = RHDrafts.all();
    var selectedDraftId = null;
    var toastTimeout = null;

    var searchInput = byId("searchInput");
    var departmentFilter = byId("departmentFilter");
    var sortFilter = byId("sortFilter");
    var tableWrapper = byId("tableWrapper");
    var emptyState = byId("emptyState");
    var tableFooter = byId("tableFooter");
    var deleteModal = byId("deleteModal");
    var toast = byId("toast");

    if (departmentFilter) {
      var knownDepartments = Array.prototype.map.call(departmentFilter.options, function (option) { return option.value; });
      Array.from(new Set(drafts.map(function (draft) { return draft.department; }).filter(Boolean))).forEach(function (name) {
        if (knownDepartments.indexOf(name) !== -1) return;
        var option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        departmentFilter.appendChild(option);
      });
    }

    /* ------------------------------------------------------------
       Filtres et recherche
       ------------------------------------------------------------ */

    function getFilteredDrafts() {
      var search = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var department = departmentFilter ? departmentFilter.value : "";
      var sort = sortFilter ? sortFilter.value : "recent";

      var result = drafts.filter(function (draft) {
        var matchesSearch =
          String(draft.title || "").toLowerCase().indexOf(search) !== -1 ||
          String(draft.id || "").toLowerCase().indexOf(search) !== -1 ||
          String(draft.requestId || "").toLowerCase().indexOf(search) !== -1 ||
          String(draft.department || "").toLowerCase().indexOf(search) !== -1;

        var matchesDepartment =
          !department || draft.department === department;

        return matchesSearch && matchesDepartment;
      });

      if (sort === "recent") {
        result.sort(function (a, b) {
          return new Date(b.modified) - new Date(a.modified);
        });
      } else if (sort === "oldest") {
        result.sort(function (a, b) {
          return new Date(a.modified) - new Date(b.modified);
        });
      } else if (sort === "title") {
        result.sort(function (a, b) {
          return a.title.localeCompare(b.title, "fr");
        });
      }

      return result;
    }

    /* ------------------------------------------------------------
       Affichage du tableau
       ------------------------------------------------------------ */

    function renderDrafts() {
      var filteredDrafts = getFilteredDrafts();

      tableBody.innerHTML = "";

      filteredDrafts.forEach(function (draft) {
        var row = document.createElement("tr");

        row.innerHTML =
          "<td>" +
          '<div class="job-title">' +
          escapeHTML(draft.title) +
          "</div>" +
          '<div class="job-reference">' +
          (draft.requestId ? "Demande DEM-" + escapeHTML(draft.requestId) : (draft.request && draft.request.standalone ? "Brouillon libre" : "Référence " + escapeHTML(draft.id))) +
          "</div>" +
          "</td>" +
          "<td>" +
          '<span class="department">' +
          escapeHTML(draft.department) +
          "</span>" +
          "</td>" +
          "<td>" +
          escapeHTML(draft.contract) +
          "</td>" +
          "<td>" +
          '<span class="date-text">' +
          formatDate(draft.modified) +
          "</span>" +
          '<span class="date-subtext">à ' +
          formatTime(draft.modified) +
          "</span>" +
          "</td>" +
          "<td>" +
          escapeHTML(draft.author) +
          "</td>" +
          "<td>" +
          '<span class="draft-status">Brouillon</span>' +
          "</td>" +
          "<td>" +
          '<div class="actions">' +
          '<button type="button" class="action-btn" data-action="edit" data-id="' +
          escapeHTML(draft.id) +
          '" title="Reprendre la rédaction" aria-label="Reprendre la rédaction">✏️</button>' +
          '<button type="button" class="action-btn" data-action="preview" data-id="' +
          escapeHTML(draft.id) +
          '" title="Prévisualiser" aria-label="Prévisualiser">👁</button>' +
          '<button type="button" class="action-btn delete" data-action="delete" data-id="' +
          escapeHTML(draft.id) +
          '" title="Supprimer le brouillon" aria-label="Supprimer le brouillon">🗑</button>' +
          "</div>" +
          "</td>";

        tableBody.appendChild(row);
      });

      updateStatistics(filteredDrafts);
      updateEmptyState(filteredDrafts);
    }

    function updateStatistics(filteredDrafts) {
      var total = byId("totalDrafts");
      var recent = byId("recentDrafts");
      var linked = byId("linkedRequests");
      var badge = byId("draftCountBadge");
      var resultCount = byId("resultCount");

      if (total) total.textContent = drafts.length;

      if (recent) {
        var now = new Date();
        var week = 7 * 24 * 60 * 60 * 1000;

        var recentCount = drafts.filter(function (draft) {
          var difference = now - new Date(draft.modified);

          return difference >= 0 && difference <= week;
        }).length;

        recent.textContent = recentCount;
      }

      if (linked) {
        var references = {};

        drafts.forEach(function (draft) {
          if (draft.requestId) references[draft.requestId] = true;
        });

        linked.textContent = Object.keys(references || {}).length;
      }

      var count = filteredDrafts.length;

      if (badge) {
        badge.textContent = count + (count > 1 ? " brouillons" : " brouillon");
      }

      if (resultCount) {
        resultCount.textContent =
          count === 0
            ? "Aucun résultat"
            : "Affichage de " +
              count +
              (count > 1 ? " brouillons" : " brouillon");
      }
    }

    function updateEmptyState(filteredDrafts) {
      var hasResults = filteredDrafts.length > 0;

      if (tableWrapper) {
        tableWrapper.style.display = hasResults ? "block" : "none";
      }

      if (tableFooter) {
        tableFooter.style.display = hasResults ? "flex" : "none";
      }

      if (emptyState) {
        emptyState.classList.toggle("show", !hasResults);
      }

      var message = byId("emptyMessage");

      if (!message) return;

      message.textContent =
        drafts.length === 0
          ? "Vous n'avez aucun brouillon enregistré pour le moment."
          : "Essayez de modifier votre recherche ou vos filtres.";
    }

    /* ------------------------------------------------------------
       Notification
       ------------------------------------------------------------ */

    function showToast(message) {
      if (!toast) return;

      toast.textContent = message;
      toast.classList.add("show");

      clearTimeout(toastTimeout);

      toastTimeout = setTimeout(function () {
        toast.classList.remove("show");
      }, 3500);
    }

    /* ------------------------------------------------------------
       Reprendre la rédaction
       ------------------------------------------------------------ */

    function editDraft(id) {
      var draft = drafts.filter(function (item) {
        return item.id === id;
      })[0];

      if (!draft) return;

      /* La page publication-offre recharge le brouillon correspondant. */
      window.location.hash =
        "page=publication-offre&id=" + encodeURIComponent(draft.id);
    }

    /* ------------------------------------------------------------
       Prévisualiser un brouillon
       ------------------------------------------------------------ */

    function previewDraft(id) {
      var draft = drafts.filter(function (item) {
        return item.id === id;
      })[0];

      if (!draft) return;

      var modalBody = deleteModal.querySelector(".modal-body");
      var modalTitle = deleteModal.querySelector(".modal-header h2");
      var confirmButton = byId("confirmDeleteButton");
      var cancelButton = byId("cancelDeleteButton");

      modalBody.innerHTML =
        '<div class="modal-job">' +
        "<strong>" +
        escapeHTML(draft.title) +
        "</strong>" +
        "<span>Demande " +
        escapeHTML(draft.id) +
        " · " +
        escapeHTML(draft.department) +
        "</span>" +
        "</div>" +
        "<p><strong>Contrat :</strong> " +
        escapeHTML(draft.contract) +
        "</p>" +
        "<p><strong>Dernière modification :</strong> " +
        formatDate(draft.modified) +
        " à " +
        formatTime(draft.modified) +
        "</p>" +
        "<p><strong>Responsable :</strong> " +
        escapeHTML(draft.author) +
        "</p>" +
        "<p>Cette offre est enregistrée comme brouillon dans ce navigateur.</p>";

      modalTitle.textContent = "Aperçu du brouillon";

      if (confirmButton) confirmButton.style.display = "none";
      if (cancelButton) cancelButton.textContent = "Fermer";

      selectedDraftId = null;

      deleteModal.classList.add("show");
    }

    /* ------------------------------------------------------------
       Suppression
       ------------------------------------------------------------ */

    function openDeleteModal(id) {
      var draft = drafts.filter(function (item) {
        return item.id === id;
      })[0];

      if (!draft) return;

      selectedDraftId = id;

      var modalBody = deleteModal.querySelector(".modal-body");
      var modalTitle = deleteModal.querySelector(".modal-header h2");
      var confirmButton = byId("confirmDeleteButton");
      var cancelButton = byId("cancelDeleteButton");

      modalTitle.textContent = "Supprimer le brouillon";

      modalBody.innerHTML =
        '<div class="modal-job">' +
        "<strong>" +
        escapeHTML(draft.title) +
        "</strong>" +
        "<span>Demande " +
        escapeHTML(draft.id) +
        "</span>" +
        "</div>" +
        "<p>Voulez-vous vraiment supprimer ce brouillon ?</p>" +
        "<p>Seul le brouillon sera supprimé ; la demande RH liée reste inchangée.</p>";

      if (confirmButton) confirmButton.style.display = "inline-flex";
      if (cancelButton) cancelButton.textContent = "Annuler";

      deleteModal.classList.add("show");
    }

    function closeModal() {
      deleteModal.classList.remove("show");
      selectedDraftId = null;

      var modalBody = deleteModal.querySelector(".modal-body");
      var modalTitle = deleteModal.querySelector(".modal-header h2");
      var confirmButton = byId("confirmDeleteButton");
      var cancelButton = byId("cancelDeleteButton");

      modalTitle.textContent = "Supprimer le brouillon";

      modalBody.innerHTML =
        '<div class="modal-job">' +
        '<strong id="deleteJobTitle"></strong>' +
        '<span id="deleteJobReference"></span>' +
        "</div>" +
        "<p>Voulez-vous vraiment supprimer ce brouillon ?</p>" +
        "<p>Seul le brouillon sera supprimé ; la demande RH liée reste inchangée.</p>";

      if (confirmButton) confirmButton.style.display = "inline-flex";
      if (cancelButton) cancelButton.textContent = "Annuler";
    }

    function confirmDelete() {
      if (!selectedDraftId) return;

      drafts = RHDrafts.remove(selectedDraftId);

      closeModal();
      renderDrafts();

      showToast("Le brouillon a été supprimé de la liste.");
    }

    /* ------------------------------------------------------------
       Événements
       ------------------------------------------------------------ */

    if (searchInput) {
      searchInput.addEventListener("input", renderDrafts);
    }

    if (departmentFilter) {
      departmentFilter.addEventListener("change", renderDrafts);
    }

    if (sortFilter) {
      sortFilter.addEventListener("change", renderDrafts);
    }

    tableBody.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-action]");

      if (!button) return;

      var id = button.dataset.id;
      var action = button.dataset.action;

      if (action === "edit") {
        editDraft(id);
      }

      if (action === "preview") {
        previewDraft(id);
      }

      if (action === "delete") {
        openDeleteModal(id);
      }
    });

    var confirmButton = byId("confirmDeleteButton");

    if (confirmButton) {
      confirmButton.addEventListener("click", confirmDelete);
    }

    var closeModalButton = byId("closeModalButton");

    if (closeModalButton) {
      closeModalButton.addEventListener("click", closeModal);
    }

    var cancelDeleteButton = byId("cancelDeleteButton");

    if (cancelDeleteButton) {
      cancelDeleteButton.addEventListener("click", closeModal);
    }

    var resetFiltersButton = byId("resetFiltersButton");

    if (resetFiltersButton) {
      resetFiltersButton.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";
        if (departmentFilter) departmentFilter.value = "";
        if (sortFilter) sortFilter.value = "recent";

        renderDrafts();
      });
    }

    deleteModal.addEventListener("click", function (event) {
      if (event.target === deleteModal) {
        closeModal();
      }
    });

    /* ------------------------------------------------------------
       Initialisation
       ------------------------------------------------------------ */

    renderDrafts();
  }

  /* Fermeture de la modale avec la touche Échap.
     Écouté une seule fois, peu importe le nombre de pages chargées. */
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;

    var modal = document.getElementById("deleteModal");

    if (modal) modal.classList.remove("show");
  });

  document.addEventListener("pageLoaded", initBrouillonsOffre);
})();

/* =========================================
   RH - Suivi des offres publiées
   =========================================
   Pilote la page
   Responsable-RH/pages/suivi-offres-publiees.html

   La liste et les statistiques viennent des offres enregistrées côté RH.
   ========================================= */

(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function initSuiviOffresPubliees() {
    var tableBody = byId("offers-tbody");
    if (!tableBody || tableBody.dataset.ready === "true") return;
    tableBody.dataset.ready = "true";

    var searchInput = byId("search");
    var departmentFilter = byId("department-filter");
    var statusFilter = byId("status-filter");
    var resetButton = byId("reset-filters");
    var emptyResetButton = byId("empty-reset");
    var emptyState = byId("empty-state");
    var statusNotification = byId("offer-status-notification");
    var visibleCount = byId("visible-count");
    var panelCount = byId("panel-count");
    var offers = [];
    var contextPath = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
    var endpoint = contextPath + "/Responsable-RH/api/offres";

    function cell(text, className) {
      var td = document.createElement("td");
      td.textContent = text == null ? "" : String(text);
      if (className) td.className = className;
      return td;
    }

    function localDate(value) {
      if (!value) return null;
      var parts = String(value).slice(0, 10).split("-");
      if (parts.length !== 3) return null;
      var date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return isNaN(date.getTime()) ? null : date;
    }

    function formatDate(value) {
      var date = localDate(value);
      return date ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(date) : "—";
    }

    function statusKey(offer) {
      if (offer.statut === "suspendue") return "suspended";
      if (offer.statut === "cloturee") return "closed";
      if (offer.statut === "publiee") {
        var closingDate = localDate(offer.dateCloture);
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (closingDate && closingDate < today) return "expired";
        var soon = new Date(today);
        soon.setDate(soon.getDate() + 7);
        if (closingDate && closingDate >= today && closingDate <= soon) return "ending";
        return "active";
      }
      return "closed";
    }

    function statusLabel(key) {
      return { active: "Active", ending: "Bientôt expirée", expired: "Expirée", suspended: "Suspendue", closed: "Clôturée" }[key] || "Inconnue";
    }

    function actionButtons(offer, key) {
      var wrapper = document.createElement("div");
      wrapper.className = "actions";
      var action = key === "active" || key === "ending"
        ? [["suspendue", "Suspendre"], ["cloturee", "Clôturer"]]
        : key === "suspended"
          ? [["publiee", "Réactiver"], ["cloturee", "Clôturer"]]
          : key === "expired"
            ? [["cloturee", "Clôturer"]]
            : [["publiee", "Réouvrir"]];
      if (key === "closed") {
        var deadline = localDate(offer.dateCloture);
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadline && deadline < today) action = [];
      }
      action.forEach(function (item) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "action-button";
        button.dataset.offerId = offer.id;
        button.dataset.offerStatus = item[0];
        button.textContent = item[1];
        wrapper.appendChild(button);
      });
      return wrapper;
    }

    function render() {
      var query = searchInput ? searchInput.value.trim().toLocaleLowerCase() : "";
      var department = departmentFilter ? departmentFilter.value : "";
      var status = statusFilter ? statusFilter.value : "";
      var visible = offers.filter(function (offer) {
        var title = String(offer.titre || "").toLocaleLowerCase();
        var departmentName = String(offer.departement || "");
        var contract = String(offer.contrat || "").toLocaleLowerCase();
        var reference = "OFF-" + offer.id;
        var requestReference = offer.request && offer.request.requestId ? "DEM-" + offer.request.requestId : "";
        return (!query || [title, departmentName.toLocaleLowerCase(), contract, reference.toLocaleLowerCase(), requestReference.toLocaleLowerCase()].join(" ").includes(query)) &&
          (!department || departmentName === department) &&
          (!status || statusKey(offer) === status);
      });

      tableBody.innerHTML = "";
      visible.forEach(function (offer) {
        var key = statusKey(offer);
        var row = document.createElement("tr");
        row.dataset.title = offer.titre || "";
        row.dataset.department = offer.departement || "";
        row.dataset.contract = offer.contrat || "";
        row.dataset.status = key;

        var titleCell = document.createElement("td");
        var offerCell = document.createElement("div");
        offerCell.className = "offer-cell";
        var icon = document.createElement("div");
        icon.className = "offer-icon blue";
        icon.textContent = "▤";
        var titleWrap = document.createElement("div");
        var title = document.createElement("div");
        title.className = "offer-name";
        title.textContent = offer.titre || "Offre sans titre";
        var reference = document.createElement("div");
        reference.className = "offer-reference";
        reference.textContent = "Réf. OFF-" + offer.id + (offer.request && offer.request.requestId ? " · DEM-" + offer.request.requestId : "");
        titleWrap.appendChild(title);
        titleWrap.appendChild(reference);
        offerCell.appendChild(icon);
        offerCell.appendChild(titleWrap);
        titleCell.appendChild(offerCell);
        row.appendChild(titleCell);

        var departmentCell = document.createElement("td");
        var departmentTag = document.createElement("span");
        departmentTag.className = "department-name";
        departmentTag.textContent = offer.departement || "—";
        departmentCell.appendChild(departmentTag);
        row.appendChild(departmentCell);
        row.appendChild(cell(offer.contrat || "À préciser"));

        var statusCell = document.createElement("td");
        var statusTag = document.createElement("span");
        statusTag.className = "status status-" + key;
        statusTag.textContent = statusLabel(key);
        statusCell.appendChild(statusTag);
        row.appendChild(statusCell);
        row.appendChild(cell(offer.nombreCandidatures || 0));
        row.appendChild(cell(formatDate(offer.datePublication), "date-cell"));
        var actionCell = document.createElement("td");
        var actionsWrapper = actionButtons(offer, key);
        var viewCandidatesButton = document.createElement("button");
        viewCandidatesButton.type = "button";
        viewCandidatesButton.className = "action-button";
        viewCandidatesButton.textContent = "Voir les candidats";
        viewCandidatesButton.addEventListener("click", function () {
          try {
            sessionStorage.setItem("candidatures-offre-id", String(offer.id));
            sessionStorage.setItem("candidatures-offre-titre", offer.titre || "Offre sans titre");
          } catch (error) {}
          window.location.hash = "page=candidatures-recues&id=" + encodeURIComponent(offer.id);
        });
        actionsWrapper.appendChild(viewCandidatesButton);
        actionCell.appendChild(actionsWrapper);
        row.appendChild(actionCell);
        tableBody.appendChild(row);
      });

      var noOffers = offers.length === 0;
      var noResults = visible.length === 0;
      if (emptyState) {
        emptyState.classList.toggle("visible", noResults);
        var heading = emptyState.querySelector("h3");
        var description = emptyState.querySelector("p");
        if (heading) heading.textContent = noOffers ? "Aucune offre publiée" : "Aucune offre trouvée";
        if (description) description.textContent = noOffers
          ? "Les offres publiées par le service RH apparaîtront ici."
          : "Aucune offre ne correspond à vos filtres. Essayez une autre recherche.";
      }
      if (visibleCount) visibleCount.textContent = visible.length;
      if (panelCount) panelCount.textContent = visible.length + (visible.length > 1 ? " offres" : " offre");
      updateStatistics();
    }

    function updateStatistics() {
      var today = new Date();
      today.setHours(0, 0, 0, 0);
      var soon = new Date(today);
      soon.setDate(soon.getDate() + 7);
      var active = offers.filter(function (offer) {
        var closing = localDate(offer.dateCloture);
        return offer.statut === "publiee" && (!closing || closing >= today);
      }).length;
      var ending = offers.filter(function (offer) {
        var closing = localDate(offer.dateCloture);
        return offer.statut === "publiee" && closing && closing >= today && closing <= soon;
      }).length;
      var applications = offers.reduce(function (total, offer) { return total + Number(offer.nombreCandidatures || 0); }, 0);
      var set = function (id, value) { var element = byId(id); if (element) element.textContent = value; };
      set("total-offers", offers.length);
      set("active-offers", active);
      set("ending-offers", ending);
      set("total-applications", applications);
    }

    function loadOffers() {
      tableBody.innerHTML = '<tr><td colspan="7">Chargement des offres…</td></tr>';
      fetch(endpoint, { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("Le suivi des offres est indisponible.");
          return response.json();
        })
        .then(function (data) {
          offers = Array.isArray(data) ? data : [];
          if (departmentFilter) {
            var current = departmentFilter.value;
            Array.from(departmentFilter.querySelectorAll("option[data-dynamic]" )).forEach(function (option) { option.remove(); });
            Array.from(new Set(offers.map(function (offer) { return offer.departement; }).filter(Boolean))).sort().forEach(function (name) {
              if (Array.from(departmentFilter.options).some(function (option) { return option.value === name; })) return;
              var option = document.createElement("option");
              option.value = name;
              option.textContent = name;
              option.dataset.dynamic = "true";
              departmentFilter.appendChild(option);
            });
            departmentFilter.value = current;
          }
          render();
        })
        .catch(function (error) {
          tableBody.innerHTML = "";
          var row = document.createElement("tr");
          var message = cell(error.message || "Impossible de charger les offres.");
          message.colSpan = 7;
          row.appendChild(message);
          tableBody.appendChild(row);
        });
    }

    function resetFilters() {
      if (searchInput) searchInput.value = "";
      if (departmentFilter) departmentFilter.value = "";
      if (statusFilter) statusFilter.value = "";
      render();
    }

    if (searchInput) searchInput.addEventListener("input", render);
    if (departmentFilter) departmentFilter.addEventListener("change", render);
    if (statusFilter) statusFilter.addEventListener("change", render);
    if (resetButton) resetButton.addEventListener("click", resetFilters);
    if (emptyResetButton) emptyResetButton.addEventListener("click", resetFilters);
    tableBody.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-offer-id][data-offer-status]");
      if (!button) return;
      button.disabled = true;
      fetch(endpoint + "/" + encodeURIComponent(button.dataset.offerId) + "/statut", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ statut: button.dataset.offerStatus })
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (body) {
            if (!response.ok) throw new Error(body.message || "La mise à jour du statut a échoué.");
            return body;
          });
        })
        .then(function () {
          var messageByStatus = {
            cloturee: "L’offre est clôturée et n’apparaît plus sur la page candidat.",
            suspendue: "L’offre est suspendue et n’apparaît plus sur la page candidat.",
            publiee: "L’offre est active et visible sur la page candidat."
          };
          if (statusNotification) {
            statusNotification.textContent = messageByStatus[button.dataset.offerStatus] || "Le statut de l’offre a été mis à jour.";
            statusNotification.hidden = false;
          }
          loadOffers();
        })
        .catch(function (error) { window.alert(error.message); button.disabled = false; });
    });

    loadOffers();
  }

  document.addEventListener("pageLoaded", initSuiviOffresPubliees);

  if (document.readyState !== "loading") {
    initSuiviOffresPubliees();
  } else {
    document.addEventListener("DOMContentLoaded", initSuiviOffresPubliees);
  }
})();

/* =========================================
   RH - Candidatures reçues
   ========================================= */
(function () {
  "use strict";

  var candidates = {};

  var selectedCandidates = new Set();
  var currentCandidateId = null;
  var previousFocus = null;

  function initCandidaturesRecues(event) {
    if (!event || !event.detail || event.detail.page !== "candidatures-recues") return;

    var page = document.querySelector(".applications-page");
    if (!page) return;

    var modal = page.querySelector("#candidateModal");
    var search = page.querySelector("#searchInput");
    var modalSelect = page.querySelector("#modalSelectButton");
    var offerId = String(window.currentPageId || "").trim();
    if (page.dataset.candidatureOfferId !== offerId) {
      candidates = {};
      selectedCandidates = new Set();
      page.dataset.candidatureOfferId = offerId;
    }
    var offerLabel = page.querySelector("#applicationsOfferFilter");
    if (offerLabel) {
      var storedOfferId = "";
      var storedOfferTitle = "";
      try {
        storedOfferId = sessionStorage.getItem("candidatures-offre-id") || "";
        storedOfferTitle = sessionStorage.getItem("candidatures-offre-titre") || "";
      } catch (error) {}
      offerLabel.textContent = storedOfferId === offerId && storedOfferTitle ? storedOfferTitle : (offerId ? "Offre #" + offerId : "Aucune offre sélectionnée");
    }

    function setText(id, value) {
      var element = page.querySelector("#" + id);
      if (element) element.textContent = value;
    }

    function renderApplicationDetails(containerId, applicationData, fields) {
      var container = page.querySelector("#" + containerId);
      if (!container) return;
      container.replaceChildren();
      fields.forEach(function (field) {
        var item = document.createElement("div");
        var label = document.createElement("p");
        label.className = "detail-label";
        label.textContent = field.label;
        var value = document.createElement("p");
        value.className = "detail-value" + (field.multiline ? " application-long-value" : "");
        value.textContent = applicationData[field.key] || "Non renseigné";
        item.append(label, value);
        container.appendChild(item);
      });
    }

    function updateButton(button, selected, selectedText, defaultText) {
      if (!button) return;
      button.textContent = selected ? selectedText : defaultText;
      button.classList.toggle("btn-selected", selected);
      button.classList.toggle("btn-select", !selected);
      button.disabled = selected;
    }

    function updateCounts() {
      setText("totalCandidates", Object.keys(candidates || {}).length);
      setText("selectedCandidates", selectedCandidates.size);
    }

    function updateCandidateButton(id) {
      updateButton(
        page.querySelector('[data-select-id="' + id + '"]'),
        selectedCandidates.has(id),
        "Présélectionné ✓",
        "Présélectionner"
      );
    }

    function updateModalButton(id) {
      updateButton(modalSelect, selectedCandidates.has(id), "Candidat présélectionné ✓", "Présélectionner");
    }

    function closeModal() {
      if (!modal) return;
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      currentCandidateId = null;
      if (previousFocus && document.contains(previousFocus)) previousFocus.focus();
    }

    function configureDocumentLink(id, url) {
      var link = page.querySelector("#" + id);
      if (!link) return;
      if (url) {
        var context = document.querySelector('meta[name="context-path"]')?.content || "";
        link.href = url.indexOf("/api/") === 0 ? context.replace(/\/$/, "") + url : url;
        link.textContent = "Consulter ↗";
        link.removeAttribute("aria-disabled");
      } else {
        link.removeAttribute("href");
        link.textContent = "Indisponible";
        link.setAttribute("aria-disabled", "true");
      }
    }

    function formatCandidateDocument(name, size) {
      if (!name) return "Document non transmis";
      var formatted = name;
      var bytes = Number(size || 0);
      if (bytes > 0) formatted += " · " + Math.max(1, Math.round(bytes / 1024)) + " Ko";
      return formatted;
    }

    function viewCandidate(id) {
      var candidate = candidates[id];
      if (!candidate || !modal) return;

      currentCandidateId = id;
      previousFocus = document.activeElement;
      setText("modalAvatar", candidate.initials);
      setText("modalName", candidate.name);
      setText("modalEmail", candidate.email);
      setText("detailName", candidate.name);
      setText("detailPhone", candidate.phone);
      setText("detailEmail", candidate.email);
      setText("detailEmailCopy", candidate.email);
      setText("detailCity", candidate.applicationData.city || "Non renseignée");
      setText("detailBirthDate", candidate.applicationData.birthDate || "Non renseignée");
      setText("detailDate", candidate.date);
      setText("detailJob", candidate.job);
      setText("detailContract", candidate.contract);
      renderApplicationDetails("applicationProfileDetails", candidate.applicationData, [
        { label: "Niveau d'études", key: "education" },
        { label: "Domaine d'études", key: "fieldOfStudy" },
        { label: "Expérience professionnelle", key: "hasExperience" },
        { label: "Détails de l'expérience", key: "experienceDetails", multiline: true },
        { label: "Compétences", key: "skills", multiline: true }
      ]);
      renderApplicationDetails("applicationMotivationDetails", candidate.applicationData, [
        { label: "Poste souhaité", key: "position" },
        { label: "Motivation", key: "motivation", multiline: true },
        { label: "Informations complémentaires", key: "additionalInfo", multiline: true }
      ]);
      setText("cvFormat", formatCandidateDocument(candidate.cvName, candidate.cvSize));
      setText("letterFormat", formatCandidateDocument(candidate.letterName, candidate.letterSize));
      configureDocumentLink("cvLink", candidate.cvUrl);
      configureDocumentLink("letterLink", candidate.letterUrl);
      updateModalButton(id);

      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      var closeButton = modal.querySelector(".close-modal");
      if (closeButton) closeButton.focus();
    }

    function selectCandidate(id) {
      if (!candidates[id] || selectedCandidates.has(id)) return;
      var button = page.querySelector('[data-select-id="' + id + '"]');
      if (button) button.disabled = true;
      var basePath = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
      fetch(basePath + "/Responsable-RH/api/candidatures/" + encodeURIComponent(id) + "/preselection", {
        method: "POST",
        headers: { Accept: "application/json" }
      }).then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok) throw new Error(body.message || "La présélection a échoué.");
          return body;
        });
      }).then(function () {
        selectedCandidates.add(id);
        updateCandidateButton(id);
        updateCounts();
        if (currentCandidateId === id) updateModalButton(id);
        var row = page.querySelector('[data-candidature-id="' + id + '"]');
        if (row) row.remove();
        filterCandidates();
        showCandidateMessage("Le candidat a été ajouté à la liste des entretiens.");
      }).catch(function (error) {
        if (button) button.disabled = false;
        window.alert(error.message);
      });
    }

    function showCandidateMessage(message) {
      var toast = page.querySelector("#candidateToast");
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      window.setTimeout(function () { toast.classList.remove("show"); }, 3000);
    }

    function filterCandidates() {
      var rows = Array.prototype.slice.call(page.querySelectorAll("#candidatesTable tr[data-candidature-id]"));
      var term = search.value.trim().toLowerCase();
      var visible = 0;

      rows.forEach(function (row) {
        var matches = (row.dataset.name + " " + row.dataset.email).toLowerCase().includes(term);
        row.hidden = !matches;
        if (matches) visible += 1;
      });

      setText("resultsCount", visible + (visible === 1 ? " candidat affiché" : " candidats affichés"));
      var emptyState = page.querySelector("#emptyState");
      if (emptyState) emptyState.style.display = visible ? "none" : "block";
    }

    if (!offerId) {
      page.dataset.candidaturesLoading = "false";
      var noOfferBody = page.querySelector("#candidatesTable");
      if (noOfferBody) noOfferBody.innerHTML = '<tr><td colspan="3">Sélectionnez une offre pour consulter ses candidatures.</td></tr>';
      setText("resultsCount", "Aucune offre sélectionnée");
      return;
    }

    if (page.dataset.candidaturesLoaded !== "true") {
      if (page.dataset.candidaturesLoading === "true") return;
      page.dataset.candidaturesLoading = "true";
      var basePath = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
      fetch(basePath + "/Responsable-RH/api/candidatures?offreId=" + encodeURIComponent(offerId), { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("Impossible de charger les candidatures.");
          return response.json();
        })
        .then(function (items) {
          var tbody = page.querySelector("#candidatesTable");
          if (!tbody || !Array.isArray(items)) throw new Error("La liste des candidatures est invalide.");
          candidates = {};
          tbody.replaceChildren();
          items.forEach(function (item) {
            var id = Number(item.id);
            var name = [item.prenom, item.nom].filter(Boolean).join(" ");
            var candidate = {
              id: id,
              name: name || "Candidat",
              initials: [item.prenom, item.nom].filter(Boolean).map(function (part) { return part.charAt(0); }).join("").toUpperCase() || "CA",
              email: item.email || "",
              phone: item.telephone || "Non renseigné",
              date: item.dateCandidature ? new Date(item.dateCandidature).toLocaleDateString("fr-FR") : "Non renseignée",
              job: item.poste || "Poste non renseigné",
              contract: item.contract || "Non renseigné",
              cvName: item.cvName || "CV non transmis",
              cvSize: item.cvSize || 0,
              cvUrl: item.cvUrl || "",
              letterName: item.lettreName || "Lettre non transmise",
              letterSize: item.lettreSize || 0,
              letterUrl: item.lettreUrl || "",
              applicationData: item.donneesCandidature || {}
            };
            candidates[id] = candidate;
            var row = document.createElement("tr");
            row.dataset.candidatureId = id;
            row.dataset.name = candidate.name;
            row.dataset.email = candidate.email;
            row.innerHTML = '<td><div class="candidate-info"><div class="candidate-avatar"></div><div><p class="candidate-name"></p><p class="candidate-email"></p></div></div></td>' +
              '<td><span class="date"></span></td><td><div class="actions"><button type="button" class="btn btn-details">Voir le dossier</button><button type="button" class="btn btn-select" data-select-id="' + id + '">Présélectionner</button></div></td>';
            row.querySelector(".candidate-avatar").textContent = candidate.initials;
            row.querySelector(".candidate-name").textContent = candidate.name;
            row.querySelector(".candidate-email").textContent = candidate.email;
            row.querySelector(".date").textContent = candidate.date;
            tbody.appendChild(row);
            updateCandidateButton(id);
            row.querySelector(".btn-details").addEventListener("click", function () { viewCandidate(id); });
            row.querySelector("[data-select-id]").addEventListener("click", function () { selectCandidate(id); });
          });
          page.dataset.candidaturesLoaded = "true";
          page.dataset.candidaturesLoading = "false";
          setText("resultsCount", items.length + (items.length === 1 ? " candidat affiché" : " candidats affichés"));
          updateCounts();
          filterCandidates();
          initCandidaturesRecues(event);
        })
        .catch(function (error) {
          page.dataset.candidaturesLoading = "false";
          var tbody = page.querySelector("#candidatesTable");
          if (tbody) tbody.innerHTML = '<tr><td colspan="3"></td></tr>';
          var messageCell = tbody && tbody.querySelector("td");
          if (messageCell) messageCell.textContent = error.message;
          setText("resultsCount", "Chargement impossible");
        });
      return;
    }

    if (page.dataset.candidatureHandlersBound !== "true") {
      page.querySelectorAll("[data-close-modal]").forEach(function (button) {
        button.addEventListener("click", closeModal);
      });
      modal.addEventListener("click", function (eventClick) {
        if (eventClick.target === modal) closeModal();
      });
      modalSelect.addEventListener("click", function () {
        if (currentCandidateId !== null) selectCandidate(currentCandidateId);
      });
      search.addEventListener("input", filterCandidates);
      page.dataset.candidatureHandlersBound = "true";
    }

    window.closeCandidateModal = closeModal;

    updateCounts();
    filterCandidates();
  }

  document.addEventListener("pageLoaded", function (event) {
    if (event.detail && event.detail.page === "candidatures-recues") {
      initCandidaturesRecues(event);
      return;
    }

    document.body.style.overflow = "";
    currentCandidateId = null;
    window.closeCandidateModal = null;
  });
  document.addEventListener("keydown", function (event) {
    if (event.key !== "Escape") return;
    var modal = document.querySelector(".applications-page #candidateModal.show");
    if (modal && window.closeCandidateModal) window.closeCandidateModal();
  });
})();

/* =========================================
   RH - Entretiens des candidats
   ========================================= */
(function () {
  "use strict";

  var interviewCandidates = {};

  var currentInterviewCandidateId = null;
  var interviewToastTimeout = null;

  function byId(id) {
    return document.getElementById(id);
  }

  window.startInterview = function(id) {
    var candidate = interviewCandidates[id];
    if (!candidate || candidate.resultat === "FAVORABLE" || candidate.resultat === "DEFAVORABLE") {
      return;
    }

    currentInterviewCandidateId = id;

    var modalAvatar = byId("interviewModalAvatar");
    var modalName = byId("interviewModalName");
    var modalEmail = byId("interviewModalEmail");
    var modalJob = byId("interviewModalJob");
    var notesArea = byId("interviewNotes");
    var modal = byId("interviewModal");

    if (modalAvatar) modalAvatar.textContent = candidate.initials;
    if (modalName) modalName.textContent = candidate.name;
    if (modalEmail) modalEmail.textContent = candidate.email;
    if (modalJob) modalJob.textContent = "Poste : " + candidate.job;
    if (notesArea) notesArea.value = candidate.notes || "";

    if (modal) {
      modal.classList.add("show");
      modal.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (notesArea) notesArea.focus();
    }
  };

  window.closeInterviewModal = function() {
    var modal = byId("interviewModal");
    if (modal) {
      modal.classList.remove("show");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }
    currentInterviewCandidateId = null;
  };

  window.closeInterviewModalOutside = function(event) {
    if (event.target.id === "interviewModal") {
      window.closeInterviewModal();
    }
  };

  window.saveInterviewNotes = function() {
    if (currentInterviewCandidateId === null) {
      return;
    }

    var candidate = interviewCandidates[currentInterviewCandidateId];
    if (!candidate) return;

    var notesArea = byId("interviewNotes");
    var notes = notesArea ? notesArea.value : "";
    postInterview("/" + encodeURIComponent(candidate.id) + "/notes", "POST", { notes: notes })
      .then(function() {
        candidate.notes = notes;
        candidate.dateEntretien = new Date().toISOString();
        showInterviewToast("Notes enregistrées pour " + candidate.name + ".");
      })
      .catch(function(error) { window.alert(error.message); });
  };

  window.makeInterviewDecision = function(decision) {
    if (currentInterviewCandidateId === null) {
      return;
    }

    var candidate = interviewCandidates[currentInterviewCandidateId];
    if (!candidate) return;

    var decisionText = decision === "accept" ? "accepter" : "refuser";

    var confirmed = window.confirm(
      "Voulez-vous vraiment " +
      decisionText +
      " " +
      candidate.name +
      " ?"
    );

    if (!confirmed) {
      return;
    }

    var notesArea = byId("interviewNotes");
    if (notesArea) {
      candidate.notes = notesArea.value;
    }

    var notes = notesArea ? notesArea.value : "";
    var result = decision === "accept" ? "FAVORABLE" : "DEFAVORABLE";
    postInterview("/" + encodeURIComponent(candidate.id) + "/decision", "PATCH", { notes: notes, resultat: result })
      .then(function() {
        candidate.notes = notes;
        candidate.resultat = result;
        candidate.statut = decision === "accept" ? "proposition" : "rejetee";
        updateInterviewCandidateRow(candidate);
        updateInterviewStatistics();
        window.closeInterviewModal();
        showInterviewToast(candidate.name + (decision === "accept" ? " a été accepté" : " a été refusé") + " à l'issue de l'entretien.");
      })
      .catch(function(error) { window.alert(error.message); });
  };

  function postInterview(suffix, method, payload) {
    var basePath = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
    return fetch(basePath + "/Responsable-RH/api/entretiens" + suffix, {
      method: method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload)
    }).then(function(response) {
      return response.json().catch(function() { return {}; }).then(function(body) {
        if (!response.ok) throw new Error(body.message || "L'enregistrement de l'entretien a échoué.");
        return body;
      });
    });
  }

  function updateInterviewCandidateRow(candidate) {
    var button = document.querySelector(
      '[data-action-id="' + candidate.id + '"]'
    );

    if (!button) {
      return;
    }

    button.disabled = true;
    button.classList.remove("btn-start");
    button.classList.add("btn-completed");

    if (candidate.resultat === "FAVORABLE") {
      button.textContent = "Candidat accepté ✓";
    } else if (candidate.resultat === "DEFAVORABLE") {
      button.textContent = "Candidat refusé";
    } else {
      button.disabled = false;
      button.classList.remove("btn-completed");
      button.classList.add("btn-start");
      button.textContent = "Reprendre l'entretien";
    }
  }

  function updateInterviewStatistics() {
    var values = Object.values(interviewCandidates || {});

    var pending = values.filter(function(candidate) {
      return !candidate.resultat || candidate.resultat === "A_REVOIR";
    }).length;

    var accepted = values.filter(function(candidate) {
      return candidate.resultat === "FAVORABLE";
    }).length;

    var rejected = values.filter(function(candidate) {
      return candidate.resultat === "DEFAVORABLE";
    }).length;

    var pendingCount = byId("pendingCount");
    var acceptedCount = byId("acceptedCount");
    var rejectedCount = byId("rejectedCount");

    if (pendingCount) pendingCount.textContent = pending;
    if (acceptedCount) acceptedCount.textContent = accepted;
    if (rejectedCount) rejectedCount.textContent = rejected;
  }

  function showInterviewToast(message) {
    var toast = byId("interviewToast");
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    if (interviewToastTimeout) {
      clearTimeout(interviewToastTimeout);
    }

    interviewToastTimeout = setTimeout(function() {
      toast.classList.remove("show");
    }, 3500);
  }

  function initEntretiens() {
    var searchInput = byId("interviewsSearchInput");
    var table = byId("interviewCandidateTable");
    var emptyState = byId("interviewsEmptyState");

    if (!table || table.dataset.loaded === "true" || table.dataset.loading === "true") return;
    table.dataset.loading = "true";
    var basePath = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
    fetch(basePath + "/Responsable-RH/api/entretiens", { headers: { Accept: "application/json" } })
      .then(function(response) {
        if (!response.ok) throw new Error("Impossible de charger les entretiens.");
        return response.json();
      })
      .then(function(items) {
        if (!Array.isArray(items)) throw new Error("La liste des entretiens est invalide.");
        interviewCandidates = {};
        table.replaceChildren();
        items.forEach(function(item) {
          var id = Number(item.id);
          var name = [item.prenom, item.nom].filter(Boolean).join(" ") || "Candidat";
          var candidate = {
            id: id,
            name: name,
            initials: [item.prenom, item.nom].filter(Boolean).map(function(part) { return part.charAt(0); }).join("").toUpperCase() || "CA",
            email: item.email || "",
            job: item.poste || "Poste non renseigné",
            notes: item.notes || "",
            resultat: item.resultat || null,
            statut: item.statut || "entretien",
            dateEntretien: item.dateEntretien || item.dateCandidature
          };
          interviewCandidates[id] = candidate;
          var row = document.createElement("tr");
          row.dataset.name = candidate.name;
          row.dataset.job = candidate.job;
          row.innerHTML = '<td><div class="candidate-info"><div class="candidate-avatar"></div><div><p class="candidate-name"></p><p class="candidate-email"></p></div></div></td>' +
            '<td><span class="job-name"></span></td><td><span class="date"></span></td><td><button type="button" class="btn btn-start" data-action-id="' + id + '"></button></td>';
          row.querySelector(".candidate-avatar").textContent = candidate.initials;
          row.querySelector(".candidate-name").textContent = candidate.name;
          row.querySelector(".candidate-email").textContent = candidate.email;
          row.querySelector(".job-name").textContent = candidate.job;
          row.querySelector(".date").textContent = candidate.dateEntretien ? new Date(candidate.dateEntretien).toLocaleDateString("fr-FR") : "En attente";
          row.querySelector("[data-action-id]").textContent = candidate.resultat === "FAVORABLE" ? "Candidat accepté ✓" : candidate.resultat === "DEFAVORABLE" ? "Candidat refusé" : "Débuter l'entretien";
          row.querySelector("[data-action-id]").disabled = candidate.resultat === "FAVORABLE" || candidate.resultat === "DEFAVORABLE";
          row.querySelector("[data-action-id]").addEventListener("click", function() { window.startInterview(id); });
          table.appendChild(row);
        });
        table.dataset.loaded = "true";
        table.dataset.loading = "false";
        updateInterviewStatistics();
        if (emptyState) emptyState.style.display = items.length ? "none" : "block";
        if (searchInput) searchInput.dispatchEvent(new Event("input"));
      })
      .catch(function(error) {
        table.dataset.loading = "false";
        table.innerHTML = "<tr><td colspan='4'></td></tr>";
        table.querySelector("td").textContent = error.message;
      });

    if (searchInput) {
      searchInput.addEventListener("input", function() {
        var term = this.value.trim().toLowerCase();
        var visible = 0;

        table.querySelectorAll("tr[data-name]").forEach(function(row) {
          var name = (row.dataset.name || "").toLowerCase();
          var job = (row.dataset.job || "").toLowerCase();
          var matches = name.includes(term) || job.includes(term);
          row.style.display = matches ? "" : "none";
          if (matches) visible++;
        });

        var emptyStateEl = byId("interviewsEmptyState");
        if (emptyStateEl) {
          emptyStateEl.style.display = visible === 0 ? "block" : "none";
        }
      });
    }

  }

  document.addEventListener("pageLoaded", function(event) {
    if (event.detail && event.detail.page === "entretiens") {
      initEntretiens();
    }
  });

  document.addEventListener("keydown", function(event) {
    if (
      event.key === "Escape" &&
      byId("interviewModal") &&
      byId("interviewModal").classList.contains("show")
    ) {
      window.closeInterviewModal();
    }
  });
})();

/* =========================================
   RH - Contrats de travail
   ========================================= */
(function () {
  "use strict";

  const ctArticleFields = [
    { id: "ctArticle1", title: "Article 1 — Poste et fonctions" },
    { id: "ctArticle2", title: "Article 2 — Durée du contrat" },
    { id: "ctArticle3", title: "Article 3 — Rémunération" },
    { id: "ctArticle4", title: "Article 4 — Horaires et lieu de travail" },
    { id: "ctArticle5", title: "Article 5 — Obligations des parties" },
    { id: "ctArticle6", title: "Article 6 — Avantages complémentaires" },
    { id: "ctArticle7", title: "Article 7 — Dispositions complémentaires" },
  ];

  let ctCandidates = [];

  function ctMakeSampleContract(name, job, type) {
    const articles = {
      ctArticle1: `Le salarié exercera les fonctions de ${job} et réalisera les missions définies par l'employeur.`,
      ctArticle2: `Le présent contrat est conclu sous la forme d'un ${type}, conformément aux règles applicables.`,
      ctArticle3: "Le salarié percevra une rémunération mensuelle de 1 200 000 Ar, versée selon les modalités applicables.",
      ctArticle4: "Le lieu de travail est Antananarivo. Les horaires sont fixés selon l'organisation de l'entreprise.",
      ctArticle5: "Les parties s'engagent à respecter leurs obligations contractuelles et les règles applicables.",
      ctArticle6: "Les avantages éventuels seront précisés par accord entre les parties.",
      ctArticle7: "Toute modification du contrat devra être convenue et formalisée selon les règles applicables.",
    };
    return {
      companyName: "Entreprise Exemple",
      companyAddress: "Antananarivo, Madagascar",
      candidateName: name,
      job,
      type,
      duration: type === "CDI" ? "Indéterminée" : "12 mois",
      startDate: "",
      location: "Antananarivo",
      salary: "1 200 000 Ar",
      hours: "40 heures par semaine",
      benefits: "À préciser",
      articles,
    };
  }

  let ctActiveCandidateId = null;
  let ctActiveResponseCandidateId = null;
  let ctActiveDecisionArticleId = null;

  function ctEsc(v) {
    return String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function ctGetCandidate(id) {
    return ctCandidates.find((c) => c.id === id);
  }

  window.ctOpenModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add("ct-open");
    document.body.style.overflow = "hidden";
  };

  window.ctCloseModal = function(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("ct-open");
    if (!document.querySelector(".ct-modal-overlay.ct-open")) {
      document.body.style.overflow = "";
    }
  };

  function ctStatusInfo(c) {
    const m = {
      preparation: ["À préparer", "ct-status-preparation"],
      sent: ["Envoyé au candidat", "ct-status-sent"],
      review: ["Réponse reçue", "ct-status-response"],
      negotiation: ["En attente de la réponse du candidat", "ct-status-pending"],
      accepted: ["Contrat accepté", "ct-status-accepted"],
      refused: ["Article refusé — négociation requise", "ct-status-refused"],
    };
    return m[c.status] || m.preparation;
  }

  function ctRenderTable() {
    const search = document.getElementById("ctSearchInput");
    const q = search ? search.value.toLowerCase() : "";
    const list = ctCandidates.filter((c) => (c.name + " " + c.job).toLowerCase().includes(q));
    const empty = document.getElementById("ctEmptyMessage");
    if (empty) empty.style.display = list.length ? "none" : "block";
    const tbody = document.getElementById("ctCandidateTable");
    if (!tbody) return;
    tbody.innerHTML = list.map((c) => {
      const s = ctStatusInfo(c);
      let buttons = "";
      if (c.status === "preparation") {
        buttons = `<button class="ct-btn ct-btn-primary" type="button" onclick="ctEditContract(${c.id})">Préparer le contrat <span aria-hidden="true">→</span></button>`;
      } else if (c.status === "sent") {
        const sentDate = c.sentAt ? new Date(c.sentAt).toLocaleDateString("fr-FR") : "";
        buttons = '<span class="ct-sent-note">Transmis' + (sentDate ? ' le ' + ctEsc(sentDate) : '') + '</span><button class="ct-btn ct-btn-outline" onclick="ctViewContract(' + c.id + ')">👁 Voir le contrat</button>';
      } else if (c.status === "review") {
        buttons = '<button class="ct-btn ct-btn-orange" onclick="ctReviewResponses(' + c.id + ')">📋 Réponse du candidat</button><button class="ct-btn ct-btn-outline" onclick="ctViewContract(' + c.id + ')">👁 Voir le contrat</button>';
      } else if (c.status === "accepted") {
        buttons = "";
      } else if (c.status === "negotiation") {
        buttons = `<button class="ct-btn ct-btn-blue" onclick="ctSimulateCandidateResponse(${c.id})">↩️ Réponse du candidat (démo)</button><button class="ct-btn ct-btn-outline" onclick="ctViewNegotiation(${c.id})">👁 Voir l'échange</button>`;
      } else {
        buttons = `<button class="ct-btn ct-btn-outline" onclick="ctViewContract(${c.id})">👁 Voir le contrat</button><button class="ct-btn ct-btn-orange" onclick="ctViewNegotiation(${c.id})">📋 Voir l'échange</button>`;
      }
      const financeValue = c.salaryAnnualApproved == null
        ? '<span class="ct-finance-missing">Non validé</span>'
        : `<strong>${ctEsc(c.salaryAnnualApprovedFormatted)} Ar</strong>`;
      return `<tr><td><strong>${ctEsc(c.name)}</strong><span class="subtext">${ctEsc(c.email)}</span></td><td>${ctEsc(c.job)}</td><td>${ctEsc(c.type)}</td><td>${financeValue}</td><td><span class="ct-badge ${s[1]}">${s[0]}</span></td><td><div class="ct-actions">${buttons}</div></td></tr>`;
    }).join("");
    const prep = document.getElementById("ct-statPreparation");
    const sent = document.getElementById("ct-statSent");
    const review = document.getElementById("ct-statReview");
    const neg = document.getElementById("ct-statNegotiation");
    if (prep) prep.textContent = ctCandidates.filter((c) => c.status === "preparation").length;
    if (sent) sent.textContent = ctCandidates.filter((c) => ["sent", "negotiation"].includes(c.status)).length;
    if (review) review.textContent = ctCandidates.filter((c) => c.status === "review").length;
    if (neg) neg.textContent = ctCandidates.filter((c) => c.status === "negotiation").length;
  }

  window.ctEditContract = function(id) {
    const c = ctGetCandidate(id);
    if (!c) return;
    ctActiveCandidateId = id;
    const map = {
      ctCompanyName: "companyName",
      ctCompanyAddress: "companyAddress",
      ctCandidateName: "candidateName",
      ctJobTitle: "job",
      ctContractType: "type",
      ctContractDuration: "duration",
      ctStartDate: "startDate",
      ctWorkLocation: "location",
      ctSalary: "salary",
      ctWorkHours: "hours",
      ctBenefits: "benefits",
    };
    for (const [el, key] of Object.entries(map || {})) {
      const node = document.getElementById(el);
      if (!node) continue;
      if (key === "type" && c.type && !Array.from(node.options).some((option) => option.value === c.type)) {
        node.add(new Option(c.type, c.type));
      }
      node.value = c.contract ? c.contract[key] : (key === "candidateName" ? c.name : key === "job" ? c.job : key === "type" ? c.type : key === "companyName" ? (c.companyName || "Entreprise") : key === "companyAddress" ? "Antananarivo, Madagascar" : key === "duration" ? (c.type === "CDI" ? "Indéterminée" : "À préciser") : key === "location" ? "Antananarivo" : key === "hours" ? "40 heures par semaine" : key === "salary" ? c.salaryMonthly : "");
    }
    ctArticleFields.forEach((a) => {
      const node = document.getElementById(a.id);
      if (node) node.value = c.contract?.articles[a.id] || "";
    });
    const financeHelp = document.getElementById("ctFinanceSalaryHelp");
    if (financeHelp) {
      if (c.salaryAnnualApproved != null) {
        const comment = c.financeComment ? " — " + c.financeComment : "";
        const budgetYear = c.financeBudgetYear ? " (budget " + c.financeBudgetYear + ")" : "";
        financeHelp.textContent = "Validé par la Finance : " + c.salaryAnnualApprovedFormatted +
          " Ar/an, soit " + c.salaryMonthly + " par mois" + budgetYear + comment;
        financeHelp.classList.add("is-approved");
      } else {
        financeHelp.textContent = "Aucune validation financière approuvée pour cette proposition. Le salaire reste à renseigner.";
        financeHelp.classList.remove("is-approved");
      }
    }
    if (!c.contract) {
      const a1 = document.getElementById("ctArticle1");
      if (a1) a1.value = `Le salarié exercera les fonctions de ${c.job} selon les missions définies par l'employeur.`;
      ctArticleFields.slice(1).forEach((a) => {
        const node = document.getElementById(a.id);
        if (node && !node.value) node.value = "Les modalités de cet article seront définies conformément aux règles applicables et aux conditions convenues entre les parties.";
      });
    }
    ctOpenModal("ctEditModal");
  };

  function ctCollectContract() {
    const c = ctGetCandidate(ctActiveCandidateId);
    const articles = {};
    ctArticleFields.forEach((a) => {
      const node = document.getElementById(a.id);
      articles[a.id] = node ? node.value.trim() : "";
    });
    return {
      companyName: (document.getElementById("ctCompanyName")?.value || "").trim(),
      companyAddress: (document.getElementById("ctCompanyAddress")?.value || "").trim(),
      candidateName: (document.getElementById("ctCandidateName")?.value || "").trim(),
      job: (document.getElementById("ctJobTitle")?.value || "").trim(),
      type: document.getElementById("ctContractType")?.value || "CDI",
      duration: (document.getElementById("ctContractDuration")?.value || "").trim(),
      startDate: document.getElementById("ctStartDate")?.value || "",
      location: (document.getElementById("ctWorkLocation")?.value || "").trim(),
      salary: (document.getElementById("ctSalary")?.value || "").trim(),
      hours: (document.getElementById("ctWorkHours")?.value || "").trim(),
      benefits: (document.getElementById("ctBenefits")?.value || "").trim(),
      articles,
      candidateEmail: c?.email || "",
    };
  }

  window.ctPreviewExistingOrEdit = function(id) {
    window.ctEditContract(id);
    setTimeout(window.ctPreviewContract, 30);
  };

  function ctRenderContractDocument(contract) {
    const el = document.getElementById("ctContractDocument");
    if (!el) return;
    const field = (label, value) => `<div class="ct-document-field"><span>${ctEsc(label)}</span><strong>${ctEsc(value || "À préciser")}</strong></div>`;
    const startDate = contract.startDate
      ? new Date(contract.startDate + "T00:00:00").toLocaleDateString("fr-FR")
      : "À préciser";
    el.innerHTML = `<h2>CONTRAT DE TRAVAIL</h2><p class="ct-document-subtitle">Document préparatoire · à relire avant impression</p><div class="ct-document-meta">${field("Employeur", contract.companyName)}${field("Adresse", contract.companyAddress)}${field("Candidat", contract.candidateName)}${field("Poste", contract.job)}${field("Type de contrat", contract.type)}${field("Durée", contract.duration)}${field("Date de début", startDate)}${field("Lieu de travail", contract.location)}${field("Rémunération mensuelle", contract.salary)}${field("Horaires", contract.hours)}${field("Avantages", contract.benefits)}</div>${ctArticleFields.map((a) => `<div class="ct-contract-article"><h3>${ctEsc(a.title)}</h3><p>${ctEsc(contract.articles[a.id] || "À préciser")}</p></div>`).join("")}<p class="ct-small-muted">Cette prévisualisation est un brouillon. Vérifiez les informations et les dispositions applicables avant signature.</p>`;
  }

  window.ctPreviewContract = function() {
    const c = ctGetCandidate(ctActiveCandidateId);
    const contract = ctCollectContract();
    if (!c) return;
    if (!contract.companyName || !contract.candidateName || !contract.job) {
      alert("Complétez au minimum l'entreprise, le candidat et le poste.");
      return;
    }
    c.contract = contract;
    c.name = contract.candidateName;
    c.job = contract.job;
    c.type = contract.type;
    ctRenderContractDocument(contract);
    ctCloseModal("ctEditModal");
    ctOpenModal("ctPreviewModal");
    ctRenderTable();
  };

  window.ctReturnToEdit = function() {
    if (ctActiveCandidateId === null) return;
    ctCloseModal("ctPreviewModal");
    ctEditContract(ctActiveCandidateId);
  };

  window.ctSendContract = function() {
    const c = ctGetCandidate(ctActiveCandidateId);
    if (!c?.contract) return;
    if (!c.contract.salary || !c.contract.startDate) {
      alert("Renseignez la rémunération mensuelle et la date de début avant l'envoi.");
      window.ctReturnToEdit();
      return;
    }
    if (!confirm("Confirmer la transmission du contrat à " + c.name + " ?")) return;
    const sendButton = document.getElementById("ctSendButton");
    if (sendButton?.dataset.sending === "true") return;
    if (sendButton) {
      sendButton.dataset.sending = "true";
      sendButton.disabled = true;
      sendButton.textContent = "Envoi en cours…";
    }
    const context = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
    fetch(context + "/Responsable-RH/api/contrats/candidatures/" + encodeURIComponent(c.id) + "/envoyer", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(c.contract),
    }).then((response) => response.json().catch(() => ({})).then((body) => {
      if (!response.ok) throw new Error(body.message || "Le contrat n'a pas pu être transmis.");
      return body;
    })).then((body) => {
      c.status = body.status === "ENVOYE_CANDIDAT" ? "sent" : c.status;
      c.sentAt = new Date().toISOString();
      ctCloseModal("ctPreviewModal");
      ctCloseModal("ctEditModal");
      ctRenderTable();
      window.prompt("Contrat transmis. Copiez ce lien sécurisé et envoyez-le au candidat :", body.accessUrl || "");
    }).catch((error) => {
      if (sendButton) {
        sendButton.dataset.sending = "false";
        sendButton.disabled = false;
        sendButton.innerHTML = 'Envoyer au candidat <span aria-hidden="true">→</span>';
      }
      alert(error.message);
    });
  };

  window.ctViewContract = function(id) {
    const c = ctGetCandidate(id);
    if (!c?.contract) {
      alert("Le contenu du contrat n'est pas disponible pour ce candidat.");
      return;
    }
    ctRenderContractDocument(c.contract);
    document.getElementById("ctInfoTitle").textContent = "Contrat — " + c.name;
    document.getElementById("ctInfoContent").innerHTML = `<div class="ct-contract-document">${document.getElementById("ctContractDocument").innerHTML}</div>`;
    ctOpenModal("ctInfoModal");
  };

  window.ctSimulateCandidateResponse = function(id) {
    const c = ctGetCandidate(id);
    if (!c?.contract) return;
    ctActiveResponseCandidateId = id;
    const isNegotiation = c.status === "negotiation";
    document.getElementById("ctCandidateModalTitle").textContent = isNegotiation ? "Réponse à la proposition de la RH" : "Espace candidat — Contrat";
    document.getElementById("ctCandidateViewName").textContent = "Bonjour " + c.name + " !";
    document.getElementById("ctCandidateGeneralComment").value = "";
    document.getElementById("ctCandidateConfirm").checked = false;
    const previous = c.responses?.articles || {};
    document.getElementById("ctCandidateArticles").innerHTML = ctArticleFields.map((a, i) => {
      const p = previous[a.id] || {};
      const negotiation = c.negotiation?.articleId === a.id && isNegotiation;
      let articleText = c.contract.articles[a.id];
      if (negotiation) articleText = c.negotiation.hrDecision === "accept" ? c.negotiation.finalText : c.negotiation.alternativeText;
      const choice = p.choice || "";
      const comment = p.comment || "";
      return `<section class="ct-candidate-article"><div class="ct-candidate-article-header"><h3>${ctEsc(a.title)}</h3><span class="ct-small-muted">Article ${i + 1} sur ${ctArticleFields.length}</span></div><div class="ct-candidate-article-content"><p>${ctEsc(articleText)}</p>${negotiation ? `<div class="ct-proposal-box"><strong>Message de la RH :</strong><br>${ctEsc(c.negotiation.hrComment || "Veuillez examiner la proposition mise à jour.")}</div>` : ""}<div class="ct-article-response"><label>${negotiation ? "Votre réponse à la proposition de la RH" : "Votre réponse à cet article"}</label><div class="ct-radio-options"><label class="ct-radio-option"><input type="radio" name="ct_choice_${a.id}" value="accepted" ${choice === "accepted" ? "checked" : ""} onchange="ctUpdateArticleFields('${a.id}')"> ✅ Accepter</label><label class="ct-radio-option"><input type="radio" name="ct_choice_${a.id}" value="refused" ${choice === "refused" ? "checked" : ""} onchange="ctUpdateArticleFields('${a.id}')"> ❌ Refuser</label><label class="ct-radio-option"><input type="radio" name="ct_choice_${a.id}" value="modify" ${choice === "modify" ? "checked" : ""} onchange="ctUpdateArticleFields('${a.id}')"> ✏️ Compléter / modifier</label></div><div id="ct_commentBox_${a.id}" style="${choice === "refused" || choice === "modify" ? "" : "display:none"}"><label style="display:block;margin-top:13px;font-size:12px;font-weight:bold;color:#14213d" id="ct_commentLabel_${a.id}">${choice === "refused" ? "Expliquez votre refus (obligatoire)" : "Précisez la modification souhaitée (obligatoire)"}</label><textarea id="ct_comment_${a.id}" placeholder="Expliquez votre réponse...">${ctEsc(comment)}</textarea></div></div></div></section>`;
    }).join("");
    if (isNegotiation) {
      ctArticleFields.forEach((a) => {
        if (a.id !== c.negotiation.articleId) {
          document.querySelectorAll(`input[name="ct_choice_${a.id}"]`).forEach((x) => (x.disabled = true));
        }
      });
      document.querySelectorAll("#ctCandidateArticles .ct-candidate-article").forEach((el, index) => {
        if (ctArticleFields[index].id !== c.negotiation.articleId) el.style.opacity = ".65";
      });
    }
    ctOpenModal("ctCandidateResponseModal");
  };

  window.ctUpdateArticleFields = function(id) {
    const selected = document.querySelector(`input[name="ct_choice_${id}"]:checked`);
    if (!selected) return;
    const box = document.getElementById("ct_commentBox_" + id);
    const label = document.getElementById("ct_commentLabel_" + id);
    const ta = document.getElementById("ct_comment_" + id);
    if (box) box.style.display = ["refused", "modify"].includes(selected.value) ? "block" : "none";
    if (label) label.textContent = selected.value === "refused" ? "Expliquez votre refus (obligatoire)" : "Précisez la modification souhaitée (obligatoire)";
    if (ta) ta.placeholder = selected.value === "refused" ? "Expliquez pourquoi vous refusez cet article..." : "Indiquez la formulation ou la condition souhaitée...";
  };

  window.ctSubmitCandidateResponses = function() {
    const c = ctGetCandidate(ctActiveResponseCandidateId);
    if (!c) return;
    if (!document.getElementById("ctCandidateConfirm")?.checked) {
      alert("Veuillez confirmer que vous avez examiné les articles.");
      return;
    }
    const isNegotiation = c.status === "negotiation";
    const responses = isNegotiation ? { ...(c.responses?.articles || {}) } : {};
    const missing = [];
    const targetArticles = isNegotiation ? [ctArticleFields.find((a) => a.id === c.negotiation.articleId)] : ctArticleFields;
    targetArticles.forEach((a) => {
      if (!a) return;
      const selected = document.querySelector(`input[name="ct_choice_${a.id}"]:checked`);
      if (!selected) { missing.push(a.title); return; }
      const ta = document.getElementById("ct_comment_" + a.id);
      const comment = ta ? ta.value.trim() : "";
      if (["refused", "modify"].includes(selected.value) && !comment) { missing.push(a.title + " — raison ou proposition obligatoire"); return; }
      responses[a.id] = { title: a.title, choice: selected.value, comment };
    });
    if (missing.length) { alert("Veuillez compléter :\n\n" + missing.join("\n")); return; }
    if (isNegotiation) {
      const aId = c.negotiation.articleId;
      const r = responses[aId];
      if (r.choice === "accepted") {
        c.contract.articles[aId] = c.negotiation.hrDecision === "accept" ? c.negotiation.finalText : c.negotiation.alternativeText;
        c.responses.articles[aId] = { title: r.title, choice: "accepted", comment: "Le candidat a accepté la dernière proposition de la RH." };
        c.status = "accepted";
        if (!c.negotiation.history) c.negotiation.history = [];
        c.negotiation.history.push({ by: "Candidat", decision: "A accepté la proposition de la RH.", date: new Date().toLocaleString("fr-FR") });
      } else {
        c.responses.articles[aId] = r;
        c.status = "review";
        if (!c.negotiation.history) c.negotiation.history = [];
        c.negotiation.history.push({ by: "Candidat", decision: r.choice === "refused" ? "A refusé la proposition de la RH" : "A proposé une nouvelle modification", comment: r.comment, date: new Date().toLocaleString("fr-FR") });
      }
    } else {
      const values = Object.values(responses || {});
      const hasRefusal = values.some((r) => r.choice === "refused" || r.choice === "modify");
      c.responses = {
        articles: responses,
        generalComment: document.getElementById("ctCandidateGeneralComment")?.value.trim() || "",
        submittedAt: new Date().toLocaleString("fr-FR"),
        status: hasRefusal ? "refused" : "accepted",
      };
      c.status = hasRefusal ? "review" : "accepted";
    }
    ctCloseModal("ctCandidateResponseModal");
    ctRenderTable();
    alert("Réponses envoyées à la RH (démo).");
  };

  window.ctReviewResponses = function(id) {
    const c = ctGetCandidate(id);
    if (!c?.responses) return;
    const articles = c.responses.articles || {};
    const content = document.getElementById("ctReviewContent");
    let html = `<div class="ct-response-summary"><h4>${ctEsc(c.name)} — ${ctEsc(c.job)}</h4><p class="ct-small-muted">Réponse reçue le : ${ctEsc(c.responses.submittedAt || "-")}</p>${c.responses.generalComment ? `<p style="margin-top:10px;font-size:13px"><strong>Commentaire général :</strong><br>${ctEsc(c.responses.generalComment)}</p>` : ""}</div>`;
    Object.entries(articles || {}).forEach(([articleId, r]) => {
      const label = ctArticleFields.find((a) => a.id === articleId)?.title || articleId;
      const choiceMap = { accepted: "Accepté", accept: "Accepté", refused: "Refusé", refuse: "Refusé", modify: "Modification proposée" };
      const choiceLabel = choiceMap[r.choice] || "Réponse enregistrée";
      html += `<div style="margin-bottom:18px"><strong style="color:#14213d">${ctEsc(label)}</strong><p style="margin:8px 0;font-size:13px"><span class="ct-badge ${["accepted", "accept"].includes(r.choice) ? "ct-status-accepted" : ["refused", "refuse"].includes(r.choice) ? "ct-status-refused" : "ct-status-response"}">${ctEsc(choiceLabel)}</span></p>${r.comment ? `<div class="ct-proposal-box">${ctEsc(r.comment)}</div>` : ""}</div>`;
    });
    if (content) content.innerHTML = html;
    ctOpenModal("ctReviewModal");
  };

  window.ctHireCandidate = function(id) {
    const context = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
    if (!confirm("Confirmer l’embauche de ce candidat ?")) return;
    fetch(context + "/Responsable-RH/api/contrats/candidatures/" + encodeURIComponent(id) + "/embaucher", {
      method: "POST",
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "L’embauche n’a pas pu être enregistrée.");
      return body;
    }).then((body) => {
      ctCandidates = ctCandidates.filter((candidate) => candidate.id !== Number(id));
      ctRenderTable();
      alert(body.message || "Le candidat a été embauché.");
    }).catch((error) => alert(error.message));
  };

  window.ctOpenDecisionModal = function(id, articleId) {
    const c = ctGetCandidate(id);
    if (!c) return;
    ctActiveCandidateId = id;
    ctActiveDecisionArticleId = articleId;
    const r = c.responses?.articles?.[articleId] || {};
    document.getElementById("ctDecisionIntro").textContent = `Répondre à la proposition du candidat concernant : ${r.title || articleId}`;
    document.getElementById("ctDecisionProposal").innerHTML = `<strong>Proposition du candidat :</strong><br>${ctEsc(r.comment || "-")}`;
    document.getElementById("ctAcceptedText").value = r.comment || "";
    document.getElementById("ctAlternativeText").value = "";
    document.getElementById("ctHrComment").value = "";
    document.querySelectorAll('input[name="ctHrDecision"]').forEach((x, i) => { x.checked = i === 0; });
    ctToggleDecisionFields();
    ctCloseModal("ctReviewModal");
    ctOpenModal("ctDecisionModal");
  };

  window.ctToggleDecisionFields = function() {
    const val = document.querySelector('input[name="ctHrDecision"]:checked')?.value;
    const acc = document.getElementById("ctAcceptedTextGroup");
    const rej = document.getElementById("ctRejectedTextGroup");
    if (acc) acc.style.display = val === "accept" ? "block" : "none";
    if (rej) rej.style.display = val === "reject" ? "block" : "none";
  };

  window.ctSendHRDecision = function() {
    const c = ctGetCandidate(ctActiveCandidateId);
    if (!c || !ctActiveDecisionArticleId) return;
    const val = document.querySelector('input[name="ctHrDecision"]:checked')?.value;
    if (!c.negotiation) c.negotiation = { articleId: ctActiveDecisionArticleId, history: [] };
    c.negotiation.articleId = ctActiveDecisionArticleId;
    c.negotiation.hrDecision = val;
    c.negotiation.finalText = document.getElementById("ctAcceptedText")?.value || "";
    c.negotiation.alternativeText = document.getElementById("ctAlternativeText")?.value || "";
    c.negotiation.hrComment = document.getElementById("ctHrComment")?.value || "";
    if (!c.negotiation.history) c.negotiation.history = [];
    c.negotiation.history.push({ by: "RH", decision: val === "accept" ? "A accepté la proposition du candidat" : "A proposé une alternative", comment: c.negotiation.hrComment, date: new Date().toLocaleString("fr-FR") });
    c.status = "negotiation";
    ctCloseModal("ctDecisionModal");
    ctRenderTable();
    alert("Réponse envoyée au candidat (démo).");
  };

  window.ctViewNegotiation = function(id) {
    const c = ctGetCandidate(id);
    if (!c) return;
    let html = `<div class="ct-response-summary"><h4>${ctEsc(c.name)} — ${ctEsc(c.job)}</h4></div>`;
    if (c.negotiation?.history) {
      c.negotiation.history.forEach((h) => {
        html += `<div style="border-bottom:1px solid #eee;padding:12px 0"><strong>${ctEsc(h.by)}</strong> — <span class="ct-small-muted">${ctEsc(h.date)}</span><p style="margin-top:6px;font-size:13px">${ctEsc(h.decision)}</p>${h.comment ? `<div class="ct-proposal-box">${ctEsc(h.comment)}</div>` : ""}</div>`;
      });
    } else {
      html += `<p class="ct-small-muted">Aucun échange enregistré.</p>`;
    }
    document.getElementById("ctInfoTitle").textContent = "Échange contrat — " + c.name;
    document.getElementById("ctInfoContent").innerHTML = html;
    ctOpenModal("ctInfoModal");
  };

  function ctInit() {
    const search = document.getElementById("ctSearchInput");
    if (search) search.addEventListener("input", ctRenderTable);
    const tbody = document.getElementById("ctCandidateTable");
    if (!tbody || tbody.dataset.loading === "true" || tbody.dataset.loaded === "true") return;
    tbody.dataset.loading = "true";
    tbody.innerHTML = '<tr><td colspan="6" class="ct-loading-cell">Chargement des candidats acceptés…</td></tr>';
    const context = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
    fetch(context + "/Responsable-RH/api/contrats/candidats-acceptes", { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error("Impossible de charger les candidats acceptés.");
        return response.json();
      })
      .then((items) => {
        if (!Array.isArray(items)) throw new Error("La liste des candidats acceptés est invalide.");
        ctCandidates = items.map((item) => {
          let contractData = null;
          if (item.contractData) {
            try {
              contractData = typeof item.contractData === "string" ? JSON.parse(item.contractData) : item.contractData;
            } catch (error) {
              console.warn("Contrat illisible pour la candidature", item.id, error);
            }
          }
          let candidateResponses = null;
          if (item.candidateResponseData) {
            try {
              candidateResponses = typeof item.candidateResponseData === "string"
                ? JSON.parse(item.candidateResponseData)
                : item.candidateResponseData;
            } catch (error) {
              console.warn("Réponse de candidat illisible pour la candidature", item.id, error);
            }
          }
          const responseReceived = Boolean(candidateResponses) || item.contractStatus === "REPONSE_RECUE";
          if (!candidateResponses && responseReceived) candidateResponses = { articles: {} };
          const allArticlesAccepted = ["ctArticle1", "ctArticle2", "ctArticle3", "ctArticle4", "ctArticle5", "ctArticle6", "ctArticle7"]
            .every((article) => candidateResponses?.articles?.[article]?.choice === "accepted");
          return {
            id: Number(item.id),
            name: [item.prenom, item.nom].filter(Boolean).join(" ") || "Candidat",
            email: item.email || "",
            job: item.poste || "Poste non renseigné",
            type: item.contractType || "CDI",
            companyName: item.companyName || "Entreprise",
            salaryAnnualApproved: item.salaryAnnualApproved == null ? null : Number(item.salaryAnnualApproved),
            salaryAnnualApprovedFormatted: item.salaryAnnualApproved == null ? "" : new Intl.NumberFormat("fr-FR").format(Number(item.salaryAnnualApproved)),
            salaryMonthly: item.salaryMonthlyApproved == null ? "" : new Intl.NumberFormat("fr-FR").format(Number(item.salaryMonthlyApproved)) + " Ar",
            financeComment: item.financeComment || "",
            financeDecisionDate: item.financeDecisionDate || null,
            financeBudgetYear: item.financeBudgetYear || null,
            status: allArticlesAccepted ? "accepted" : responseReceived ? "review" : item.contractStatus === "ENVOYE_CANDIDAT" ? "sent" : "preparation",
            sentAt: item.contractSentAt || null,
            responses: candidateResponses ? {
              ...candidateResponses,
              submittedAt: candidateResponses.submittedAt || item.candidateResponseAt || null,
            } : null,
            contract: contractData,
            negotiation: null,
          };
        });
        tbody.dataset.loading = "false";
        tbody.dataset.loaded = "true";
        ctRenderTable();
      })
      .catch((error) => {
        tbody.dataset.loading = "false";
        tbody.innerHTML = `<tr><td colspan="6">${ctEsc(error.message)}</td></tr>`;
      });
  }

  document.addEventListener("pageLoaded", function(event) {
    if (event.detail && event.detail.page === "contrats-travail") {
      ctInit();
    }
  });
  if (document.readyState !== "loading") {
    if (window.location.hash.includes("page=contrats-travail")) ctInit();
  } else {
    document.addEventListener("DOMContentLoaded", function() {
      if (window.location.hash.includes("page=contrats-travail")) ctInit();
    });
  }
})();

/* =========================================
   CANDIDAT - Espace contrat
   ========================================= */
(function () {
  "use strict";

  const ctCandData = {
    id: "CAND-003",
    name: "Randria Hery",
    email: "hery@example.com",
    job: "Comptable",
    type: "CDI",
    company: "Entreprise Exemple",
    companyAddress: "Antananarivo, Madagascar",
    duration: "Indéterminée",
    startDate: "À convenir",
    location: "Antananarivo",
    salary: "1 200 000 Ar par mois",
    hours: "40 heures par semaine",
    hrMessage: "La RH a pris connaissance de votre demande concernant la rémunération. Merci de confirmer si vous acceptez la nouvelle proposition ou si vous souhaitez encore la discuter.",
    articles: [
      { id: "ctArticle1", title: "Article 1 — Poste et fonctions", text: "Le salarié exercera les fonctions de Comptable et réalisera les missions définies par l'employeur." },
      { id: "ctArticle2", title: "Article 2 — Durée du contrat", text: "Le présent contrat est proposé sous la forme d'un CDI, sous réserve des dispositions légales applicables." },
      { id: "ctArticle3", title: "Article 3 — Rémunération", text: "Le salarié percevra une rémunération mensuelle de 1 200 000 Ar, versée selon les modalités applicables.", hrProposal: "La RH propose de maintenir la rémunération mensuelle à 1 300 000 Ar. Cette proposition reste à confirmer par le candidat." },
      { id: "ctArticle4", title: "Article 4 — Horaires et lieu de travail", text: "Le lieu de travail est Antananarivo. Les horaires sont fixés selon l'organisation de l'entreprise." },
      { id: "ctArticle5", title: "Article 5 — Obligations des parties", text: "Les parties s'engagent à respecter leurs obligations contractuelles et les règles applicables." },
      { id: "ctArticle6", title: "Article 6 — Avantages complémentaires", text: "Les avantages éventuels seront précisés par accord entre les parties." },
      { id: "ctArticle7", title: "Article 7 — Dispositions complémentaires", text: "Toute modification du contrat devra être convenue et formalisée selon les règles applicables." }
    ]
  };

  const ctCandChoices = { accept: "Accepter", refuse: "Refuser", modify: "Compléter / proposer une modification" };
  let ctCandSubmittedPayload = null;
  let ctCandToastTimer = null;

  function ctCandEsc(v) {
    return String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function ctCandStorageKey() { return "candidate_contract_draft_" + ctCandData.id; }
  function ctCandResponseKey() { return "candidate_contract_response_" + ctCandData.id; }

  function ctCandInit() {
    const nameHeading = document.getElementById("ctCandNameHeading");
    const jobValue = document.getElementById("ctCandJobValue");
    const typeValue = document.getElementById("ctCandTypeValue");
    if (nameHeading) nameHeading.textContent = ctCandData.name;
    if (jobValue) jobValue.textContent = ctCandData.job;
    if (typeValue) typeValue.textContent = ctCandData.type;

    const messageBox = document.getElementById("ctCandHrMessageBox");
    if (messageBox && ctCandData.hrMessage) {
      messageBox.style.display = "block";
      messageBox.innerHTML = "<strong>Message de l’équipe RH</strong><br>" + ctCandEsc(ctCandData.hrMessage);
    }

    const container = document.getElementById("ctCandArticlesContainer");
    if (!container) return;

    container.innerHTML = ctCandData.articles.map((a, i) => `
      <section class="ct-cand-article" id="ctCandCard_${a.id}">
        <div class="ct-cand-article-head"><h3>${ctCandEsc(a.title)}</h3><span class="ct-cand-article-number">Article ${i + 1} / ${ctCandData.articles.length}</span></div>
        <div class="ct-cand-article-body">
          ${a.hrProposal ? `<div class="ct-cand-previous-proposal"><strong>Nouvelle proposition de la RH</strong><br>${ctCandEsc(a.hrProposal)}</div>` : ""}
          <p class="ct-cand-article-text">${ctCandEsc(a.text)}</p>
          <div class="ct-cand-article-response">
            <label>Votre réponse à cet article</label>
            <div class="ct-cand-options">
              <label class="ct-cand-option"><input type="radio" name="ctCand_choice_${a.id}" value="accept" onchange="ctCandChoiceChanged('${a.id}')"><span><strong>✅ Accepter</strong><br><small>Je suis d'accord avec cet article.</small></span></label>
              <label class="ct-cand-option"><input type="radio" name="ctCand_choice_${a.id}" value="refuse" onchange="ctCandChoiceChanged('${a.id}')"><span><strong>❌ Refuser</strong><br><small>Je ne suis pas d'accord et j'explique pourquoi.</small></span></label>
              <label class="ct-cand-option"><input type="radio" name="ctCand_choice_${a.id}" value="modify" onchange="ctCandChoiceChanged('${a.id}')"><span><strong>✏️ Compléter / modifier</strong><br><small>Je propose une autre formulation.</small></span></label>
            </div>
            <div class="ct-cand-comment-wrap" id="ctCandCommentWrap_${a.id}" style="display:none">
              <label id="ctCandCommentLabel_${a.id}" for="ctCandComment_${a.id}">Expliquez votre réponse</label>
              <textarea id="ctCandComment_${a.id}" placeholder="Expliquez votre refus ou votre proposition..."></textarea>
              <div class="ct-cand-article-hint">Ce commentaire sera transmis à l'équipe RH avec votre réponse.</div>
            </div>
            <span class="ct-cand-article-state" id="ctCandState_${a.id}">En attente de votre réponse</span>
          </div>
        </div>
      </section>
    `).join("");

    const saved = localStorage.getItem(ctCandStorageKey());
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        ctCandData.articles.forEach(a => {
          const r = draft.articles?.[a.id];
          if (r) {
            const radio = document.querySelector(`input[name="ctCand_choice_${a.id}"][value="${r.choice}"]`);
            if (radio) {
              radio.checked = true;
              ctCandChoiceChanged(a.id);
              const ta = document.getElementById("ctCandComment_" + a.id);
              if (ta) ta.value = r.comment || "";
            }
          }
        });
        const gen = document.getElementById("ctCandGeneralComment");
        if (gen) gen.value = draft.generalComment || "";
      } catch (e) {}
    }
    ctCandUpdateProgress();
  }

  window.ctCandChoiceChanged = function(id) {
    const choice = document.querySelector(`input[name="ctCand_choice_${id}"]:checked`)?.value;
    const wrap = document.getElementById("ctCandCommentWrap_" + id);
    const label = document.getElementById("ctCandCommentLabel_" + id);
    const area = document.getElementById("ctCandComment_" + id);
    const state = document.getElementById("ctCandState_" + id);
    if (!wrap || !state) return;
    if (choice === "refuse" || choice === "modify") {
      wrap.style.display = "block";
      if (label) label.textContent = choice === "refuse" ? "Pourquoi refusez-vous cet article ? (obligatoire)" : "Quelle modification ou quel complément proposez-vous ? (obligatoire)";
      if (area) area.placeholder = choice === "refuse" ? "Expliquez précisément la raison de votre refus..." : "Décrivez la formulation ou la condition que vous proposez...";
    } else {
      wrap.style.display = "none";
    }
    state.textContent = choice ? ctCandChoices[choice] : "En attente de votre réponse";
    ctCandUpdateProgress();
    ctCandSaveDraft();
  };

  function ctCandCollectResponses(validate) {
    const responses = {};
    const missing = [];
    ctCandData.articles.forEach(a => {
      const choice = document.querySelector(`input[name="ctCand_choice_${a.id}"]:checked`)?.value;
      const commentEl = document.getElementById("ctCandComment_" + a.id);
      const comment = (commentEl?.value || "").trim();
      if (!choice) { missing.push(a.title + ": choisissez une réponse."); return; }
      if ((choice === "refuse" || choice === "modify") && !comment) { missing.push(a.title + ": veuillez expliquer votre refus ou votre proposition."); return; }
      responses[a.id] = { article: a.title, choice, label: ctCandChoices[choice], comment };
    });
    if (validate && missing.length) {
      ctCandShowToast(missing[0]);
      const target = missing[0].split(":")[0];
      const a = ctCandData.articles.find(x => x.title === target);
      if (a) document.getElementById("ctCandCard_" + a.id)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return null;
    }
    return {
      candidate: { id: ctCandData.id, name: ctCandData.name, email: ctCandData.email, job: ctCandData.job },
      contract: { company: ctCandData.company, type: ctCandData.type, duration: ctCandData.duration, startDate: ctCandData.startDate, location: ctCandData.location, salary: ctCandData.salary, hours: ctCandData.hours },
      articles: responses,
      generalComment: document.getElementById("ctCandGeneralComment")?.value.trim() || ""
    };
  }

  function ctCandUpdateProgress() {
    let count = 0;
    ctCandData.articles.forEach(a => {
      if (document.querySelector(`input[name="ctCand_choice_${a.id}"]:checked`)) count++;
    });
    const label = document.getElementById("ctCandProgressLabel");
    if (label) label.textContent = count + " / " + ctCandData.articles.length + " réponses";
  }

  function ctCandSaveDraft() {
    const payload = ctCandCollectResponses(false);
    if (payload) localStorage.setItem(ctCandStorageKey(), JSON.stringify(payload));
  }

  window.ctCandPreviewResponses = function() {
    const payload = ctCandCollectResponses(true);
    if (!payload) return;
    const content = document.getElementById("ctCandPreviewContent");
    if (content) {
      content.innerHTML = ctCandData.articles.map(a => {
        const r = payload.articles[a.id];
        return `<div style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px"><strong>${ctCandEsc(a.title)}</strong><br><span class="ct-cand-status-pill">${ctCandEsc(r.label)}</span>${r.comment ? `<p style="margin:7px 0 0;color:#555">${ctCandEsc(r.comment)}</p>` : ""}</div>`;
      }).join("");
    }
    document.getElementById("ctCandPreviewModal")?.classList.add("ct-show");
  };

  window.ctCandClosePreview = function() {
    document.getElementById("ctCandPreviewModal")?.classList.remove("ct-show");
  };

  window.ctCandSubmitResponses = function() {
    if (!document.getElementById("ctCandConfirmRead")?.checked) {
      ctCandShowToast("Veuillez confirmer que vous avez lu les articles.");
      return;
    }
    const payload = ctCandCollectResponses(true);
    if (!payload) return;
    payload.submittedAt = new Date().toISOString();
    payload.submittedAtDisplay = new Date().toLocaleString("fr-FR");
    payload.status = "Réponses envoyées";
    payload.source = "espace-candidat-contrat.html";
    ctCandSubmittedPayload = payload;
    localStorage.setItem(ctCandResponseKey(), JSON.stringify(payload));
    localStorage.removeItem(ctCandStorageKey());

    const articles = payload.articles || {};
    const accepted = Object.values(articles).filter(r => r.choice === "accept").length;
    const refused = Object.values(articles).filter(r => r.choice === "refuse").length;
    const modified = Object.values(articles).filter(r => r.choice === "modify").length;

    const submittedText = document.getElementById("ctCandSubmittedText");
    if (submittedText) submittedText.textContent = `Votre réponse a été préparée le ${payload.submittedAtDisplay}. Voici le récapitulatif de vos choix.`;
    const summary = document.getElementById("ctCandSubmittedSummary");
    if (summary) {
      summary.innerHTML = `<div class="ct-cand-meta"><div class="ct-cand-meta-item"><span>Articles acceptés</span><strong>${accepted}</strong></div><div class="ct-cand-meta-item"><span>Articles refusés</span><strong>${refused}</strong></div><div class="ct-cand-meta-item"><span>Modifications demandées</span><strong>${modified}</strong></div></div>` + ctCandData.articles.map(a => {
        const r = payload.articles[a.id];
        return `<div style="padding:12px 0;border-bottom:1px solid #eee;font-size:13px"><strong>${ctCandEsc(a.title)}</strong><br>${ctCandEsc(r.label)}${r.comment ? `<p style="margin-top:5px;color:#626875">${ctCandEsc(r.comment)}</p>` : ""}</div>`;
      }).join("") + (payload.generalComment ? `<p style="margin-top:15px"><strong>Commentaire général :</strong><br>${ctCandEsc(payload.generalComment)}</p>` : "");
    }

    document.getElementById("ctCandFormView").style.display = "none";
    document.getElementById("ctCandSubmittedView")?.classList.add("ct-show");
    document.getElementById("ctCandStatusValue").textContent = "Réponses préparées";
    window.scrollTo({ top: 0, behavior: "smooth" });
    ctCandDownloadResponse();
  };

  window.ctCandDownloadResponse = function() {
    if (!ctCandSubmittedPayload) {
      const raw = localStorage.getItem(ctCandResponseKey());
      if (raw) ctCandSubmittedPayload = JSON.parse(raw);
    }
    if (!ctCandSubmittedPayload) { ctCandShowToast("Aucune réponse à télécharger."); return; }
    const blob = new Blob([JSON.stringify(ctCandSubmittedPayload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reponse-contrat-${ctCandData.id.toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    ctCandShowToast("Le récapitulatif JSON a été téléchargé.");
  };

  function ctCandShowToast(message) {
    const toast = document.getElementById("ctCandToast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("ct-show");
    clearTimeout(ctCandToastTimer);
    ctCandToastTimer = setTimeout(() => toast.classList.remove("ct-show"), 4000);
  }

  document.addEventListener("click", function(e) {
    if (e.target.id === "ctCandPreviewModal") ctCandClosePreview();
  });

  document.addEventListener("pageLoaded", function(event) {
    if (event.detail && event.detail.page === "espace-candidat-contrat") {
      ctCandInit();
    }
  });

  if (document.readyState !== "loading") {
    if (window.location.hash.includes("page=espace-candidat-contrat")) ctCandInit();
  } else {
    document.addEventListener("DOMContentLoaded", function() {
      if (window.location.hash.includes("page=espace-candidat-contrat")) ctCandInit();
    });
  }
})();

/* =========================================
   CANDIDAT - Espace contrat (init for standalone)
   ========================================= */

(function () {
  "use strict";

  function initStandalone() {
    if (typeof window.ctCandInit === "function") {
      window.ctCandInit();
    }
  }

  if (document.readyState !== "loading") {
    initStandalone();
  } else {
    document.addEventListener("DOMContentLoaded", initStandalone);
  }
})();


/* =========================================
   CANDIDAT - Espace contrat de travail (standalone)
   ========================================= */

(function () {
  "use strict";

  function initStandalone() {
    if (typeof window.ctCandInit === "function") {
      window.ctCandInit();
    } else if (typeof init === "function") {
      // from inline script
      init();
    }
  }

  if (document.readyState !== "loading") {
    initStandalone();
  } else {
    document.addEventListener("DOMContentLoaded", initStandalone);
  }
})();


/* =========================================
   CANDIDAT - Espace contrat de travail (logic)
   ========================================= */

const candidate = {
  id: "CAND-003",
  name: "Randria Hery",
  email: "hery@example.com",
  job: "Comptable",
  type: "CDI",
  company: "Entreprise Exemple",
  companyAddress: "Antananarivo, Madagascar",
  duration: "Indéterminée",
  startDate: "À convenir",
  location: "Antananarivo",
  salary: "1 200 000 Ar par mois",
  hours: "40 heures par semaine",
  hrMessage: "La RH a pris connaissance de votre demande concernant la rémunération. Merci de confirmer si vous acceptez la nouvelle proposition ou si vous souhaitez encore la discuter.",
  articles: [
    {id:"article1",title:"Article 1 — Poste et fonctions",text:"Le salarié exercera les fonctions de Comptable et réalisera les missions définies par l'employeur."},
    {id:"article2",title:"Article 2 — Durée du contrat",text:"Le présent contrat est proposé sous la forme d'un CDI, sous réserve des dispositions légales applicables."},
    {id:"article3",title:"Article 3 — Rémunération",text:"Le salarié percevra une rémunération mensuelle de 1 200 000 Ar, versée selon les modalités applicables.",hrProposal:"La RH propose de maintenir la rémunération mensuelle à 1 300 000 Ar. Cette proposition reste à confirmer par le candidat."},
    {id:"article4",title:"Article 4 — Horaires et lieu de travail",text:"Le lieu de travail est Antananarivo. Les horaires sont fixés selon l'organisation de l'entreprise."},
    {id:"article5",title:"Article 5 — Obligations des parties",text:"Les parties s'engagent à respecter leurs obligations contractuelles et les règles applicables."},
    {id:"article6",title:"Article 6 — Avantages complémentaires",text:"Les avantages éventuels seront précisés par accord entre les parties."},
    {id:"article7",title:"Article 7 — Dispositions complémentaires",text:"Toute modification du contrat devra être convenue et formalisée selon les règles applicables."}
  ]
};
let submittedPayload = null;
const choices = {accept:"Accepter",refuse:"Refuser",modify:"Compléter / proposer une modification"};
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function init(){
 if(!document.getElementById('candidateNameHeading')) return;
 document.getElementById('candidateNameHeading').textContent=candidate.name;
 document.getElementById('jobValue').textContent=candidate.job;
 document.getElementById('typeValue').textContent=candidate.type;
 const messageBox=document.getElementById('hrMessageBox');
 if(candidate.hrMessage && messageBox){messageBox.style.display='block';messageBox.innerHTML='<strong>Message de l’équipe RH</strong><br>'+esc(candidate.hrMessage);}
 const articlesContainer = document.getElementById('articlesContainer');
 if(articlesContainer){
   articlesContainer.innerHTML=candidate.articles.map((a,i)=>`
  <section class="article" id="card_${a.id}">
   <div class="article-head"><h3>${esc(a.title)}</h3><span class="article-number">Article ${i+1} / ${candidate.articles.length}</span></div>
   <div class="article-body">
    ${a.hrProposal?`<div class="previous-proposal"><strong>Nouvelle proposition de la RH</strong>${esc(a.hrProposal)}</div>`:''}
    <p class="article-text">${esc(a.text)}</p>
    <div class="article-response"><label>Votre réponse à cet article</label>
     <div class="options">
      <label class="option"><input type="radio" name="choice_${a.id}" value="accept" onchange="choiceChanged('${a.id}')"><span><strong>✅ Accepter</strong><br><small>Je suis d'accord avec cet article.</small></span></label>
      <label class="option"><input type="radio" name="choice_${a.id}" value="refuse" onchange="choiceChanged('${a.id}')"><span><strong>❌ Refuser</strong><br><small>Je ne suis pas d'accord et j'explique pourquoi.</small></span></label>
      <label class="option"><input type="radio" name="choice_${a.id}" value="modify" onchange="choiceChanged('${a.id}')"><span><strong>✏️ Compléter / modifier</strong><br><small>Je propose une autre formulation.</small></span></label>
     </div>
     <div class="comment-wrap" id="commentWrap_${a.id}" style="display:none"><label id="commentLabel_${a.id}" for="comment_${a.id}">Expliquez votre réponse</label><textarea id="comment_${a.id}" placeholder="Expliquez votre refus ou votre proposition..."></textarea><div class="article-hint">Ce commentaire sera transmis à l'équipe RH avec votre réponse.</div></div>
     <span class="article-state" id="state_${a.id}">En attente de votre réponse</span>
    </div>
   </div>
  </section>`).join('');
 }
 const saved=localStorage.getItem(storageDraftKey());
 if(saved){try{const draft=JSON.parse(saved);candidate.articles.forEach(a=>{const r=draft.articles?.[a.id];if(r){const radio=document.querySelector(`input[name="choice_${a.id}"][value="${r.choice}"]`);if(radio){radio.checked=true;choiceChanged(a.id);const c=document.getElementById('comment_'+a.id);if(c)c.value=r.comment||'';}}});const gc=document.getElementById('generalComment');if(gc)gc.value=draft.generalComment||'';}catch(e){}}
 updateProgress();
}
function storageDraftKey(){return 'candidate_contract_draft_'+candidate.id;}
function choiceChanged(id){
 const choice=document.querySelector(`input[name="choice_${id}"]:checked`)?.value;
 const wrap=document.getElementById('commentWrap_'+id),label=document.getElementById('commentLabel_'+id),area=document.getElementById('comment_'+id),state=document.getElementById('state_'+id);
 if(choice==='refuse'||choice==='modify'){if(wrap)wrap.style.display='block';if(label)label.textContent=choice==='refuse'?'Pourquoi refusez-vous cet article ? (obligatoire)':'Quelle modification ou quel complément proposez-vous ? (obligatoire)';if(area)area.placeholder=choice==='refuse'?'Expliquez précisément la raison de votre refus...':'Décrivez la formulation ou la condition que vous proposez...';}
 else{if(wrap)wrap.style.display='none';}
 if(state)state.textContent=choice?choices[choice]:'En attente de votre réponse';
 updateProgress();saveDraft();
}
function collectResponses(validate=true){const responses={};const missing=[];
 candidate.articles.forEach(a=>{const choice=document.querySelector(`input[name="choice_${a.id}"]:checked`)?.value;const comment=(document.getElementById('comment_'+a.id)?.value||'').trim();if(!choice){missing.push(a.title+': choisissez une réponse.');return;}if((choice==='refuse'||choice==='modify')&&!comment){missing.push(a.title+': veuillez expliquer votre refus ou votre proposition.');return;}responses[a.id]={article:a.title,choice,label:choices[choice],comment};});
 if(validate&&missing.length){showToast(missing[0]);const target=missing[0].split(':')[0];const a=candidate.articles.find(x=>x.title===target);if(a){const el=document.getElementById('card_'+a.id);if(el)el.scrollIntoView({behavior:'smooth',block:'center'});return null;}}
 return {candidate:{id:candidate.id,name:candidate.name,email:candidate.email,job:candidate.job},contract:{company:candidate.company,type:candidate.type,duration:candidate.duration,startDate:candidate.startDate,location:candidate.location,salary:candidate.salary,hours:candidate.hours},articles:responses,generalComment:(document.getElementById('generalComment')?.value||'').trim()};
}
function updateProgress(){let count=0;candidate.articles.forEach(a=>{if(document.querySelector(`input[name="choice_${a.id}"]:checked`))count++;});const pl=document.getElementById('progressLabel');if(pl)pl.textContent=`${count} / ${candidate.articles.length} réponses`;}
function saveDraft(){const payload=collectResponses(false);if(payload)localStorage.setItem(storageDraftKey(),JSON.stringify(payload));}
function previewResponses(){const payload=collectResponses(true);if(!payload)return;const pc=document.getElementById('previewContent');if(pc)pc.innerHTML=candidate.articles.map(a=>{const r=payload.articles[a.id];return `<div style="padding:10px 0;border-bottom:1px solid #eee;font-size:13px"><strong>${esc(a.title)}</strong><br><span class="status-pill">${esc(r.label)}</span>${r.comment?`<p style="margin:7px 0 0;color:#555">${esc(r.comment)}</p>`:''}</div>`}).join('');const pm=document.getElementById('previewModal');if(pm)pm.classList.add('show');}
function closePreview(){const pm=document.getElementById('previewModal');if(pm)pm.classList.remove('show');}
function submitResponses(){const cr=document.getElementById('confirmRead');if(cr && !cr.checked){showToast('Veuillez confirmer que vous avez lu les articles.');return;}const payload=collectResponses(true);if(!payload)return;payload.generalComment=(document.getElementById('generalComment')?.value||'').trim();payload.submittedAt=new Date().toISOString();payload.submittedAtDisplay=new Date().toLocaleString('fr-FR');payload.status='Réponses envoyées';payload.source='espace-candidat-contrat.html';submittedPayload=payload;
 localStorage.setItem('candidate_contract_response_'+candidate.id,JSON.stringify(payload));localStorage.removeItem(storageDraftKey());
 const articles=payload.articles||{};const accepted=Object.values(articles).filter(r=>r.choice==='accept').length;const refused=Object.values(articles).filter(r=>r.choice==='refuse').length;const modified=Object.values(articles).filter(r=>r.choice==='modify').length;
 const st=document.getElementById('submittedText');if(st)st.textContent=`Votre réponse a été préparée le ${payload.submittedAtDisplay}. Voici le récapitulatif de vos choix.`;
 const ss=document.getElementById('submittedSummary');if(ss)ss.innerHTML=`<div class="candidate-meta"><div class="meta"><span>Articles acceptés</span><strong>${accepted}</strong></div><div class="meta"><span>Articles refusés</span><strong>${refused}</strong></div><div class="meta"><span>Modifications demandées</span><strong>${modified}</strong></div></div>`+candidate.articles.map(a=>{const r=payload.articles[a.id];return `<div style="padding:12px 0;border-bottom:1px solid #eee;font-size:13px"><strong>${esc(a.title)}</strong><br>${esc(r.label)}${r.comment?`<p style="margin-top:5px;color:#626875">${esc(r.comment)}</p>`:''}</div>`}).join('')+(payload.generalComment?`<p style="margin-top:15px"><strong>Commentaire général :</strong><br>${esc(payload.generalComment)}</p>`:'');
 const fv=document.getElementById('formView');if(fv)fv.style.display='none';
 const sv=document.getElementById('submittedView');if(sv)sv.classList.add('show');
 const svs=document.getElementById('statusValue');if(svs)svs.textContent='Réponses préparées';
 downloadResponse();window.scrollTo({top:0,behavior:'smooth'});
}
function downloadResponse(){if(!submittedPayload){const raw=localStorage.getItem('candidate_contract_response_'+candidate.id);if(raw)submittedPayload=JSON.parse(raw);}if(!submittedPayload){showToast('Aucune réponse à télécharger.');return;}const blob=new Blob([JSON.stringify(submittedPayload,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`reponse-contrat-${candidate.id.toLowerCase()}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);showToast('Le récapitulatif JSON a été téléchargé.');}
let toastTimer;function showToast(message){const toast=document.getElementById('toast');if(!toast)return;toast.textContent=message;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),4000);}
const pmEl=document.getElementById('previewModal');if(pmEl)pmEl.addEventListener('click',e=>{if(e.target.id==='previewModal')closePreview();});
if(document.readyState !== 'loading'){init();}else{document.addEventListener('DOMContentLoaded', init);}


function initRhSuiviValidations() {
    var body = document.getElementById('validated-requests');
    var search = document.getElementById('recherche');
    var department = document.getElementById('departement');
    var all = [];
    function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
    function render() {
      var q = search.value.trim().toLocaleLowerCase();
      var dep = department.value;
      var rows = all.filter(function (r) { return (!dep || r.departement === dep) && (!q || [r.reference,r.poste,r.manager,r.departement].join(' ').toLocaleLowerCase().includes(q)); });
      body.innerHTML = rows.length ? rows.map(function (r) { var id=encodeURIComponent(r.id); return '<tr><td><span class="request-id">'+esc(r.reference)+'</span></td><td><div class="job-title">'+esc(r.poste)+'</div></td><td>'+esc(r.departement || '—')+'</td><td>'+esc(r.manager)+'</td><td class="num">'+esc(r.effectif)+'</td><td>'+esc(r.dateSouhaitee || '—')+'</td><td><div class="action-links"><a href="#page=detail-demande-validee&id='+id+'" class="details-link" data-page="detail-demande-validee" data-id="'+esc(r.id)+'">Voir les détails →</a><a href="#page=publication-offre&id='+id+'" class="recruitment-button" data-page="publication-offre" data-id="'+esc(r.id)+'">+ Ouvrir le recrutement</a></div></td></tr>'; }).join('') : '<tr><td colspan="7">Aucune demande validée ne correspond aux filtres.</td></tr>';
      document.getElementById('validated-count').textContent = rows.length+' demande(s) validée(s)';
    }
    search.addEventListener('input', render); department.addEventListener('change', render);
    fetch((document.querySelector('meta[name="context-path"]')?.content || '').replace(/\/$/, '') + '/api/rh/besoins-valides', {headers:{Accept:'application/json'}})
      .then(function (response) { if (!response.ok) throw new Error('Erreur '+response.status); return response.json(); })
      .then(function (data) {
        all = data.map(function (r) { r.reference = 'DEM-'+r.id; return r; });
        Array.from(new Set(all.map(function (r) { return r.departement; }).filter(Boolean))).sort().forEach(function (name) { var option=document.createElement('option'); option.value=name; option.textContent=name; department.appendChild(option); });
        render();
      }).catch(function () { body.innerHTML='<tr><td colspan="7">Impossible de charger les demandes validées.</td></tr>'; });

}
document.addEventListener("pageLoaded", function (event) { if (event.detail && event.detail.page === "suivi-validations") initRhSuiviValidations(); });

function initRhHistoriqueDemandes() {
  var body = document.getElementById('historique-demandes-body');
  var form = document.getElementById('historique-filtres');
  var search = document.getElementById('recherche');
  var all = [];
  if (!body || !form || !search) return;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function dateValue(value) {
    return value ? String(value).slice(0, 10) : '';
  }
  function dateLabel(value) {
    var raw = dateValue(value);
    if (!raw) return '—';
    var parts = raw.split('-');
    return parts.length === 3 ? parts[2] + '/' + parts[1] + '/' + parts[0] : raw;
  }
  function statusClass(key) {
    return key === 'approuvee_direction' ? 'status-approved-direction' :
      key === 'approuvee_finance' ? 'status-approved-finance' :
      key === 'refusee_finance' ? 'status-refused-finance' : 'status-refused-direction';
  }
  function render() {
    var q = search.value.trim().toLocaleLowerCase();
    var rows = all.filter(function (r) {
      var searchable = [r.reference, r.poste, r.manager, r.departement].join(' ').toLocaleLowerCase();
      return !q || searchable.includes(q);
    });
    body.innerHTML = rows.length ? rows.map(function (r) {
      var id = encodeURIComponent(r.id);
      return '<tr><td><span class="request-id">'+esc(r.reference)+'</span></td>' +
        '<td><div class="job-title">'+esc(r.poste)+'</div><div class="cell-secondary">'+esc(r.effectif)+' personne(s)</div></td>' +
        '<td>'+esc(r.manager || '—')+'</td><td>'+esc(r.departement || '—')+'</td>' +
        '<td>'+esc(dateLabel(r.dateDemande))+'</td>' +
        '<td><span class="status '+statusClass(r.decisionKey)+'"><span class="status-dot"></span>'+esc(r.decision)+'</span></td>' +
        '<td>'+esc(dateLabel(r.dateDecision))+'</td>' +
        '<td><a href="#page=detail-demande-historique&id='+id+'" data-page="detail-demande-historique" data-id="'+esc(r.id)+'" class="view-link">Voir →</a></td></tr>';
    }).join('') : '<tr><td colspan="8">Aucune demande ne correspond aux filtres.</td></tr>';
      document.getElementById('historique-resultats').textContent = rows.length + ' décision(s) affichée(s) sur ' + all.length;
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); render(); });
  search.addEventListener('input', render);

  fetch((document.querySelector('meta[name="context-path"]')?.content || '').replace(/\/$/, '') + '/api/rh/historique-demandes', {headers:{Accept:'application/json'}})
    .then(function (response) { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
    .then(function (data) {
      if (!Array.isArray(data)) throw new Error('Réponse API invalide');
      all = data;
      document.getElementById('historique-total').textContent = new Set(all.map(function (r) { return r.id; })).size;
      document.getElementById('historique-direction').textContent = all.filter(function (r) { return r.decisionKey === 'approuvee_direction'; }).length;
      document.getElementById('historique-finance').textContent = all.filter(function (r) { return r.decisionKey === 'approuvee_finance'; }).length;
      document.getElementById('historique-refusees').textContent = all.filter(function (r) { return r.decisionKey.indexOf('refusee_') === 0; }).length;
      render();
    })
    .catch(function (error) {
      console.error('Erreur de chargement de l’historique des demandes RH :', error);
      body.innerHTML = '<tr><td colspan="8">Impossible de charger l’historique des demandes.</td></tr>';
      document.getElementById('historique-resultats').textContent = 'Erreur de chargement';
    });
}
document.addEventListener('pageLoaded', function (event) {
  if (event.detail && event.detail.page === 'historique-demandes') initRhHistoriqueDemandes();
});

// HTML pages expose declarative actions; keep behavior in this role bundle.
function dispatchRoleAction(event) {
  const target = event.target.closest("[data-js-action]");
  if (!target) return;
  const [action, argument] = target.dataset.jsAction.split(":", 2);
  const handlers = {
    previewResponses: () => window.previewResponses(),
    submitResponses: () => window.submitResponses(),
    downloadResponse: () => window.downloadResponse(),
    closePreview: () => window.closePreview(),
    printPage: () => window.print(),
    closeInterviewModalOutside: () => window.closeInterviewModalOutside(event),
    closeInterviewModal: () => window.closeInterviewModal(),
    saveInterviewNotes: () => window.saveInterviewNotes(),
    makeInterviewDecision: () => window.makeInterviewDecision(argument),
    ctCloseModal: () => window.ctCloseModal(argument),
    ctPreviewContract: () => window.ctPreviewContract(),
    ctReturnToEdit: () => window.ctReturnToEdit(),
    ctSendContract: () => window.ctSendContract(),
    ctSubmitCandidateResponses: () => window.ctSubmitCandidateResponses(),
    ctToggleDecisionFields: () => window.ctToggleDecisionFields(),
    ctSendHRDecision: () => window.ctSendHRDecision()
  };
  if (handlers[action]) {
    if (event.type === "click") event.preventDefault();
    handlers[action]();
  }
}
document.addEventListener("click", dispatchRoleAction);
document.addEventListener("change", dispatchRoleAction);
