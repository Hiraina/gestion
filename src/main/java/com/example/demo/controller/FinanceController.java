package com.example.demo.controller;

import com.example.demo.service.finance.FinanceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
		return ResponseEntity.ok(financeService.listerDemandes());
	}

	/** Statistiques pour le tableau de bord Finance (endpoint attendu par welcome.html). */
	@GetMapping("/welcome")
	public ResponseEntity<Map<String, Object>> getStats() {
		return ResponseEntity.ok(financeService.getStats());
	}

	/** Détail d'un besoin + calcul budgétaire (endpoint attendu par finance.js). */
	@GetMapping("/examen-financier")
	public ResponseEntity<Map<String, Object>> examenFinancier(@RequestParam Integer id) {
		return ResponseEntity.ok(financeService.obtenirExamenFinancier(id));
	}

	/** Enregistre la décision pour le besoin examiné. */
	@PostMapping("/besoins/{id}/decision")
	public ResponseEntity<Map<String, Object>> enregistrerDecision(@PathVariable Integer id,
			@RequestBody Map<String, String> request) {
		String decision = request.get("decision");
		if (!financeService.deciderBesoin(id, decision)) {
			return ResponseEntity.badRequest().body(Map.of("success", false,
					"message", "Décision invalide ou demande déjà examinée."));
		}
		return ResponseEntity.ok(Map.of("success", true, "decision", decision));
	}
}
