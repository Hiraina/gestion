(function () {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }

  function initDemandesList() {
    var tbody = document.getElementById('demandes-tbody');
    var countEl = document.getElementById('finance-demand-count');
    var countFoot = document.getElementById('finance-demand-count-foot');
    if (!tbody) return;

    function showError(msg) {
      tbody.innerHTML = '<tr><td colspan="8" style="color:#b00020;padding:12px">' + msg + '</td></tr>';
      if (countEl) countEl.textContent = msg;
      if (countFoot) countFoot.textContent = '';
    }

    fetch(appBaseUrl() + 'api/finance/demandes-a-examiner')
      .then(function (r) {
        if (!r.ok) throw new Error('Erreur serveur : ' + r.status);
        return r.json();
      })
      .then(function (list) {
        tbody.innerHTML = '';
        if (!list || list.length === 0) {
          showError('Aucune demande en attente d\'examen par la Finance.');
          if (countEl) countEl.textContent = 'Aucune demande en attente';
          if (countFoot) countFoot.textContent = '0 demande';
          return;
        }
        (list || []).forEach(function (d, i) {
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td class="ref">DEM-' + String(d.id).padStart(3, '0') + '</td>' +
            '<td>' + (d.poste || '—') + '</td>' +
            '<td class="num">' + (d.personnes || d.effectif || 1) + '</td>' +
            '<td class="num">' + fmtMoney(d.budget_estime || d.salaire_annuel_demande) + '</td>' +
            '<td>' + (d.manager || '—') + '</td>' +
            '<td>' + (d.soumission || '—') + '</td>' +
            '<td><span class="ui-badge is-pending">' + (d.statut || 'En attente') + '</span></td>' +
            '<td><a href="#page=examen-financier&id=' + d.id + '" data-page="examen-financier" data-id="' + d.id + '" class="ui-btn ui-btn-outline ui-btn-sm">Consulter</a></td>';
          tbody.appendChild(tr);
        });
        if (countEl) countEl.textContent = list.length + ' demande(s) à examiner';
        if (countFoot) countFoot.textContent = list.length + ' demande(s)';
      })
      .catch(function (err) {
        console.error('Erreur API demandes-a-examiner:', err);
        showError('Impossible de charger les demandes : ' + err.message);
      });
  }

  function initExamenDetail(idBesoin) {
    if (!idBesoin) return;

    var idBudgetFinance = 0;

    fetch(appBaseUrl() + 'api/finance/examen-financier?id=' + encodeURIComponent(idBesoin))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        idBudgetFinance = d.id_budget || 0;
        document.getElementById('finance-exam-title').textContent = 'Examen financier — DEM-' + String(d.reference || d.id || idBesoin).padStart(3, '0');
        document.getElementById('ex-ref').textContent = 'DEM-' + String(d.reference || d.id || idBesoin).padStart(3, '0');
        document.getElementById('ex-poste').textContent = d.poste_concerne || d.poste || '—';
        document.getElementById('ex-effectif').textContent = d.nombre_personnes || d.effectif || 1;
        document.getElementById('ex-motif').textContent = d.motif || '—';
        document.getElementById('ex-salaire').textContent = fmtMoney(d.salaire_mensuel_reference || d.salaire_min) + ' / mois';
        document.getElementById('ex-cout').textContent = fmtMoney(d.coutAnnuelTotal) + ' / an';
        document.getElementById('ex-budget').textContent = fmtMoney(d.ecartDisponible) + ' (écart disponible)';
        document.getElementById('ex-justif').textContent = d.commentaire || d.motif || '—';

        document.getElementById('ex-ecart').textContent = fmtMoney(d.ecartDisponible);
        document.getElementById('ex-cout-annuel').textContent = fmtMoney(d.coutAnnuelTotal);
        var resultatEl = document.getElementById('ex-resultat');
        if (d.valide === true) {
          resultatEl.textContent = '✅ VALIDE — Le coût annuel est inférieur à l\'écart disponible.';
          resultatEl.style.color = 'var(--success)';
        } else {
          resultatEl.textContent = '❌ NON VALIDE — Le coût annuel dépasse l\'écart disponible.';
          resultatEl.style.color = '#b00020';
        }

        if (d.valide === false) {
          var rb = document.getElementById('finance-valider');
          if (rb && rb.parentElement) rb.parentElement.style.display = 'none';
        }
      })
      .catch(function (err) {
        document.getElementById('finance-exam-title').textContent = 'Examen financier — erreur';
        document.getElementById('ex-analyse').innerHTML = '<div class="ui-detail-row"><dt>État</dt><dd style="color:#b00020">Impossible de charger l\'analyse : ' + err.message + '</dd></div>';
      });

    var form = document.getElementById('finance-form');
    var box = document.getElementById('finance-feedback');
    if (form) {
      function say(msg, ok) { box.hidden = !msg; box.textContent = msg || ''; box.style.background = ok ? 'var(--success-bg)' : 'var(--orange-50)'; box.style.borderLeftColor = ok ? 'var(--success)' : 'var(--orange)'; box.style.color = ok ? 'var(--success)' : '#5c3d00'; }
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var decision = form.querySelector('input[name="finance-decision"]:checked');
        var comment = document.getElementById('finance-commentaire').value.trim();
        if (!decision) { say('Veuillez sélectionner une décision.', false); return; }
        if ((decision.value === 'refuser' || decision.value === 'correction') && !comment) { say('Un commentaire est obligatoire en cas de refus ou de demande de correction.', false); return; }
        var params = new URLSearchParams();
        params.set('idProposition', idBesoin);
        params.set('idBudget', idBudgetFinance);
        params.set('salaireAnnuelDemande', '0');
        params.set('decision', decision.value);
        params.set('commentaire', comment);
        params.set('idFinancier', '1');
        fetch(appBaseUrl() + 'api/finance/decision?' + params.toString())
          .then(function () { say('Décision enregistrée : ' + decision.parentNode.textContent.trim() + '.', true); })
          .catch(function (err) { say('Erreur : ' + err.message, false); });
      });
    }
  }

  function handlePageLoaded(page, id) {
    if (page === 'demandes-a-examiner') {
      initDemandesList();
    }
    if (page === 'examen-financier') {
      initExamenDetail(id);
    }
  }

  document.addEventListener('pageLoaded', function (e) {
    handlePageLoaded(e.detail.page, e.detail.id);
  });

  function initFromHash() {
    var hash = window.location.hash || '';
    var pageMatch = hash.match(/page=([^&]+)/);
    var idMatch = hash.match(/id=([^&]+)/);
    var page = pageMatch ? decodeURIComponent(pageMatch[1]) : 'welcome';
    var id = idMatch ? decodeURIComponent(idMatch[1]) : '';
    handlePageLoaded(page, id);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFromHash);
  } else {
    initFromHash();
  }
})();
