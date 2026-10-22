package com.example.demo.controller;

import com.example.demo.service.finance.FinanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/finance")
public class FinanceController {

	private final FinanceService financeService;

	public FinanceController(FinanceService financeService) {
		this.financeService = financeService;
	}

	/** Liste des besoins transmis à la Finance (endpoint attendu par finance.js). */
	@GetMapping("/demandes-a-examiner")
	public ResponseEntity<List<Map<String, Object>>> listerDemandes() {
		List<Map<String, Object>> demandes = financeService.listerDemandes();
		List<Map<String, Object>> result = new java.util.ArrayList<>();
		for (Map<String, Object> d : demandes) {
			Map<String, Object> m = new HashMap<>();
			m.put("id", d.get("id"));
			m.put("poste", d.get("poste"));
			m.put("personnes", d.get("effectif"));
			m.put("effectif", d.get("effectif"));
			Double salaireMin = (Double) d.get("salaireMin");
			Integer effectif = (Integer) d.get("effectif");
			BigDecimal budgetEstime = (salaireMin != null && effectif != null)
					? BigDecimal.valueOf(salaireMin).multiply(BigDecimal.valueOf(12)).multiply(BigDecimal.valueOf(effectif))
					: BigDecimal.ZERO;
			m.put("budget_estime", budgetEstime.doubleValue());
			m.put("salaire_annuel_demande", budgetEstime.doubleValue());
			m.put("manager", d.get("manager"));
			m.put("soumission", d.get("dateSouhaitee"));
			m.put("statut", "En attente");
			result.add(m);
		}
		return ResponseEntity.ok(result);
	}

	/** Statistiques pour le tableau de bord Finance (endpoint attendu par welcome.html). */
	@GetMapping("/welcome")
	public ResponseEntity<Map<String, Object>> getStats() {
		return ResponseEntity.ok(financeService.getStats());
	}

	/** Détail d'un besoin + calcul budgétaire (endpoint attendu par finance.js). */
	@GetMapping("/examen-financier")
	public ResponseEntity<Map<String, Object>> examenFinancier(@RequestParam Integer id) {
		FinanceService.VerificationResult vr = financeService.verifierDemande(id);
		Map<String, Object> detail = financeService.trouverDemande(id).orElse(new HashMap<>());

		Map<String, Object> result = new HashMap<>();
		result.put("id", vr.idBesoin);
		result.put("reference", vr.idBesoin);
		result.put("id_budget", vr.idBudget);
		result.put("poste_concerne", vr.poste);
		result.put("poste", vr.poste);
		result.put("nombre_personnes", vr.effectif);
		result.put("effectif", vr.effectif);
		result.put("motif", detail.get("motif"));
		result.put("salaire_mensuel_reference", vr.salaireMin != null ? vr.salaireMin.doubleValue() : 0);
		result.put("salaire_min", vr.salaireMin != null ? vr.salaireMin.doubleValue() : 0);
		result.put("coutAnnuelTotal", vr.coutAnnuelTotal != null ? vr.coutAnnuelTotal.doubleValue() : 0);
		result.put("ecartDisponible", vr.ecartDisponible != null ? vr.ecartDisponible.doubleValue() : 0);
		result.put("budgetAnnuelDedie", vr.budgetAnnuelDedie != null ? vr.budgetAnnuelDedie.doubleValue() : 0);
		result.put("sommeReellementUtilisee", vr.sommeReellementUtilisee != null ? vr.sommeReellementUtilisee.doubleValue() : 0);
		result.put("commentaire", detail.get("motif"));
		result.put("justification", detail.get("motif"));
		result.put("valide", vr.valide);
		result.put("message", vr.message);

		return ResponseEntity.ok(result);
	}

	/** Enregistre une décision financière (endpoint attendu par finance.js en GET). */
	@GetMapping("/decision")
	public ResponseEntity<String> enregistrerDecision(
			@RequestParam Integer idProposition,
			@RequestParam Integer idBudget,
			@RequestParam BigDecimal salaireAnnuelDemande,
			@RequestParam String decision,
			@RequestParam(required = false) String commentaire,
			@RequestParam Integer idFinancier) {
		// idProposition est l'identifiant du besoin, idBudget est l'identifiant du budget
		financeService.enregistrerDecision(idProposition, idBudget, decision, commentaire, idFinancier);
		return ResponseEntity.ok("Décision enregistrée : " + decision);
	}
}
