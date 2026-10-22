/* Formulaire de demande de besoin : navigation en 3 étapes avec validation. */
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
    const formData = new URLSearchParams(new FormData(form));

    const baseMeta = document.querySelector('meta[name="context-path"]');
    let contextPath = baseMeta ? baseMeta.getAttribute("content") || "/" : "/";
    if (!contextPath.endsWith("/")) contextPath += "/";
    const dossier = document.body ? document.body.getAttribute("data-dossier") || "" : "";
    const endpoint = contextPath + dossier + "/pages/demande_besoin/soumettre";

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: formData
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
