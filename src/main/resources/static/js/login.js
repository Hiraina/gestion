/* Page de connexion : l'authentification est gérée par le backend
   (POST /api/login, formulaire th:action). Ce script ne fait que :
     - afficher le message d'erreur renvoyé par le backend (?error)
     - afficher / masquer le mot de passe
     - pré-remplir le formulaire via les raccourcis de démonstration */

document.addEventListener("DOMContentLoaded", () => {
  const errorMessage = document.getElementById("error-message");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const toggle = document.getElementById("password-toggle");

  function showError(text) {
    if (!errorMessage) return;
    errorMessage.textContent = text;
    errorMessage.style.display = text ? "block" : "none";
  }

  /* Le backend redirige vers /login?error si les identifiants sont invalides. */
  if (window.location.search.indexOf("error") !== -1) {
    showError("Adresse e-mail ou mot de passe incorrect.");
  }

  if (toggle && passwordInput) {
    toggle.addEventListener("click", () => {
      const visible = passwordInput.type === "text";
      passwordInput.type = visible ? "password" : "text";
      toggle.textContent = visible ? "Afficher" : "Masquer";
      toggle.setAttribute("aria-label", visible ? "Afficher le mot de passe" : "Masquer le mot de passe");
    });
  }

  /* Raccourcis : un clic remplit l'e-mail et le mot de passe du compte choisi. */
  document.querySelectorAll(".demo-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      if (!emailInput || !passwordInput) return;
      emailInput.value = chip.dataset.email;
      passwordInput.value = chip.dataset.password;
      showError("");
      passwordInput.focus();
    });
  });
});
