function initDirectionDecision() {
  var requestId = window.currentPageId;
  var context = document.querySelector('meta[name="context-path"]')?.content || '/';
  if (!context.endsWith('/')) context += '/';
  var dossier = document.body?.getAttribute('data-dossier') || '';
  var backLinks = document.querySelectorAll('[data-page="detail-demande"], [data-page="demandes-en-attente"]');
  backLinks.forEach(function (link) {
    if (!requestId) return;
    link.dataset.id = requestId;
    link.href = '#page=' + link.dataset.page + '&id=' + encodeURIComponent(requestId);
  });

  function display(id, value) {
    var element = document.getElementById(id);
    if (element) element.textContent = value == null || value === '' ? 'Non renseigné' : value;
  }

  if (requestId) {
    fetch(context + dossier + '/api/besoins/' + encodeURIComponent(requestId), { headers: { Accept: 'application/json' } })
      .then(function (response) {
        if (!response.ok) throw new Error('Demande introuvable.');
        return response.json();
      })
      .then(function (demande) {
        display('decision-reference', 'DEM-' + demande.id);
        display('decision-poste', demande.poste);
        display('decision-departement', demande.departement);
        display('decision-effectif', demande.effectif == null ? null : demande.effectif + (demande.effectif === 1 ? ' personne' : ' personnes'));
        var cout = demande.coutAnnuelTotal;
        display('decision-cout-total', cout == null ? null : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(cout) + ' Ar / an');
      })
      .catch(function (error) { display('decision-reference', error.message); });
  } else {
    display('decision-reference', 'Aucune demande sélectionnée');
  }

  var form = document.getElementById('decision-form');
  var box = document.getElementById('decision-feedback');
  if (!form) return;
  function say(msg, ok) { box.hidden = false; box.textContent = msg; box.style.background = ok ? 'var(--success-bg)' : 'var(--orange-50)'; box.style.borderLeftColor = ok ? 'var(--success)' : 'var(--orange)'; box.style.color = ok ? 'var(--success)' : '#5c3d00'; }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = form.querySelector('input[name="decision"]:checked');
    if (!d) { say('Veuillez sélectionner une décision.', false); return; }
    if (!requestId) { say('Aucune demande sélectionnée.', false); return; }
    var button = document.getElementById('btn-confirmer');
    button.disabled = true;
    fetch(context + 'api/direction/besoins/' + encodeURIComponent(requestId) + '/decision', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ decision: d.value })
    }).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.message || 'Impossible d’enregistrer la décision.');
        say(data.message || 'Décision enregistrée.', true);
        form.querySelectorAll('input[name="decision"]').forEach(function (input) { input.disabled = true; });
      });
    }).catch(function (error) { say(error.message, false); button.disabled = false; });
  });

}

function initDirectionDashboard(event) {
  if (event && event.detail && event.detail.page !== "welcome") return;
  var pending = document.getElementById("direction-stat-pending");
  if (!pending) return;
  var meta = document.querySelector('meta[name="context-path"]');
  var base = (meta ? meta.getAttribute("content") || "" : "").replace(/\/$/, "");
  fetch(base + "/api/direction/resume", { headers: { Accept: "application/json" } })
    .then(function (response) {
      if (!response.ok) throw new Error("Chargement du tableau de bord impossible.");
      return response.json();
    })
    .then(function (resume) {
      document.getElementById("direction-stat-pending").textContent = resume.enAttente;
      document.getElementById("direction-stat-approved").textContent = resume.approuvees;
      document.getElementById("direction-stat-refused").textContent = resume.refusees;
      document.getElementById("direction-stat-progress").textContent = resume.enCours;
      document.getElementById("direction-stat-budget").textContent =
        new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(resume.budgetAapprouver) + " Ar";
    })
    .catch(function (error) {
      ["pending", "approved", "refused", "progress", "budget"].forEach(function (key) {
        var element = document.getElementById("direction-stat-" + key);
        if (element) element.textContent = "—";
      });
      pending.title = error.message;
    });
}

document.addEventListener("pageLoaded", function (event) { if (event.detail && event.detail.page === "decision") initDirectionDecision(); });
document.addEventListener("pageLoaded", initDirectionDashboard);
