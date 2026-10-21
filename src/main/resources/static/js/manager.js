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
    say(
      action === "brouillon"
        ? "Votre demande a été enregistrée dans vos brouillons."
        : "Votre demande a été soumise. Vous pouvez suivre son avancement dans « Suivi de mes demandes ».",
      true
    );
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
