(function () {
  "use strict";

  const ARTICLE_LIST = [
    ["ctArticle1", "Article 1 — Poste et fonctions"],
    ["ctArticle2", "Article 2 — Durée du contrat"],
    ["ctArticle3", "Article 3 — Rémunération"],
    ["ctArticle4", "Article 4 — Horaires et lieu de travail"],
    ["ctArticle5", "Article 5 — Obligations des parties"],
    ["ctArticle6", "Article 6 — Avantages complémentaires"],
    ["ctArticle7", "Article 7 — Dispositions complémentaires"],
  ];
  const token = new URLSearchParams(window.location.search).get("token");
  const context = (document.querySelector('meta[name="context-path"]')?.content || "").replace(/\/$/, "");
  const accessView = document.getElementById("accessView");
  const contractView = document.getElementById("contractView");
  const formView = document.getElementById("formView");
  const submittedView = document.getElementById("submittedView");
  let identity = null;

  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

  function showError(message) {
    const error = document.getElementById("accessError");
    error.textContent = message;
    error.hidden = false;
  }

  async function api(path, options) {
    const response = await fetch(context + path, {
      ...options,
      headers: { Accept: "application/json", "Content-Type": "application/json", ...(options?.headers || {}) },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "La demande n’a pas pu être traitée.");
    return body;
  }

  function renderContract(data) {
    document.getElementById("candidateNameHeading").textContent = data.candidateName || identity.name;
    document.getElementById("jobValue").textContent = data.job || "—";
    document.getElementById("typeValue").textContent = data.type || "—";
    document.getElementById("contractDetails").innerHTML = `
      <h2>Informations du contrat</h2>
      <dl class="contract-data">
        <div><dt>Employeur</dt><dd>${esc(data.companyName)}</dd></div>
        <div><dt>Adresse</dt><dd>${esc(data.companyAddress)}</dd></div>
        <div><dt>Durée</dt><dd>${esc(data.duration)}</dd></div>
        <div><dt>Date de début</dt><dd>${esc(data.startDate)}</dd></div>
        <div><dt>Lieu de travail</dt><dd>${esc(data.location)}</dd></div>
        <div><dt>Rémunération mensuelle</dt><dd>${esc(data.salary)}</dd></div>
        <div><dt>Horaires</dt><dd>${esc(data.hours)}</dd></div>
        <div><dt>Avantages</dt><dd>${esc(data.benefits)}</dd></div>
      </dl>`;
    document.getElementById("articlesContainer").innerHTML = ARTICLE_LIST.map(([id, title], index) => `
      <article class="article">
        <header class="article-head"><h3>${esc(title)}</h3><span class="article-number">Article ${index + 1} sur ${ARTICLE_LIST.length}</span></header>
        <div class="article-body">
          <div class="article-text">${esc(data.articles?.[id] || "")}</div>
          <div class="article-response">
            <label>Votre réponse</label>
            <div class="options">
              <label class="option"><input type="radio" name="answer_${id}" value="accepted"> Accepter</label>
              <label class="option"><input type="radio" name="answer_${id}" value="refused"> Refuser</label>
              <label class="option"><input type="radio" name="answer_${id}" value="modify"> Proposer une modification</label>
            </div>
            <div class="comment-wrap" id="commentWrap_${id}" hidden>
              <label for="comment_${id}">Expliquez votre refus ou la modification souhaitée</label>
              <textarea id="comment_${id}" maxlength="5000" placeholder="Votre commentaire..."></textarea>
            </div>
          </div>
        </div>
      </article>`).join("");
    document.getElementById("statusValue").textContent = "Réponse attendue";
    accessView.hidden = true;
    contractView.hidden = false;
    updateProgress();
  }

  function updateProgress() {
    const count = ARTICLE_LIST.filter(([id]) => document.querySelector(`input[name="answer_${id}"]:checked`)).length;
    document.getElementById("progressLabel").textContent = `${count} / ${ARTICLE_LIST.length} réponses`;
  }

  function collectAnswers() {
    const answers = {};
    for (const [id, title] of ARTICLE_LIST) {
      const choice = document.querySelector(`input[name="answer_${id}"]:checked`)?.value;
      const comment = document.getElementById(`comment_${id}`)?.value.trim() || "";
      if (!choice) throw new Error(`Choisissez une réponse pour ${title}.`);
      if (choice !== "accepted" && !comment) throw new Error(`Ajoutez une explication pour ${title}.`);
      answers[id] = { title, choice, comment };
    }
    return answers;
  }

  function responseHtml(answers, generalComment) {
    const labels = { accepted: "Accepté", refused: "Refusé", modify: "Modification proposée" };
    return ARTICLE_LIST.map(([id, title]) => {
      const answer = answers?.[id] || {};
      return `<div class="response-summary-item"><strong>${esc(title)}</strong><p>${esc(labels[answer.choice] || "Réponse enregistrée")}</p>${answer.comment ? `<div>${esc(answer.comment)}</div>` : ""}</div>`;
    }).join("") + (generalComment ? `<p><strong>Commentaire général :</strong><br>${esc(generalComment)}</p>` : "");
  }

  function showSubmitted(response, responseDate) {
    formView.hidden = true;
    submittedView.classList.add("show");
    document.getElementById("statusValue").textContent = "Réponse transmise";
    const when = responseDate || response?.submittedAt;
    document.getElementById("submittedText").textContent = when
      ? `Votre réponse a été enregistrée le ${new Date(when).toLocaleString("fr-FR")} et transmise à l’équipe RH.`
      : "Votre réponse a été enregistrée et transmise à l’équipe RH.";
    document.getElementById("submittedSummary").innerHTML = responseHtml(response?.articles, response?.generalComment);
  }

  document.getElementById("accessForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!token) return showError("Le lien du contrat est incomplet. Demandez un nouveau lien à l’équipe RH.");
    const button = document.getElementById("accessButton");
    button.disabled = true;
    button.textContent = "Vérification…";
    document.getElementById("accessError").hidden = true;
    identity = {
      name: document.getElementById("identityName").value.trim(),
      email: document.getElementById("identityEmail").value.trim(),
    };
    try {
      const data = await api(`/api/candidat/contrats/${encodeURIComponent(token)}/acces`, {
        method: "POST", body: JSON.stringify(identity),
      });
      renderContract(data.contract);
      if (data.status === "REPONSE_RECUE" && data.response) showSubmitted(data.response, data.responseDate);
    } catch (error) {
      showError(error.message);
    } finally {
      button.disabled = false;
      button.textContent = "Accéder au contrat";
    }
  });

  document.getElementById("articlesContainer").addEventListener("change", (event) => {
    const input = event.target;
    if (!input.matches('input[type="radio"]')) return;
    const articleId = input.name.replace("answer_", "");
    const wrap = document.getElementById(`commentWrap_${articleId}`);
    wrap.hidden = input.value === "accepted";
    updateProgress();
  });

  document.querySelector('[data-js-action="previewResponses"]').addEventListener("click", () => {
    try {
      const summary = responseHtml(collectAnswers(), document.getElementById("generalComment").value.trim());
      document.getElementById("previewContent").innerHTML = summary;
      document.getElementById("previewModal").classList.add("show");
    } catch (error) {
      window.alert(error.message);
    }
  });
  document.querySelector('[data-js-action="closePreview"]').addEventListener("click", () => document.getElementById("previewModal").classList.remove("show"));

  document.querySelector('[data-js-action="submitResponses"]').addEventListener("click", async (event) => {
    if (!document.getElementById("confirmRead").checked) return window.alert("Confirmez d’abord que vous avez lu le contrat.");
    let articles;
    try { articles = collectAnswers(); } catch (error) { return window.alert(error.message); }
    const button = event.currentTarget;
    button.disabled = true;
    try {
      await api(`/api/candidat/contrats/${encodeURIComponent(token)}/reponse`, {
        method: "POST",
        body: JSON.stringify({ ...identity, articles, generalComment: document.getElementById("generalComment").value.trim() }),
      });
      showSubmitted({ articles, generalComment: document.getElementById("generalComment").value.trim() });
    } catch (error) {
      window.alert(error.message);
      button.disabled = false;
    }
  });

  if (!token) showError("Le lien du contrat est incomplet. Demandez un nouveau lien à l’équipe RH.");
})();
