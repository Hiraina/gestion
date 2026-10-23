/* =========================================
   ESPACE CANDIDAT - RECHERCHE D'OFFRES
   =========================================
   Pilote la page candidat/offres-emploi.html :
   - filtre les offres via le panneau de recherche
   - met à jour le compteur de résultats
   - affiche l'état vide quand aucune offre ne correspond
   ========================================= */

(function () {
  "use strict";

  var searchInput = document.getElementById("search");
  var departmentSelect = document.getElementById("department");
  var contractSelect = document.getElementById("contract");
  var searchButton = document.getElementById("search-button");
  var resultsNumber = document.getElementById("results-number");
  var emptyState = document.getElementById("empty-state");
  var resetButton = document.getElementById("reset-button");
  var offerCards = Array.prototype.slice.call(document.querySelectorAll(".offer-card"));
  var offersById = {};
  var detailModal = document.getElementById("offer-detail-modal");
  var detailContent = document.getElementById("offer-detail-content");
  var detailApply = document.getElementById("offer-detail-apply");

  /* Normalise une valeur pour la comparaison textuelle. */
  function normalize(value) {
    return (value || "").toLowerCase().trim();
  }

  /* Applique les filtres et met à jour l'affichage. */
  function filterOffers() {
    var query = normalize(searchInput ? searchInput.value : "");
    var department = departmentSelect ? departmentSelect.value : "";
    var contract = contractSelect ? contractSelect.value : "";
    var visible = 0;

    offerCards.forEach(function (card) {
      var title = normalize(card.getAttribute("data-title"));
      var cardDepartment = card.getAttribute("data-department") || "";
      var cardContract = card.getAttribute("data-contract") || "";

      var matchesSearch = !query ||
        title.indexOf(query) !== -1 ||
        normalize(cardDepartment).indexOf(query) !== -1;

      var matchesDepartment = !department || cardDepartment === department;
      var matchesContract = !contract || cardContract === contract;

      var keep = matchesSearch && matchesDepartment && matchesContract;

      card.style.display = keep ? "" : "none";

      if (keep) visible++;
    });

    if (resultsNumber) {
      if (visible === 0) {
        resultsNumber.textContent = "Aucune offre trouvée";
      } else {
        resultsNumber.textContent = visible + (visible > 1 ? " offres trouvées" : " offre trouvée");
      }
    }

    if (emptyState) {
      emptyState.hidden = visible !== 0;
    }
  }

  /* Remet les filtres à zéro puis réaffiche toutes les offres. */
  function resetFilters() {
    if (searchInput) searchInput.value = "";
    if (departmentSelect) departmentSelect.value = "";
    if (contractSelect) contractSelect.value = "";

    filterOffers();
  }

  function addDetailSection(container, title, value, asList) {
    if (value == null || value === "") return;
    var section = document.createElement("section");
    section.className = "offer-detail-section";
    var heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);
    if (asList) {
      var list = document.createElement("ul");
      var values = Array.isArray(value) ? value : String(value).split(/\r?\n/);
      values.map(function (item) { return String(item).trim(); }).filter(Boolean).forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        list.appendChild(li);
      });
      if (!list.childElementCount) return;
      section.appendChild(list);
    } else {
      var text = document.createElement("p");
      text.textContent = String(value);
      section.appendChild(text);
    }
    container.appendChild(section);
  }

  function formatSalary(data) {
    if (data.salaryDisplay === "À négocier") return "Rémunération à négocier selon le profil.";
    if (data.salaryDisplay === "Salaire approximatif" && Number(data.salaryMonthlyEstimate) > 0) {
      return new Intl.NumberFormat("fr-FR").format(Number(data.salaryMonthlyEstimate)) +
        " Ar par mois et par personne (estimation Finance).";
    }
    /* Compatibilité avec les offres publiées avant le nouveau référentiel de salaire. */
    if (data.salaryDisplay === "Fourchette salariale") {
      var range = [data.salaryMin, data.salaryMax].filter(function (amount) { return amount != null && amount !== ""; })
        .map(function (amount) { return new Intl.NumberFormat("fr-FR").format(Number(amount)); }).join(" – ");
      return range ? range + " " + (data.salaryCurrency || "MGA") + " " + (data.salaryPeriod || "par mois") : "";
    }
    return "";
  }

  function showOfferDetails(offer) {
    if (!offer || !detailModal || !detailContent) return;
    var data = offer.data || {};
    var title = data.jobTitle || offer.titre || "Poste à pourvoir";
    var company = data.company || "Carrière+";
    detailContent.replaceChildren();

    var heading = document.createElement("h2");
    heading.className = "offer-detail-title";
    heading.id = "offer-detail-title";
    heading.textContent = title;
    detailContent.appendChild(heading);
    var companyLine = document.createElement("p");
    companyLine.className = "offer-detail-company";
    companyLine.textContent = [company, data.department || offer.departement || ""].filter(Boolean).join(" · ");
    detailContent.appendChild(companyLine);

    var facts = document.createElement("div");
    facts.className = "offer-detail-facts";
    [data.contract, data.positions ? data.positions + (Number(data.positions) > 1 ? " postes" : " poste") : "", data.education]
      .filter(Boolean).forEach(function (fact) {
        var badge = document.createElement("span");
        badge.textContent = fact;
        facts.appendChild(badge);
      });
    detailContent.appendChild(facts);

    addDetailSection(detailContent, "Présentation de l'entreprise", data.companyDescription, false);
    addDetailSection(detailContent, "Description du poste", data.jobDescription || offer.description, false);
    addDetailSection(detailContent, "Missions principales", data.missions, true);
    addDetailSection(detailContent, "Formation", data.education, false);
    addDetailSection(detailContent, "Compétences recherchées", data.skills, true);
    addDetailSection(detailContent, "Qualités personnelles", data.qualities, true);
    addDetailSection(detailContent, "Atouts supplémentaires", data.advantages, true);
    addDetailSection(detailContent, "Rémunération", formatSalary(data), false);
    addDetailSection(detailContent, "Avantages", data.benefits, true);
    addDetailSection(detailContent, "Consignes de candidature", data.applicationInstructions, false);

    if (detailApply) {
      detailApply.href = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "") +
        "/candidat/formulaire-candidature.html?offreId=" + encodeURIComponent(offer.id) +
        "&poste=" + encodeURIComponent(title);
    }
    detailModal.hidden = false;
    document.body.classList.add("offer-detail-open");
    var closeButton = detailModal.querySelector("[data-close-offer-details]");
    if (closeButton) closeButton.focus();
  }

  function closeOfferDetails() {
    if (!detailModal) return;
    detailModal.hidden = true;
    document.body.classList.remove("offer-detail-open");
  }

  function loadPublishedOffers() {
    if (!document.getElementById("offers-list")) return;
    var context = document.querySelector('meta[name="context-path"]')?.content || "/";
    context = context.replace(/\/$/, "");
    fetch(context + "/api/offres-emploi", {
      cache: "no-store",
      headers: { Accept: "application/json", "Cache-Control": "no-cache" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Les offres n’ont pas pu être chargées.");
        return response.json();
      })
      .then(function (offers) {
        var list = document.getElementById("offers-list");
        var departments = new Set();
        var contracts = new Set();
        offersById = {};
        list.replaceChildren();
        offers.forEach(function (offer) {
          offersById[String(offer.id)] = offer;
          var data = offer.data || {};
          var title = data.jobTitle || offer.titre || "Poste à pourvoir";
          var department = data.department || offer.departement || "";
          var contract = data.contract || "";
          var location = data.location || "";
          var company = data.company || "Carrière+";
          var description = data.jobDescription || offer.description || "";
          var card = document.createElement("article");
          card.className = "offer-card";
          card.dataset.title = title;
          card.dataset.department = department;
          card.dataset.contract = contract;
          var top = document.createElement("div");
          top.className = "offer-card-top";
          var icon = document.createElement("div");
          icon.className = "company-icon";
          icon.setAttribute("aria-hidden", "true");
          icon.textContent = "💼";
          var headings = document.createElement("div");
          headings.className = "offer-headings";
          var heading = document.createElement("h3");
          heading.className = "offer-title";
          heading.textContent = title;
          var companyLine = document.createElement("p");
          companyLine.className = "offer-company";
          companyLine.textContent = [company, location].filter(Boolean).join(" · ");
          headings.append(heading, companyLine);
          var badge = document.createElement("span");
          badge.className = "badge badge-new";
          badge.textContent = contract || "Offre publiée";
          top.append(icon, headings, badge);
          var desc = document.createElement("p");
          desc.className = "offer-description";
          desc.textContent = description;
          var meta = document.createElement("div");
          meta.className = "offer-meta";
          [["🏢", department], ["📄", contract], ["📅", offer.datePublication ? new Date(offer.datePublication).toLocaleDateString("fr-FR") : ""]].forEach(function (item) {
            if (!item[1]) return;
            var span = document.createElement("span");
            span.className = "meta-item";
            span.textContent = item[0] + " " + item[1];
            meta.appendChild(span);
          });
          var footer = document.createElement("div");
          footer.className = "offer-footer";
          var extra = document.createElement("span");
          extra.className = "offer-contract";
          extra.textContent = [data.positions ? data.positions + " poste(s)" : "", data.education || ""].filter(Boolean).join(" · ");
          var apply = document.createElement("a");
          apply.className = "apply-button";
          apply.textContent = "Postuler";
          apply.href = context + "/candidat/formulaire-candidature.html?offreId=" + encodeURIComponent(offer.id) + "&poste=" + encodeURIComponent(title);
          var detailsButton = document.createElement("button");
          detailsButton.type = "button";
          detailsButton.className = "details-button";
          detailsButton.dataset.offerId = String(offer.id);
          detailsButton.textContent = "Voir les détails";
          footer.append(extra, detailsButton, apply);
          card.append(top, desc, meta, footer);
          list.appendChild(card);
          if (department) departments.add(department);
          if (contract) contracts.add(contract);
        });
        offerCards = Array.prototype.slice.call(list.querySelectorAll(".offer-card"));
        [["department", departments], ["contract", contracts]].forEach(function (entry) {
          var select = document.getElementById(entry[0]);
          while (select.options.length > 1) select.remove(1);
          Array.from(entry[1]).sort().forEach(function (value) {
            var option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
          });
        });
        var count = document.getElementById("hero-offer-count");
        var deptCount = document.getElementById("hero-department-count");
        var contractCount = document.getElementById("hero-contract-count");
        if (count) count.textContent = offers.length;
        if (deptCount) deptCount.textContent = departments.size;
        if (contractCount) contractCount.textContent = contracts.size;
        filterOffers();
      })
      .catch(function () {
        var list = document.getElementById("offers-list");
        if (list) list.textContent = "Impossible de charger les offres pour le moment.";
        var count = document.getElementById("results-number");
        if (count) count.textContent = "Offres indisponibles";
      });
  }

  function init() {
    document.addEventListener("click", function (event) {
      var detailsButton = event.target.closest("[data-offer-id]");
      if (detailsButton) showOfferDetails(offersById[detailsButton.dataset.offerId]);
      if (event.target.closest("[data-close-offer-details]")) closeOfferDetails();
      if (event.target === detailModal) closeOfferDetails();
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeOfferDetails();
    });

    if (searchButton) {
      searchButton.addEventListener("click", function (event) {
        event.preventDefault();
        filterOffers();
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", filterOffers);

      searchInput.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
          event.preventDefault();
          filterOffers();
        }
      });
    }

    if (departmentSelect) {
      departmentSelect.addEventListener("change", filterOffers);
    }

    if (contractSelect) {
      contractSelect.addEventListener("change", filterOffers);
    }

    if (resetButton) {
      resetButton.addEventListener("click", function (event) {
        event.preventDefault();
        resetFilters();
      });
    }

    filterOffers();
    loadPublishedOffers();
    window.addEventListener("focus", loadPublishedOffers);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") loadPublishedOffers();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* =========================================
   ESPACE CANDIDAT - FORMULAIRE DE CANDIDATURE
   =========================================
   Pilote la page candidat/formulaire-candidature.html :
   - navigation entre les 5 étapes avec barre de progression
   - validation des champs obligatoires de chaque étape
   - sélection et suppression des fichiers (CV, lettre)
   - récapitulatif avant l'envoi
   ========================================= */

(function () {
  "use strict";

  var form = document.getElementById("application-form");

  /* La page n'est pas le formulaire de candidature : rien à faire. */
  if (!form) return;

  function loadEducationLevels() {
    var select = document.getElementById("education");
    if (!select) return;
    var context = document.querySelector('meta[name="context-path"]')?.content || "/";
    context = context.replace(/\/$/, "");
    fetch(context + "/Responsable-RH/api/offres/referentiels/niveaux-etude", {
      cache: "no-store",
      headers: { Accept: "application/json" }
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Réponse HTTP " + response.status);
        return response.json();
      })
      .then(function (levels) {
        if (!Array.isArray(levels)) throw new Error("Le référentiel des niveaux d'étude est invalide.");
        select.replaceChildren(new Option("Sélectionnez un niveau", ""));
        levels.forEach(function (level) {
          if (typeof level !== "string" || !level.trim()) return;
          select.add(new Option(level, level));
        });
      })
      .catch(function (error) {
        console.error("[Candidat] Impossible de charger les niveaux d'étude depuis la base :", error);
        select.replaceChildren(new Option("Niveaux d'étude indisponibles", ""));
      });
  }

  loadEducationLevels();

  var steps = Array.prototype.slice.call(document.querySelectorAll(".form-step"));
  var indicators = Array.prototype.slice.call(document.querySelectorAll(".step-item"));

  var progressFill = document.getElementById("progress-fill");
  var progressPercentage = document.getElementById("progress-percentage");
  var stepIndicator = document.getElementById("step-indicator");

  var previousButton = document.getElementById("previous-button");
  var nextButton = document.getElementById("next-button");
  var submitButton = document.getElementById("submit-button");

  var formFooter = document.getElementById("form-footer");
  var progressSection = document.getElementById("progress-section");
  var successScreen = document.getElementById("success-screen");
  var formCard = document.getElementById("form-card");

  var totalSteps = steps.length;
  var currentStep = 0;

  /* ============================================
     NAVIGATION ENTRE LES ÉTAPES
     ============================================ */

  function showStep(stepIndex) {
    if (stepIndex < 0 || stepIndex >= totalSteps) {
      return;
    }

    currentStep = stepIndex;

    steps.forEach(function (step, index) {
      step.classList.toggle("active", index === currentStep);
    });

    indicators.forEach(function (indicator, index) {
      indicator.classList.toggle("active", index === currentStep);
      indicator.classList.toggle("completed", index < currentStep);

      var circle = indicator.querySelector(".step-circle");

      if (index < currentStep) {
        circle.textContent = "✓";
      } else {
        circle.textContent = index + 1;
      }
    });

    var percentage = Math.round(((currentStep + 1) / totalSteps) * 100);

    progressFill.style.width = percentage + "%";
    progressPercentage.textContent = percentage + " % complété";

    stepIndicator.textContent = "ÉTAPE " + (currentStep + 1) + " SUR " + totalSteps;

    previousButton.hidden = currentStep === 0;
    nextButton.hidden = currentStep === totalSteps - 1;
    submitButton.hidden = currentStep !== totalSteps - 1;

    if (currentStep === totalSteps - 1) {
      updateReview();
    }

    /* Revenir en haut du formulaire à chaque étape. */
    if (formCard) {
      formCard.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  /* ============================================
     VALIDATION DES CHAMPS
     ============================================ */

  function showFieldError(field, message) {
    field.classList.add("invalid");

    var group = field.closest(".form-group");

    if (group) {
      var error = group.querySelector(".field-error");

      if (error) {
        if (message) {
          error.textContent = message;
        }

        error.classList.add("visible");
      }
    }
  }

  function clearFieldError(field) {
    field.classList.remove("invalid");

    var group = field.closest(".form-group");

    if (group) {
      var error = group.querySelector(".field-error");

      if (error) {
        error.classList.remove("visible");
      }
    }
  }

  function validateStep(stepIndex) {
    var currentSection = steps[stepIndex];
    var fields = Array.prototype.slice.call(currentSection.querySelectorAll(
      "input:not([type='radio']):not([type='checkbox']):not([type='file']), select, textarea"
    ));

    var valid = true;
    var firstInvalidField = null;

    fields.forEach(function (field) {
      clearFieldError(field);

      /* Les champs désactivés ou masqués ne sont pas validés. */
      if (field.disabled || field.closest("[hidden]")) {
        return;
      }

      if (field.required && !field.value.trim()) {
        showFieldError(field);
        valid = false;

        if (!firstInvalidField) {
          firstInvalidField = field;
        }

        return;
      }

      if (field.id === "email" && field.value &&
          (!field.validity.valid || !field.value.trim().toLowerCase().endsWith("@gmail.com"))) {
        showFieldError(field, "Veuillez saisir une adresse e-mail Gmail valide (exemple@gmail.com).");

        valid = false;

        if (!firstInvalidField) {
          firstInvalidField = field;
        }

        return;
      }

      if (field.id === "phone" && field.value) {
        var phoneDigits = field.value.replace(/\s/g, "");
        if (!/^\d{10}$/.test(phoneDigits)) {
          showFieldError(field, "Veuillez saisir un numéro composé de 10 chiffres (les espaces sont autorisés).");
          valid = false;

          if (!firstInvalidField) {
            firstInvalidField = field;
          }

          return;
        }
      }

      if (field.id === "motivation" && field.value.trim().length < 20) {
        showFieldError(field, "Votre réponse doit contenir au moins 20 caractères.");

        valid = false;

        if (!firstInvalidField) {
          firstInvalidField = field;
        }
      }
    });

    /* Validation des boutons radio. */
    var radioGroups = Array.prototype.slice.call(
      new Set(Array.prototype.slice.call(
        currentSection.querySelectorAll("input[type='radio'][required]")
      ).map(function (radio) {
        return radio.name;
      }))
    );

    radioGroups.forEach(function (groupName) {
      var radios = Array.prototype.slice.call(currentSection.querySelectorAll(
        'input[type="radio"][name="' + groupName + '"]'
      ));

      var isChecked = radios.some(function (radio) {
        return radio.checked;
      });

      if (!isChecked) {
        valid = false;

        var group = radios[0].closest(".form-group");

        if (group) {
          var error = group.querySelector(".field-error");

          if (error) {
            error.classList.add("visible");
          }
        }

        if (!firstInvalidField) {
          firstInvalidField = radios[0];
        }
      }
    });

    /* Validation des fichiers à l'étape Documents. */
    if (stepIndex === 3) {
      var cvInput = document.getElementById("cv");
      var letterInput = document.getElementById("letter");

      if (!validateFile(cvInput)) {
        valid = false;

        if (!firstInvalidField) {
          firstInvalidField = cvInput;
        }
      }

      if (!validateFile(letterInput)) {
        valid = false;

        if (!firstInvalidField) {
          firstInvalidField = letterInput;
        }
      }
    }

    if (firstInvalidField) {
      firstInvalidField.focus({ preventScroll: true });

      firstInvalidField.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }

    return valid;
  }

  /* ============================================
     BOUTONS SUIVANT / PRÉCÉDENT
     ============================================ */

  nextButton.addEventListener("click", function () {
    if (!validateStep(currentStep)) {
      return;
    }

    showStep(currentStep + 1);
  });

  previousButton.addEventListener("click", function () {
    showStep(currentStep - 1);
  });

  /* Permet de revenir directement à une étape depuis le récapitulatif. */
  Array.prototype.slice.call(document.querySelectorAll("[data-go-step]")).forEach(function (button) {
    button.addEventListener("click", function () {
      showStep(Number(button.dataset.goStep));
    });
  });

  /* ============================================
     EXPÉRIENCE PROFESSIONNELLE
     ============================================ */

  var experienceYes = document.getElementById("experience-yes");
  var experienceNo = document.getElementById("experience-no");

  var experienceDetailsGroup = document.getElementById("experience-details-group");

  function updateExperienceField() {
    var hasExperience = experienceYes.checked;

    experienceDetailsGroup.hidden = !hasExperience;

    var detailsField = document.getElementById("experienceDetails");

    if (!hasExperience && detailsField) {
      detailsField.value = "";
    }
  }

  experienceYes.addEventListener("change", updateExperienceField);
  experienceNo.addEventListener("change", updateExperienceField);

  /* ============================================
     COMPTEUR DE CARACTÈRES
     ============================================ */

  var motivationField = document.getElementById("motivation");
  var motivationCount = document.getElementById("motivation-count");

  motivationField.addEventListener("input", function () {
    var count = motivationField.value.length;

    motivationCount.textContent = count + (count > 1 ? " caractères" : " caractère");
  });

  /* ============================================
     GESTION DES FICHIERS
     ============================================ */

  var MAX_FILE_SIZE = 5 * 1024 * 1024;

  var allowedExtensions = ["pdf", "doc", "docx"];

  function getExtension(filename) {
    var parts = filename.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  }

  function formatFileSize(size) {
    if (size < 1024 * 1024) {
      return Math.round(size / 1024) + " Ko";
    }

    return (size / (1024 * 1024)).toFixed(2) + " Mo";
  }

  function setFileError(input, message) {
    var error = document.getElementById(input.id + "-error");

    error.textContent = message;
    error.classList.add("visible");
  }

  function clearFileError(input) {
    var error = document.getElementById(input.id + "-error");

    error.classList.remove("visible");
  }

  function validateFile(input) {
    var file = input.files[0];

    clearFileError(input);

    if (!file) {
      setFileError(
        input,
        input.id === "cv"
          ? "Veuillez joindre votre CV."
          : "Veuillez joindre votre lettre de motivation."
      );

      return false;
    }

    var extension = getExtension(file.name);

    if (allowedExtensions.indexOf(extension) === -1) {
      setFileError(input, "Format non accepté. Utilisez PDF, DOC ou DOCX.");

      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      setFileError(input, "Le fichier dépasse la limite de 5 Mo.");

      return false;
    }

    if (file.size === 0) {
      setFileError(input, "Le fichier sélectionné est vide.");

      return false;
    }

    return true;
  }

  function displaySelectedFile(input) {
    var file = input.files[0];

    var selectedContainer = document.getElementById(input.id + "-selected-file");
    var nameElement = document.getElementById(input.id + "-file-name");
    var sizeElement = document.getElementById(input.id + "-file-size");

    if (!file) {
      selectedContainer.classList.remove("visible");
      return;
    }

    nameElement.textContent = file.name;
    sizeElement.textContent = formatFileSize(file.size);

    selectedContainer.classList.add("visible");

    validateFile(input);
  }

  document.getElementById("cv").addEventListener("change", function () {
    displaySelectedFile(this);
  });

  document.getElementById("letter").addEventListener("change", function () {
    displaySelectedFile(this);
  });

  /* Supprimer un fichier sélectionné. */
  Array.prototype.slice.call(document.querySelectorAll("[data-remove-file]")).forEach(function (button) {
    button.addEventListener("click", function () {
      var inputId = button.dataset.removeFile;
      var input = document.getElementById(inputId);

      input.value = "";

      document.getElementById(inputId + "-selected-file").classList.remove("visible");

      clearFileError(input);
    });
  });

  /* ============================================
     RÉCAPITULATIF
     ============================================ */

  function getFieldValue(id) {
    var field = document.getElementById(id);

    if (!field) {
      return "—";
    }

    if (field.type === "radio") {
      var selected = document.querySelector('input[name="' + field.name + '"]:checked');

      return selected ? selected.value : "—";
    }

    return field.value.trim() || "—";
  }

  function addReviewItem(container, label, value, fullWidth) {
    var item = document.createElement("div");

    item.className = "review-item";

    if (fullWidth) {
      item.classList.add("full-width");
    }

    var labelElement = document.createElement("div");
    labelElement.className = "review-label";
    labelElement.textContent = label;

    var valueElement = document.createElement("div");
    valueElement.className = "review-value";
    valueElement.textContent = value;

    item.appendChild(labelElement);
    item.appendChild(valueElement);
    container.appendChild(item);
  }

  function fillReview(containerId, fields) {
    var container = document.getElementById(containerId);

    container.replaceChildren();

    fields.forEach(function (field) {
      addReviewItem(
        container,
        field.label,
        getFieldValue(field.id),
        Boolean(field.fullWidth)
      );
    });
  }

  function updateReview() {
    fillReview("review-personal", [
      { label: "Prénom", id: "firstName" },
      { label: "Nom", id: "lastName" },
      { label: "Adresse e-mail", id: "email" },
      { label: "Téléphone", id: "phone" },
      { label: "Ville", id: "city" },
      { label: "Date de naissance", id: "birthDate" }
    ]);

    fillReview("review-profile", [
      { label: "Niveau d'études", id: "education" },
      { label: "Domaine d'études", id: "fieldOfStudy" },
      { label: "Expérience professionnelle", id: "hasExperience" },
      { label: "Détails de l'expérience", id: "experienceDetails", fullWidth: true },
      { label: "Compétences", id: "skills", fullWidth: true }
    ]);

    fillReview("review-motivation", [
      { label: "Poste souhaité", id: "position" },
      { label: "Motivation", id: "motivation", fullWidth: true },
      { label: "Informations complémentaires", id: "additionalInfo", fullWidth: true }
    ]);

    updateReviewDocuments();
  }

  function updateReviewDocuments() {
    var container = document.getElementById("review-documents");

    container.replaceChildren();

    [
      { id: "cv", label: "Curriculum vitæ" },
      { id: "letter", label: "Lettre de motivation" }
    ].forEach(function (documentInfo) {
      var input = document.getElementById(documentInfo.id);
      var file = input.files[0];

      var row = document.createElement("div");
      row.className = "review-document";

      var icon = document.createElement("span");
      icon.className = "review-document-icon";
      icon.textContent = "📎";

      var details = document.createElement("div");

      var name = document.createElement("strong");
      name.textContent = file ? file.name : "Aucun fichier sélectionné";

      var size = document.createElement("small");
      size.textContent = file
        ? documentInfo.label + " · " + formatFileSize(file.size)
        : documentInfo.label + " · Document manquant";

      details.appendChild(name);
      details.appendChild(size);
      row.appendChild(icon);
      row.appendChild(details);

      container.appendChild(row);
    });
  }

  /* ============================================
     ENVOI DE DÉMONSTRATION
     ============================================ */

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!validateStep(currentStep)) {
      return;
    }

    var consent = document.getElementById("consent");
    var consentError = document.getElementById("consent-error");

    if (!consent.checked) {
      consentError.classList.add("visible");

      consent.focus();

      consent.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      return;
    }

    consentError.classList.remove("visible");

    var submitButton = document.getElementById("submit-button");
    var context = document.querySelector('meta[name="context-path"]')?.content || "/";
    context = context.replace(/\/$/, "");
    submitButton.disabled = true;
    fetch(context + "/api/candidatures", { method: "POST", body: new FormData(form) })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (body) {
          if (!response.ok) throw new Error(body.message || "L’envoi de la candidature a échoué.");
          return body;
        });
      })
      .then(function () {
        form.hidden = true;
        formFooter.hidden = true;
        progressSection.hidden = true;
        successScreen.classList.add("visible");
        successScreen.scrollIntoView({ behavior: "smooth", block: "center" });
      })
      .catch(function (error) {
        window.alert(error.message || "Impossible d’envoyer la candidature.");
      })
      .finally(function () { submitButton.disabled = false; });
  });

  /* ============================================
     INITIALISATION
     ============================================ */

  /* Pré-remplit le poste demandé depuis la page des offres (?poste=...). */
  function prefillPosition() {
    var positionField = document.getElementById("position");

    if (!positionField || positionField.value) return;

    var params = new URLSearchParams(window.location.search);
    var poste = params.get("poste");
    var offreId = params.get("offreId");

    if (poste) {
      positionField.value = poste;
    }
    var offerIdField = document.getElementById("offerId");
    if (offerIdField && offreId) offerIdField.value = offreId;
  }

  function init() {
    prefillPosition();
    showStep(0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
