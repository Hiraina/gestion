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
      tbody.innerHTML = '<tr><td colspan="7" style="color:#b00020;padding:12px">' + msg + '</td></tr>';
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

    fetch(appBaseUrl() + 'api/finance/examen-financier?id=' + encodeURIComponent(idBesoin))
      .then(function (r) { return r.json(); })
      .then(function (d) {
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
        if (!decision) { say('Veuillez sélectionner une décision.', false); return; }
        var submitButton = document.getElementById('btn-valider-finance');
        submitButton.disabled = true;
        fetch(appBaseUrl() + 'api/finance/besoins/' + encodeURIComponent(idBesoin) + '/decision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ decision: decision.value })
        }).then(function (response) {
          return response.json().catch(function () { return {}; }).then(function (data) {
            if (!response.ok) throw new Error(data.message || 'Impossible d’enregistrer la décision.');
            say(decision.value === 'valider' ? 'Demande validée par la Finance.' : 'Demande refusée.', true);
            window.setTimeout(function () {
              if (decision.value === 'valider') {
                window.location.href = appBaseUrl() + 'Responsable-RH/template.html#page=liste-demandes';
              } else {
                window.location.hash = '#page=demandes-a-examiner';
              }
            }, 700);
          });
        }).catch(function (err) { say('Erreur : ' + err.message, false); submitButton.disabled = false; });
      });
    }
  }

  function initFinanceWelcome() {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }
  fetch(appBaseUrl() + 'api/finance/welcome')
    .then(function (r) { return r.json(); })
    .then(function (d) {
      document.getElementById('stat-demandes-attente').textContent = d.demandes_attente || 0;
      document.getElementById('stat-budgets-valides').textContent = d.budgets_valides || 0;
      document.getElementById('stat-demandes-retournees').textContent = d.demandes_retournees || 0;
      document.getElementById('stat-budget-demande').textContent = fmtMoney(d.budget_demande) ;
      document.getElementById('stat-budget-approuve').textContent = fmtMoney(d.budget_approuve) ;
      document.getElementById('stat-budget-restant').textContent = fmtMoney(d.budget_restant) ;
    });
  fetch(appBaseUrl() + 'api/finance/demandes-a-examiner')
    .then(function (r) { return r.json(); })
    .then(function (list) {
      var tbody = document.getElementById('welcome-demandes-tbody');
      tbody.innerHTML = '';
      (list || []).slice(0, 4).forEach(function (d, i) {
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
    });

  }
  function initSuiviBudgetsRecrutement() {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }
  function load() {
    fetch(appBaseUrl() + 'api/finance/suivi-budgets-recrutement')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var totalPrev = 0, totalReel = 0, n = 0;
        var tbody = document.getElementById('budget-tbody');
        tbody.innerHTML = '';
        (list || []).forEach(function (d) {
          var prev = Number(d.budget_prev || 0);
          var reel = Number(d.cout_reel || 0);
          totalPrev += prev;
          totalReel += reel;
          n++;
          var ecart = prev - reel;
          var ecartCls = ecart < 0 ? 'is-danger' : ecart > 0 ? 'is-success' : 'is-neutral';
          var ecartSign = ecart < 0 ? '' : ecart > 0 ? '+' : '';
          var statutCls = (d.statut === 'Terminé' || d.statut === 'valide') ? 'is-success' : 'is-pending';
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td class="ref">DEM-' + String(d.reference || d.id || '—').padStart(3, '0') + '</td>' +
            '<td>' + (d.poste || '—') + '</td>' +
            '<td class="num">' + (d.effectif || d.nombre_postes || 1) + '</td>' +
            '<td class="num">' + fmtMoney(prev) + '</td>' +
            '<td class="num">' + (reel > 0 ? fmtMoney(reel) : '—') + '</td>' +
            '<td><span class="ui-badge ' + statutCls + '">' + (d.statut || 'En cours') + '</span> ' + (ecart !== 0 ? '<span class="ui-badge ' + ecartCls + '">' + ecartSign + fmtMoney(Math.abs(ecart)) + '</span>' : '') + '</td>' +
            '<td><span class="ui-badge ' + statutCls + '">' + (d.statut || 'En cours') + '</span></td>' +
            '<td><a href="#page=examen-financier&id=' + d.reference + '" data-page="examen-financier" data-id="' + d.reference + '" class="ui-btn ui-btn-outline ui-btn-sm">Consulter</a></td>';
          tbody.appendChild(tr);
        });
        var ecartGlobal = totalPrev - totalReel;
        document.getElementById('sb-budget-total').textContent = fmtMoney(totalPrev) + ' <small>Ar</small>';
        document.getElementById('sb-budget-note').textContent = n + ' recrutements';
        document.getElementById('sb-cout-reel').textContent = fmtMoney(totalReel) + ' <small>Ar</small>';
        document.getElementById('sb-cout-note').textContent + ' recrutements chiffrés';
        document.getElementById('sb-ecart').textContent = (ecartGlobal < 0 ? '−' : ecartGlobal > 0 ? '+' : '') + fmtMoney(Math.abs(ecartGlobal)) + ' <small>Ar</small>';
        document.getElementById('sb-ecart-note').textContent = ecartGlobal < 0 ? 'Sous le budget' : ecartGlobal > 0 ? 'Au-dessus du budget' : 'À l\'équilibre';
        document.getElementById('sb-nb').textContent = n;
        document.getElementById('budget-total-text').textContent = n + ' recrutements suivis';
      });
  }
  load();

  }
  function initSuiviCoutsContrats() {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }
  function load() {
    fetch(appBaseUrl() + 'api/finance/suivi-couts-contrats')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var total = 0, n = 0, echeance = 0;
        var types = new Set();
        var tbody = document.getElementById('contrat-tbody');
        tbody.innerHTML = '';
        (list || []).forEach(function (d) {
          types.add(d.contrat);
          total += Number(d.cout_estime || 0);
          n++;
          var actif = (d.statut === 'Actif');
          if (!actif) echeance++;
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td class="ref">C-' + String(d.reference || d.id || '—').padStart(3, '0') + '</td>' +
            '<td>' + (d.poste || '—') + '</td>' +
            '<td>' + (d.contrat || '—') + '</td>' +
            '<td>' + (d.debut || '—') + '</td>' +
            '<td>' + (d.fin || '—') + '</td>' +
            '<td class="num">' + fmtMoney(d.salaire_prev || d.salaire_mensuel) + '</td>' +
            '<td class="num">' + fmtMoney(d.cout_estime || d.salaire_annuel) + '</td>' +
            '<td><span class="ui-badge ' + (actif ? 'is-success' : 'is-pending') + '">' + (d.statut || '—') + '</span></td>' +
            '<td><a href="#page=couts-nouvelles-embauches" data-page="couts-nouvelles-embauches" class="ui-btn ui-btn-outline ui-btn-sm">Consulter</a></td>';
          tbody.appendChild(tr);
        });
        document.getElementById('cc-contrats').textContent = n;
        document.getElementById('cc-cout-total').textContent = fmtMoney(total) + ' <small>Ar</small>';
        document.getElementById('cc-a-venir').textContent = fmtMoney(total) + ' <small>Ar</small>';
        document.getElementById('cc-echeance').textContent = echeance;
        document.getElementById('cc-sub').textContent = n + ' contrats en suivi';
        document.getElementById('cc-total').textContent = n + ' contrats';
      });
  }
  load();

  }
  function initRapportCoutsPersonnel() {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }
  function bar(container, items) {
    var el = document.getElementById(container);
    if (!el) return;
    el.innerHTML = '';
    var max = Math.max.apply(null, items.map(function (i) { return i.v; })) || 1;
    items.forEach(function (i) {
      var pct = Math.round((i.v / max) * 100);
      var row = document.createElement('div');
      row.className = 'ui-bar-row';
      row.innerHTML =
        '<div class="ui-bar-meta"><span>' + i.l + '</span><span>' + fmtMoney(i.v) + '</span></div>' +
        '<div class="ui-bar ' + (i.accent ? 'is-accent' : '') + '" role="img" aria-label="' + i.l + ' : ' + fmtMoney(i.v) + '"><i style="width:' + pct + '%"></i></div>';
      el.appendChild(row);
    });
  }
  function load() {
    fetch(appBaseUrl() + 'api/finance/rapport-couts-personnel')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var prev = Number(d.couts_previsionnels || 0);
        var reel = Number(d.couts_reels || 0);
        var ecart = reel - prev;
        document.getElementById('rc-previsionnel').textContent = fmtMoney(prev) + ' <small>Ar</small>';
        document.getElementById('rc-reel').textContent = fmtMoney(reel) + ' <small>Ar</small>';
        document.getElementById('rc-avenir').textContent = fmtMoney(Math.max(0, prev - reel)) + ' <small>Ar</small>';
        document.getElementById('rc-ecart').textContent = (ecart < 0 ? '−' : ecart > 0 ? '+' : '') + fmtMoney(Math.abs(ecart)) + ' <small>Ar</small>';
        document.getElementById('rc-ecart-note').textContent = ecart < 0 ? 'Sous le budget' : ecart > 0 ? 'Au-dessus du budget' : 'À l\'équilibre';
        bar('rc-bars-prev-reel', [
          { l: 'Prévisionnel', v: prev, accent: true },
          { l: 'Réel', v: reel, accent: true }
        ]);
        bar('rc-bars-categorie', [
          { l: 'Personnel existant', v: reel * 0.65 },
          { l: 'Coûts CDI', v: reel * 0.2 },
          { l: 'Nouvelles embauches', v: reel * 0.1 },
          { l: 'Coûts CDD', v: reel * 0.05 }
        ]);
      });

    fetch(appBaseUrl() + 'api/finance/suivi-couts-contrats')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var tbody = document.getElementById('rc-echeances-tbody');
        tbody.innerHTML = '';
        (list || []).filter(function (d) { return d.fin; }).slice(0, 6).forEach(function (d) {
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td class="ref">C-' + String(d.reference || d.id || '—').padStart(3, '0') + '</td>' +
            '<td>' + (d.poste || '—') + '</td>' +
            '<td>' + (d.contrat || '—') + '</td>' +
            '<td>' + d.fin + '</td>' +
            '<td class="num">' + fmtMoney(d.cout_estime || d.salaire_annuel) + '</td>' +
            '<td><span class="ui-badge is-pending">À échéance</span></td>';
          tbody.appendChild(tr);
        });
      });
  }
  load();

  }
  function initCoutsNouvellesEmbauches() {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }
  function statutLabel(s) {
    var m = { '1': 'En attente', '2': 'Pris en compte', '3': 'Refusée', '4': 'Contre proposition', '5': 'Annulée' };
    return m[s] || s || '—';
  }
  function statutCls(s) {
    if (s === '2' || s === 'Pris en compte') return 'is-success';
    if (s === '1' || s === 'En attente') return 'is-pending';
    if (s === '3' || s === 'Refusée' || s === 'Refusee') return 'is-danger';
    return 'is-neutral';
  }
  function load() {
    fetch(appBaseUrl() + 'api/finance/couts-nouvelles-embauches')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var total = 0, attente = 0, pris = 0;
        var depts = new Set();
        var tbody = document.getElementById('embauche-tbody');
        tbody.innerHTML = '';
        (list || []).forEach(function (d) {
          if (d.departement) depts.add(d.departement);
          var statut = d.statut;
          if (statut === 'Pris en compte') { pris++; total += Number(d.cout_estime || 0); }
          else if (statut === 'En attente') { attente++; }
          total += Number(d.cout_estime || 0);
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td class="ref">E-' + String(d.reference || d.id || '—').padStart(3, '0') + '</td>' +
            '<td>' + (d.poste || '—') + '</td>' +
            '<td>' + (d.departement || '—') + '</td>' +
            '<td>' + (d.entree || '—') + '</td>' +
            '<td class="num">' + fmtMoney(d.salaire_prevu || d.salaire_mensuel_propose) + '</td>' +
            '<td class="num">' + fmtMoney(d.cout_estime || d.salaire_annuel_propose) + '</td>' +
            '<td><span class="ui-badge ' + statutCls(statut) + '">' + statutLabel(statut) + '</span></td>' +
            '<td><a href="#page=examen-financier&id=' + d.reference + '" data-page="examen-financier" data-id="' + d.reference + '" class="ui-btn ui-btn-outline ui-btn-sm">Consulter</a></td>';
          tbody.appendChild(tr);
        });
        var sel = document.getElementById('embauche-filter-departement');
        Array.from(sel.options).forEach(function (o) { if (o.value !== '') o.remove(); });
        depts.forEach(function (dp) {
          var o = document.createElement('option'); o.value = dp; o.textContent = dp; sel.appendChild(o);
        });
        document.getElementById('ce-embauches').textContent = (list || []).length;
        document.getElementById('ce-cout-total').textContent = fmtMoney(total) + ' <small>Ar</small>';
        document.getElementById('ce-attente').textContent = attente;
        document.getElementById('ce-pris-en-compte').textContent = pris;
        document.getElementById('ce-sub').textContent = (list || []).length + ' embauches en suivi';
        document.getElementById('ce-total').textContent = (list || []).length + ' embauches';
      });
  }
  load();

  }
  function initRapportFinancier() {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }
  function bar(container, items) {
    var el = document.getElementById(container);
    if (!el) return;
    el.innerHTML = '';
    var max = Math.max.apply(null, items.map(function (i) { return i.v; })) || 1;
    items.forEach(function (i) {
      var pct = Math.round((i.v / max) * 100);
      var row = document.createElement('div');
      row.className = 'ui-bar-row';
      row.innerHTML =
        '<div class="ui-bar-meta"><span>' + i.l + '</span><span>' + fmtMoney(i.v) + '</span></div>' +
        '<div class="ui-bar" role="img" aria-label="' + i.l + ' : ' + fmtMoney(i.v) + '"><i style="width:' + pct + '%"></i></div>';
      el.appendChild(row);
    });
  }
  function load() {
    fetch(appBaseUrl() + 'api/finance/rapport-financier')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var demande = Number(d.budget_total_demande || 0);
        var approuve = Number(d.budget_total_approuve || 0);
        var realise = Number(d.cout_recrutements_realis || 0);
        var ecart = realise - approuve;
        document.getElementById('rf-budget-demande').textContent = fmtMoney(demande) + ' <small>Ar</small>';
        document.getElementById('rf-budget-approuve').textContent = fmtMoney(approuve) + ' <small>Ar</small>';
        document.getElementById('rf-cout-realise').textContent = fmtMoney(realise) + ' <small>Ar</small>';
        document.getElementById('rf-ecart').textContent = (ecart < 0 ? '−' : ecart > 0 ? '+' : '') + fmtMoney(Math.abs(ecart)) + ' <small>Ar</small>';
        document.getElementById('rf-ecart-note').textContent = ecart > 0 ? 'Dépassement du budget approuvé' : ecart < 0 ? 'Sous le budget approuvé' : 'À l\'équilibre';

        // Données par période depuis le suivi des budgets (approximation)
        fetch(appBaseUrl() + 'api/finance/suivi-budgets-recrutement')
          .then(function (r) { return r.json(); })
          .then(function (list) {
            var totalPrev = 0;
            (list || []).forEach(function (x) { totalPrev += Number(x.budget_prev || 0); });
            bar('rf-bars-periode', [
              { l: 'Budget dédié', v: totalPrev },
              { l: 'Budget approuvé', v: approuve },
              { l: 'Coût réalisé', v: realise }
            ]);
            bar('rf-bars-prev-reel', [
              { l: 'Prévu', v: approuve },
              { l: 'Réel', v: realise }
            ]);
          });

        // Tableau des écarts depuis le suivi des budgets
        fetch(appBaseUrl() + 'api/finance/suivi-budgets-recrutement')
          .then(function (r) { return r.json(); })
          .then(function (list) {
            var tbody = document.getElementById('rf-ecarts-tbody');
            tbody.innerHTML = '';
            (list || []).slice(0, 6).forEach(function (x) {
              var prev = Number(x.budget_prev || 0);
              var reel = Number(x.cout_reel || 0);
              var e = reel - prev;
              var pct = prev > 0 ? Math.round((e / prev) * 100) : 0;
              var cls = e < 0 ? 'is-success' : e > 0 ? 'is-danger' : 'is-neutral';
              var sign = e < 0 ? '−' : e > 0 ? '+' : '';
              var tr = document.createElement('tr');
              tr.innerHTML =
                '<td class="ref">DEM-' + String(x.reference || x.id || '—').padStart(3, '0') + '</td>' +
                '<td>' + (x.poste || '—') + '</td>' +
                '<td class="num">' + fmtMoney(prev) + '</td>' +
                '<td class="num">' + (reel > 0 ? fmtMoney(reel) : '—') + '</td>' +
                '<td><span class="ui-badge ' + cls + '">' + sign + fmtMoney(Math.abs(e)) + '</span></td>' +
                '<td><span class="ui-badge ' + cls + '">' + sign + pct + ' %</span></td>';
              tbody.appendChild(tr);
            });
          });
      });
  }
  load();

  }
  function initHistoriqueValidationsFinances() {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }
  function decisionBadge(d) {
    var cls = 'is-neutral';
    if (d === 'APPROUVEE' || d === 'Validé') cls = 'is-success';
    if (d === 'REFUSEE' || d === 'Refusé') cls = 'is-danger';
    if (d === 'EN_ATTENTE' || d === 'En attente') cls = 'is-pending';
    var label = d === 'APPROUVEE' ? 'Validé' : d === 'REFUSEE' ? 'Refusé' : d === 'EN_ATTENTE' ? 'En attente' : d;
    return '<span class="ui-badge ' + cls + '">' + label + '</span>';
  }
  function load() {
    fetch(appBaseUrl() + 'api/finance/historique-validations')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var tbody = document.getElementById('history-finance-tbody');
        tbody.innerHTML = '';
        (list || []).forEach(function (d) {
          var tr = document.createElement('tr');
          tr.innerHTML =
            '<td class="ref">DEM-' + String(d.reference || d.id || '—').padStart(3, '0') + '</td>' +
            '<td>' + (d.poste || '—') + '</td>' +
            '<td class="num">' + fmtMoney(d.budget_examine) + '</td>' +
            '<td>' + decisionBadge(d.decision) + '</td>' +
            '<td>' + (d.commentaire || '—') + '</td>' +
            '<td>' + (d.date || '—') + '</td>' +
            '<td>' + (d.responsable || '—') + '</td>';
          tbody.appendChild(tr);
        });
        document.getElementById('hist-total').textContent = (list || []).length + ' examens';
        document.getElementById('hist-count').textContent = (list || []).length + ' examens au total';
      });
  }
  load();

  }
  function initSuiviMasseSalariale() {
  function fmtMoney(v) {
    if (v == null) return '—';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'MGA', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v).replace('Ar', '').trim() + ' Ar';
  }
  function bar(container, items) {
    var el = document.getElementById(container);
    if (!el) return;
    el.innerHTML = '';
    var max = Math.max.apply(null, items.map(function (i) { return i.v; })) || 1;
    items.forEach(function (i) {
      var pct = Math.round((i.v / max) * 100);
      var row = document.createElement('div');
      row.className = 'ui-bar-row';
      row.innerHTML =
        '<div class="ui-bar-meta"><span>' + i.l + '</span><span>' + fmtMoney(i.v) + '</span></div>' +
        '<div class="ui-bar ' + (i.accent ? 'is-accent' : '') + '" role="img" aria-label="' + i.l + ' : ' + fmtMoney(i.v) + '"><i style="width:' + pct + '%"></i></div>';
      el.appendChild(row);
    });
  }
  function load() {
    fetch(appBaseUrl() + 'api/finance/suivi-masse-salariale')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var prev = Number(d.masse_previsionnelle || 0);
        var reel = Number(d.masse_reelle || 0);
        var ecart = reel - prev;
        document.getElementById('ms-previsionnelle').textContent = fmtMoney(prev) + ' <small>Ar</small>';
        document.getElementById('ms-reelle').textContent = fmtMoney(reel) + ' <small>Ar</small>';
        document.getElementById('ms-ecart').textContent = (ecart < 0 ? '−' : ecart > 0 ? '+' : '') + fmtMoney(Math.abs(ecart)) + ' <small>Ar</small>';
        document.getElementById('ms-ecart-note').textContent = ecart < 0 ? 'Sous le budget' : ecart > 0 ? 'Au-dessus du budget' : 'À l\'équilibre';
        document.getElementById('ms-embauches').textContent = fmtMoney(reel) + ' <small>Ar</small>';
      });

    fetch(appBaseUrl() + 'api/finance/couts-nouvelles-embauches')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var byDept = {};
        (list || []).forEach(function (d) {
          var dept = d.departement || 'Non renseigné';
          byDept[dept] = (byDept[dept] || 0) + Number(d.cout_estime || 0);
        });
        bar('ms-bars-dept', Object.entries(byDept).map(function (e) { return { l: e[0], v: e[1] }; }));
      });

    fetch(appBaseUrl() + 'api/finance/suivi-couts-contrats')
      .then(function (r) { return r.json(); })
      .then(function (list) {
        var byMois = {};
        (list || []).forEach(function (d) {
          var mo = d.debut ? String(d.debut).slice(0, 7) : 'Inconnu';
          byMois[mo] = (byMois[mo] || 0) + Number(d.cout_estime || 0);
        });
        bar('ms-bars-mois', Object.entries(byMois).map(function (e) { return { l: e[0], v: e[1], accent: true }; }).slice(0, 6));
      });
  }
  load();

  }

  function handlePageLoaded(page, id) {
    if (page === 'demandes-a-examiner') {
      initDemandesList();
    }
    if (page === 'examen-financier') {
      initExamenDetail(id);
    }
    if (page === 'welcome') initFinanceWelcome();
    if (page === 'suivi-budgets-recrutement') initSuiviBudgetsRecrutement();
    if (page === 'suivi-couts-contrats') initSuiviCoutsContrats();
    if (page === 'rapport-couts-personnel') initRapportCoutsPersonnel();
    if (page === 'couts-nouvelles-embauches') initCoutsNouvellesEmbauches();
    if (page === 'rapport-financier') initRapportFinancier();
    if (page === 'historique-validations-finances') initHistoriqueValidationsFinances();
    if (page === 'suivi-masse-salariale') initSuiviMasseSalariale();
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
