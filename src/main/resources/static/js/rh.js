/* =========================================
   RH - Espace de travail commun
   =========================================
   Ce fichier pilote les pages RH suivantes :
   - Responsable-RH/pages/publication-offre.html
   - Responsable-RH/pages/brouillons-offre.html

   Les données des brouillons sont enregistrées dans le navigateur.
   ========================================= */

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
          return Object.assign({ title: "Titre à définir", department: "À définir", contract: "À préciser", author: "Responsable RH", status: "Brouillon", data: {}, request: null, requestId: null }, draft);
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

  function formatDate(dateValue) {
    if (!dateValue) return "À préciser";

    var parts = dateValue.split("-");

    if (parts.length !== 3) return dateValue;

    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  /* ------------------------------------------------------------
     Préremplissage à partir de la demande validée
     ------------------------------------------------------------ */

  function ensureSelectOption(selectId, value) {
    if (!value) return;

    var select = byId(selectId);

    if (!select) return;

    var exists = Array.prototype.some.call(select.options, function (option) {
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
    setText("infoApprovalDate", request.approvalDate || "Non enregistrée");
    setText("infoManager", request.manager || "Non renseigné");
    setText("infoDepartment", request.department || "À définir");
    setText(
      "infoPositions",
      request.positions ? request.positions + (request.positions > 1 ? " postes" : " poste") : "À définir"
    );
    setText("infoNeedType", request.needType || "À préciser");
    setText("infoContract", request.contract || "À préciser");
    setText("infoStartDate", request.startDate || "À définir");
    setText("infoExperience", request.experience || "À préciser");
    setText("infoEducation", request.education || "À préciser");
    setText("infoReason", request.reason || "Aucun motif renseigné.");

    setValue("jobTitle", request.jobTitle || "");
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
    ensureSelectOption("contract", request.contract);
    ensureSelectOption("experience", request.experience);
    ensureSelectOption("education", request.education);
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
      experience: "",
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
    var location = byId("location");
    var contract = byId("contract");
    var positions = byId("positions");

    if (title) {
      setText("summaryTitle", title.value || "Non renseigné");
    }

    if (department) {
      setText("summaryDepartment", department.value || "Non renseigné");
    }

    if (location) {
      setText("summaryLocation", location.value || "Non renseigné");
    }

    if (contract) {
      setText("summaryContract", contract.value || "Non renseigné");
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

  /* La durée du contrat n'a de sens que pour un contrat temporaire. */
  function updateDurationField() {
    var contract = byId("contract");
    var duration = byId("duration");

    if (!contract || !duration) return;

    if (contract.value === "CDI") {
      duration.value = "Non applicable pour un CDI";
      duration.readOnly = true;
    } else {
      if (duration.value === "Non applicable pour un CDI") duration.value = "";
      duration.readOnly = false;
    }
  }

  function updateSalaryFields() {
    var salaryDisplay = byId("salaryDisplay");

    if (!salaryDisplay) return;

    var mode = salaryDisplay.value;

    var min = byId("salaryMin");
    var max = byId("salaryMax");
    var currency = byId("salaryCurrency");
    var period = byId("salaryPeriod");

    var showRange = mode === "Fourchette salariale";
    var hidden = mode === "Non affiché";

    if (min) min.disabled = !showRange;
    if (max) max.disabled = !showRange;
    if (currency) currency.disabled = hidden;
    if (period) period.disabled = hidden;

    if (!showRange) {
      if (min) min.value = "";
      if (max) max.value = "";
    }

    if (hidden) {
      if (currency) currency.value = "MGA";
      if (period) period.value = "par mois";
    }
  }

  function getSalaryText() {
    var salaryDisplay = byId("salaryDisplay");

    if (!salaryDisplay) return "";

    var mode = salaryDisplay.value;

    if (mode === "Non affiché") {
      return "";
    }

    if (mode === "À négocier") {
      return "Rémunération à négocier selon le profil.";
    }

    var min = byId("salaryMin");
    var max = byId("salaryMax");
    var currency = byId("salaryCurrency");
    var period = byId("salaryPeriod");

    var minValue = min ? min.value : "";
    var maxValue = max ? max.value : "";

    if (!minValue || !maxValue) {
      return "Fourchette salariale à compléter.";
    }

    var formatter = new Intl.NumberFormat("fr-FR");

    return (
      formatter.format(Number(minValue)) +
      " – " +
      formatter.format(Number(maxValue)) +
      " " +
      (currency ? currency.value : "") +
      " " +
      (period ? period.value : "") +
      "."
    );
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
    var location = valueOf("location");
    var workMode = valueOf("workMode");
    var positions = valueOf("positions");
    var contract = valueOf("contract");
    var duration = valueOf("duration");
    var experience = valueOf("experience");
    var education = valueOf("education");
    var companyDescription = valueOf("companyDescription");
    var jobDescription = valueOf("jobDescription");
    var missions = valueOf("missions");
    var skills = valueOf("skills");
    var qualities = valueOf("qualities");
    var advantages = valueOf("advantages");
    var benefits = valueOf("benefits");
    var deadline = valueOf("deadline");
    var instructions = valueOf("applicationInstructions");

    var salaryText = getSalaryText();

    var salaryHTML = salaryText
      ? '<h2>Rémunération</h2><p>' + escapeHTML(salaryText) + "</p>"
      : "";

    var durationHTML =
      duration && contract !== "CDI"
        ? "<span>Durée : " + escapeHTML(duration) + "</span>"
        : "";

    var deadlineHTML = deadline
      ? '<p style="margin-top:12px;"><strong>Date limite de candidature :</strong> ' +
        escapeHTML(formatDate(deadline)) +
        "</p>"
      : "";

    content.innerHTML =
      "<h1>" +
      escapeHTML(jobTitle) +
      "</h1>" +
      "<p><strong>" +
      escapeHTML(company) +
      "</strong></p>" +
      '<div class="job-meta">' +
      "<span>📍 " +
      escapeHTML(location) +
      "</span>" +
      "<span>💼 " +
      escapeHTML(contract) +
      "</span>" +
      "<span>👥 " +
      escapeHTML(positions) +
      " poste(s)</span>" +
      "<span>🏢 " +
      escapeHTML(workMode) +
      "</span>" +
      durationHTML +
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
      "<p><strong>Expérience :</strong> " +
      escapeHTML(experience) +
      "</p>" +
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
      deadlineHTML +
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

    if (!data) return;

    try {
      Object.keys(data).forEach(function (key) {
        var element = form.elements.namedItem(key);

        if (!element) return;

        if (element.type === "checkbox") {
          element.checked = Boolean(data[key]);
        } else if (key !== "reference") {
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

    if (salaryDisplay && salaryDisplay.value === "Fourchette salariale") {
      var min = Number((byId("salaryMin") || {}).value || 0);
      var max = Number((byId("salaryMax") || {}).value || 0);

      if (!min || !max || min > max) {
        showNotification(
          "Veuillez renseigner une fourchette salariale valide : le minimum doit être inférieur ou égal au maximum.",
          "error"
        );

        return false;
      }
    }

    var publicationDate = (byId("publicationDate") || {}).value || "";
    var deadline = (byId("deadline") || {}).value || "";

    if (publicationDate && deadline && deadline < publicationDate) {
      showNotification(
        "La date limite de candidature ne peut pas précéder la date de publication.",
        "error"
      );

      return false;
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

  /* ------------------------------------------------------------
     Publication de démonstration
     Cette action ne publie pas réellement l'offre sur un site.
     Une API backend sera nécessaire pour enregistrer l'offre
     et la rendre accessible aux candidats.
     ------------------------------------------------------------ */

  function publishOffer(form, request) {
    if (!validatePublication(form)) {
      return;
    }

    var confirmed = window.confirm(
      "Confirmer la publication de cette offre ?\n\n" +
        "Attention : dans cette version de démonstration, " +
        "l'offre ne sera pas réellement publiée sur un site."
    );

    if (!confirmed) return;

    try {
      var data = getFormData(form, request);

      data.status = "Prête à publier";
      data.preparedAt = new Date().toISOString();

      localStorage.setItem(
        "offre-preparee-" + request.reference,
        JSON.stringify(data)
      );

      /* L'offre n'est plus un brouillon : elle sort de la liste. */
      RHDrafts.remove(request.reference);

      showNotification(
        "La préparation de l'offre est enregistrée dans ce navigateur. La publication réelle nécessite encore la connexion au backend.",
        "success"
      );

      closePreview();
    } catch (error) {
      showNotification(
        "Impossible d'enregistrer les informations de l'offre.",
        "error"
      );
    }
  }

  /* ------------------------------------------------------------
     Initialisation de la page
     ------------------------------------------------------------ */

  function initPublicationOffre(event) {
    var form = byId("offerForm");

    if (!form) return;

    /* Évite une double initialisation sur la même page. */
    if (form.dataset.publicationOffreReady === "true") return;
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
            needType: 'Type non renseigné dans la demande',
            contract: 'À préciser',
            startDate: row.dateSouhaitee || '',
            experience: 'À préciser',
            education: 'À préciser',
            reason: row.motif || 'Aucun motif renseigné.',
            jobTitle: row.poste
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
    updateDurationField();
    updateSummary();

    /* Date de publication : aujourd'hui par défaut. */
    var publicationDateInput = byId("publicationDate");

    if (publicationDateInput && !publicationDateInput.value) {
      var today = new Date();
      var localToday = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000
      )
        .toISOString()
        .split("T")[0];

      publicationDateInput.value = localToday;
    }

    /* Écouteurs d'événements. */
    ["jobTitle", "department", "location", "contract", "positions"].forEach(
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

    var contractSelect = byId("contract");

    if (contractSelect) {
      contractSelect.addEventListener("change", updateDurationField);
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

        linked.textContent = Object.keys(references).length;
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

   Les filtres s'appliquent sur les lignes du tableau
   (données de démonstration).
   ========================================= */

(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function initSuiviOffresPubliees() {
    var tableBody = byId("offers-tbody");

    if (!tableBody) return;

    var searchInput = byId("search");
    var departmentFilter = byId("department-filter");
    var statusFilter = byId("status-filter");
    var resetButton = byId("reset-filters");
    var emptyResetButton = byId("empty-reset");
    var emptyState = byId("empty-state");
    var visibleCount = byId("visible-count");
    var panelCount = byId("panel-count");

    var rows = Array.prototype.slice.call(tableBody.querySelectorAll("tr"));

    /* ------------------------------------------------------------
       Filtres et recherche
       ------------------------------------------------------------ */

    function filterOffers() {
      var search = searchInput ? searchInput.value.trim().toLowerCase() : "";
      var department = departmentFilter ? departmentFilter.value : "";
      var status = statusFilter ? statusFilter.value : "";

      var count = 0;

      rows.forEach(function (row) {
        var title = (row.dataset.title || "").toLowerCase();
        var reference = (row.dataset.reference || "").toLowerCase();
        var rowDepartment = row.dataset.department || "";
        var rowStatus = row.dataset.status || "";
        var contract = (row.dataset.contract || "").toLowerCase();

        var matchesSearch =
          !search ||
          title.indexOf(search) !== -1 ||
          reference.indexOf(search) !== -1 ||
          rowDepartment.toLowerCase().indexOf(search) !== -1 ||
          contract.indexOf(search) !== -1;

        var matchesDepartment = !department || rowDepartment === department;

        var matchesStatus = !status || rowStatus === status;

        var isVisible = matchesSearch && matchesDepartment && matchesStatus;

        row.style.display = isVisible ? "" : "none";

        if (isVisible) count++;
      });

      if (visibleCount) {
        visibleCount.textContent = count;
      }

      if (panelCount) {
        panelCount.textContent = count + (count > 1 ? " offres" : " offre");
      }

      if (emptyState) {
        emptyState.classList.toggle("visible", count === 0);
      }
    }

    function resetFilters() {
      if (searchInput) searchInput.value = "";
      if (departmentFilter) departmentFilter.value = "";
      if (statusFilter) statusFilter.value = "";

      filterOffers();
    }

    /* ------------------------------------------------------------
       Événements
       ------------------------------------------------------------ */

    if (searchInput) {
      searchInput.addEventListener("input", filterOffers);
    }

    if (departmentFilter) {
      departmentFilter.addEventListener("change", filterOffers);
    }

    if (statusFilter) {
      statusFilter.addEventListener("change", filterOffers);
    }

    if (resetButton) {
      resetButton.addEventListener("click", resetFilters);
    }

    if (emptyResetButton) {
      emptyResetButton.addEventListener("click", resetFilters);
    }

    Array.prototype.slice.call(
      tableBody.querySelectorAll("[data-view-applications]")
    ).forEach(function (button) {
      button.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.hash = "page=candidatures-recues";
      });
    });

    /* ------------------------------------------------------------
       Initialisation
       ------------------------------------------------------------ */

    filterOffers();
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

  var candidates = {
    1: { id: 1, name: "Rakoto Jean", initials: "RJ", email: "jean.rakoto@example.com", phone: "034 12 345 67", date: "20/10/2026", job: "Développeur web", contract: "CDI", cvName: "CV_Jean_Rakoto.pdf", cvUrl: "", letterName: "Lettre_motivation_Jean.pdf", letterUrl: "" },
    2: { id: 2, name: "Rasoanaivo Sarah", initials: "RS", email: "sarah.rasoanaivo@example.com", phone: "032 45 678 90", date: "19/10/2026", job: "Développeur web", contract: "CDI", cvName: "CV_Sarah_Rasoanaivo.pdf", cvUrl: "", letterName: "Lettre_motivation_Sarah.pdf", letterUrl: "" },
    3: { id: 3, name: "Andria Paul", initials: "AP", email: "paul.andria@example.com", phone: "033 56 789 01", date: "18/10/2026", job: "Développeur web", contract: "CDI", cvName: "CV_Paul_Andria.pdf", cvUrl: "", letterName: "Lettre_motivation_Paul.pdf", letterUrl: "" },
    4: { id: 4, name: "Randria Marie", initials: "RM", email: "marie.randria@example.com", phone: "034 67 890 12", date: "17/10/2026", job: "Développeur web", contract: "CDI", cvName: "CV_Marie_Randria.pdf", cvUrl: "", letterName: "Lettre_motivation_Marie.pdf", letterUrl: "" }
  };

  var selectedCandidates = new Set();
  var currentCandidateId = null;
  var previousFocus = null;

  function initCandidaturesRecues(event) {
    if (!event || !event.detail || event.detail.page !== "candidatures-recues") return;

    var page = document.querySelector(".applications-page");
    if (!page) return;

    var modal = page.querySelector("#candidateModal");
    var search = page.querySelector("#searchInput");
    var rows = Array.prototype.slice.call(page.querySelectorAll("#candidatesTable tr"));
    var modalSelect = page.querySelector("#modalSelectButton");

    function setText(id, value) {
      var element = page.querySelector("#" + id);
      if (element) element.textContent = value;
    }

    function updateButton(button, selected, selectedText, defaultText) {
      if (!button) return;
      button.textContent = selected ? selectedText : defaultText;
      button.classList.toggle("btn-selected", selected);
      button.classList.toggle("btn-select", !selected);
      button.disabled = selected;
    }

    function updateCounts() {
      setText("totalCandidates", Object.keys(candidates).length);
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
        link.href = url;
        link.textContent = "Consulter ↗";
        link.removeAttribute("aria-disabled");
      } else {
        link.removeAttribute("href");
        link.textContent = "Indisponible";
        link.setAttribute("aria-disabled", "true");
      }
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
      setText("detailDate", candidate.date);
      setText("detailJob", candidate.job);
      setText("detailContract", candidate.contract);
      setText("cvFormat", candidate.cvName);
      setText("letterFormat", candidate.letterName);
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
      selectedCandidates.add(id);
      updateCandidateButton(id);
      updateCounts();
      if (currentCandidateId === id) updateModalButton(id);
    }

    function filterCandidates() {
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

    rows.forEach(function (row) {
      var id = Number(row.querySelector("[data-select-id]").getAttribute("data-select-id"));
      updateCandidateButton(id);
      row.querySelector(".btn-details").addEventListener("click", function () { viewCandidate(id); });
      row.querySelector("[data-select-id]").addEventListener("click", function () { selectCandidate(id); });
    });

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

  var interviewCandidates = {
    1: {
      id: 1,
      name: "Rakoto Jean",
      initials: "RJ",
      email: "jean.rakoto@example.com",
      job: "Développeur web",
      notes: "",
      decision: null
    },
    2: {
      id: 2,
      name: "Rasoanaivo Sarah",
      initials: "RS",
      email: "sarah.rasoanaivo@example.com",
      job: "Développeur web",
      notes: "",
      decision: null
    },
    3: {
      id: 3,
      name: "Andria Paul",
      initials: "AP",
      email: "paul.andria@example.com",
      job: "Développeur web",
      notes: "",
      decision: null
    }
  };

  var currentInterviewCandidateId = null;
  var interviewToastTimeout = null;

  function byId(id) {
    return document.getElementById(id);
  }

  window.startInterview = function(id) {
    var candidate = interviewCandidates[id];
    if (!candidate || candidate.decision !== null) {
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
    if (notesArea) {
      candidate.notes = notesArea.value;
    }

    showInterviewToast("Notes enregistrées pour " + candidate.name + ".");
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

    candidate.decision = decision;

    updateInterviewCandidateRow(candidate);
    updateInterviewStatistics();

    window.closeInterviewModal();

    if (decision === "accept") {
      showInterviewToast(
        candidate.name + " a été accepté à l'issue de l'entretien."
      );
    } else {
      showInterviewToast(
        candidate.name + " a été refusé à l'issue de l'entretien."
      );
    }
  };

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

    if (candidate.decision === "accept") {
      button.textContent = "Candidat accepté ✓";
    } else {
      button.textContent = "Candidat refusé";
    }
  }

  function updateInterviewStatistics() {
    var values = Object.values(interviewCandidates);

    var pending = values.filter(function(candidate) {
      return candidate.decision === null;
    }).length;

    var accepted = values.filter(function(candidate) {
      return candidate.decision === "accept";
    }).length;

    var rejected = values.filter(function(candidate) {
      return candidate.decision === "refuse";
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
    var rows = document.querySelectorAll("#interviewCandidateTable tr");
    var emptyState = byId("interviewsEmptyState");

    if (emptyState) {
      emptyState.style.display = "none";
    }

    rows.forEach(function(row) {
      row.style.display = "";
    });

    if (searchInput) {
      searchInput.addEventListener("input", function() {
        var term = this.value.trim().toLowerCase();
        var visible = 0;

        rows.forEach(function(row) {
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

    updateInterviewStatistics();
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

  const ctCandidates = [
    {
      id: 1,
      name: "Rakoto Jean",
      email: "jean@example.com",
      job: "Développeur web",
      type: "CDI",
      status: "preparation",
      contract: null,
      responses: null,
      negotiation: null,
    },
    {
      id: 2,
      name: "Rasoanaivo Sarah",
      email: "sarah@example.com",
      job: "Assistante RH",
      type: "CDD",
      status: "sent",
      contract: ctMakeSampleContract("Rasoanaivo Sarah", "Assistante RH", "CDD"),
      responses: null,
      negotiation: null,
    },
    {
      id: 3,
      name: "Randria Hery",
      email: "hery@example.com",
      job: "Comptable",
      type: "CDI",
      status: "review",
      contract: ctMakeSampleContract("Randria Hery", "Comptable", "CDI"),
      responses: null,
      negotiation: null,
    },
  ];

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

  ctCandidates[2].responses = {
    articles: {
      ctArticle3: {
        title: "Article 3 — Rémunération",
        choice: "refused",
        comment: "La rémunération proposée ne correspond pas aux responsabilités du poste. Je souhaiterais discuter d'un salaire mensuel de 1 500 000 Ar.",
      },
    },
    generalComment: "Je reste intéressé par le poste et suis disponible pour discuter de cette condition.",
    submittedAt: "20/10/2026 à 10:30",
    status: "refused",
  };

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
      sent: ["En attente de la réponse du candidat", "ct-status-sent"],
      review: ["Réponse du candidat à examiner", "ct-status-response"],
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
        buttons = `<button class="ct-btn ct-btn-outline" onclick="ctEditContract(${c.id})">✏️ Préparer</button><button class="ct-btn ct-btn-orange" onclick="ctPreviewExistingOrEdit(${c.id})">👁 Prévisualiser</button>`;
      } else if (c.status === "sent") {
        buttons = `<button class="ct-btn ct-btn-blue" onclick="ctSimulateCandidateResponse(${c.id})">📝 Espace candidat (démo)</button>`;
      } else if (c.status === "review") {
        buttons = `<button class="ct-btn ct-btn-orange" onclick="ctReviewResponses(${c.id})">📋 Examiner les réponses</button>`;
      } else if (c.status === "negotiation") {
        buttons = `<button class="ct-btn ct-btn-blue" onclick="ctSimulateCandidateResponse(${c.id})">↩️ Réponse du candidat (démo)</button><button class="ct-btn ct-btn-outline" onclick="ctViewNegotiation(${c.id})">👁 Voir l'échange</button>`;
      } else {
        buttons = `<button class="ct-btn ct-btn-outline" onclick="ctViewContract(${c.id})">👁 Voir le contrat</button><button class="ct-btn ct-btn-orange" onclick="ctViewNegotiation(${c.id})">📋 Voir l'échange</button>`;
      }
      return `<tr><td><strong>${ctEsc(c.name)}</strong><span class="subtext">${ctEsc(c.email)}</span></td><td>${ctEsc(c.job)}</td><td>${ctEsc(c.type)}</td><td><span class="ct-badge ${s[1]}">${s[0]}</span></td><td><div class="ct-actions">${buttons}</div></td></tr>`;
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
    for (const [el, key] of Object.entries(map)) {
      const node = document.getElementById(el);
      if (!node) continue;
      node.value = c.contract ? c.contract[key] : (key === "candidateName" ? c.name : key === "job" ? c.job : key === "type" ? c.type : key === "companyName" ? "Entreprise Exemple" : key === "companyAddress" ? "Antananarivo, Madagascar" : key === "duration" ? (c.type === "CDI" ? "Indéterminée" : "12 mois") : key === "location" ? "Antananarivo" : key === "hours" ? "40 heures par semaine" : "");
    }
    ctArticleFields.forEach((a) => {
      const node = document.getElementById(a.id);
      if (node) node.value = c.contract?.articles[a.id] || "";
    });
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
    el.innerHTML = `<h2>CONTRAT DE TRAVAIL</h2><p class="ct-document-subtitle">Document préparatoire — à vérifier avant signature</p><p style="font-size:13px;line-height:1.8;margin-bottom:20px"><strong>Employeur :</strong> ${ctEsc(contract.companyName)}<br><strong>Adresse :</strong> ${ctEsc(contract.companyAddress)}<br><strong>Candidat :</strong> ${ctEsc(contract.candidateName)}<br><strong>Poste :</strong> ${ctEsc(contract.job)}<br><strong>Type :</strong> ${ctEsc(contract.type)}<br><strong>Durée :</strong> ${ctEsc(contract.duration || "À préciser")}<br><strong>Début :</strong> ${ctEsc(contract.startDate || "À préciser")}<br><strong>Lieu :</strong> ${ctEsc(contract.location || "À préciser")}<br><strong>Rémunération :</strong> ${ctEsc(contract.salary || "À préciser")}<br><strong>Horaires :</strong> ${ctEsc(contract.hours || "À préciser")}<br><strong>Avantages :</strong> ${ctEsc(contract.benefits || "À préciser")}</p>${ctArticleFields.map((a) => `<div class="ct-contract-article"><h3>${ctEsc(a.title)}</h3><p>${ctEsc(contract.articles[a.id])}</p></div>`).join("")}<p class="ct-small-muted">Les propositions du candidat doivent être examinées par la RH et convenues par les deux parties avant d'intégrer le contrat définitif.</p>`;
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

  window.ctSendContract = function() {
    const c = ctGetCandidate(ctActiveCandidateId);
    if (!c?.contract) return;
    if (!confirm("Envoyer ce contrat à " + c.name + " ?")) return;
    c.status = "sent";
    c.responses = null;
    c.negotiation = null;
    ctCloseModal("ctPreviewModal");
    ctCloseModal("ctEditModal");
    ctRenderTable();
    alert("Contrat marqué comme envoyé dans la démonstration.");
  };

  window.ctViewContract = function(id) {
    const c = ctGetCandidate(id);
    if (!c?.contract) return;
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
      const values = Object.values(responses);
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
    let html = `<div class="ct-response-summary"><h4>${ctEsc(c.name)} — ${ctEsc(c.job)}</h4><p class="ct-small-muted">Envoyé le : ${ctEsc(c.responses.submittedAt || "-")}</p>${c.responses.generalComment ? `<p style="margin-top:10px;font-size:13px"><strong>Commentaire général :</strong><br>${ctEsc(c.responses.generalComment)}</p>` : ""}</div>`;
    Object.entries(articles).forEach(([articleId, r]) => {
      const label = ctArticleFields.find((a) => a.id === articleId)?.title || articleId;
      const choiceMap = { accepted: "Accepté", refused: "Refusé", modify: "À modifier / proposition" };
      html += `<div style="margin-bottom:18px"><strong style="color:#14213d">${ctEsc(label)}</strong><p style="margin:8px 0;font-size:13px"><span class="ct-badge ${r.choice === "accepted" ? "ct-status-accepted" : r.choice === "refused" ? "ct-status-refused" : "ct-status-response"}">${choiceMap[r.choice]}</span></p>${r.comment ? `<div class="ct-proposal-box">${ctEsc(r.comment)}</div>` : ""}<button class="ct-btn ct-btn-orange" onclick="ctOpenDecisionModal(${c.id}, '${articleId}')">Répondre à ce point</button></div>`;
    });
    if (content) content.innerHTML = html;
    ctOpenModal("ctReviewModal");
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
    ctRenderTable();
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

    const accepted = Object.values(payload.articles).filter(r => r.choice === "accept").length;
    const refused = Object.values(payload.articles).filter(r => r.choice === "refuse").length;
    const modified = Object.values(payload.articles).filter(r => r.choice === "modify").length;

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
 const accepted=Object.values(payload.articles).filter(r=>r.choice==='accept').length;const refused=Object.values(payload.articles).filter(r=>r.choice==='refuse').length;const modified=Object.values(payload.articles).filter(r=>r.choice==='modify').length;
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
