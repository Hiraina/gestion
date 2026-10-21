/* Chemin de contexte de l'application, injecté par Thymeleaf (meta context-path).
   Évite les URLs relatives qui cassent dès que le context path change. */
function appBaseUrl() {
  var meta = document.querySelector('meta[name="context-path"]');
  var path = meta ? meta.getAttribute("content") || "/" : "/";
  if (path.charAt(path.length - 1) !== "/") path += "/";
  return path;
}

const users = [
  { email: "direction@gmail.com", password: "direction123", role: "direction", view: "Responsable-Direction/template.html" },
  { email: "finance@gmail.com", password: "finance123", role: "finance", view: "Responsable-Finance/template.html" },
  { email: "manager@gmail.com", password: "manager123", role: "manager", view: "Responsable-Manager/template.html" },
  { email: "rh@gmail.com", password: "rh123", role: "rh", view: "Responsable-RH/template.html" }
];

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("login-form");
  const errorMessage = document.getElementById("error-message");
  const emailInput = document.getElementById("email");
  const passwordInput = document.getElementById("password");
  const toggle = document.getElementById("password-toggle");

  function showError(text) {
    errorMessage.textContent = text;
    errorMessage.style.display = text ? "block" : "none";
  }

  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      showError("Veuillez renseigner votre adresse e-mail et votre mot de passe.");
      return;
    }

    const user = users.find((u) => u.email === email && u.password === password);

    if (user) {
      window.location.href = appBaseUrl() + user.view;
    } else {
      showError("Adresse e-mail ou mot de passe incorrect.");
    }
  });

  if (toggle) {
    toggle.addEventListener("click", () => {
      const visible = passwordInput.type === "text";
      passwordInput.type = visible ? "password" : "text";
      toggle.textContent = visible ? "Afficher" : "Masquer";
      toggle.setAttribute("aria-label", visible ? "Afficher le mot de passe" : "Masquer le mot de passe");
    });
  }

  document.querySelectorAll(".demo-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      emailInput.value = chip.dataset.email;
      passwordInput.value = chip.dataset.password;
      showError("");
      passwordInput.focus();
    });
  });
});
