package com.example.demo.controller;

import com.example.demo.service.contrat.ContratTravailService;
import com.example.demo.service.contrat.ContratPreparationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/Responsable-RH/api/contrats")
public class CandidatContratController {
	private final ContratTravailService service;
	private final ContratPreparationService preparationService;

	public CandidatContratController(ContratTravailService service, ContratPreparationService preparationService) {
		this.service = service;
		this.preparationService = preparationService;
	}

	@GetMapping("/candidats-acceptes")
	public List<Map<String, Object>> listerCandidatsAcceptes() {
		return service.listerCandidatsAcceptes();
	}

	@PostMapping("/candidatures/{id}/envoyer")
	public ResponseEntity<Map<String, Object>> envoyerAuCandidat(@PathVariable int id,
			@RequestBody(required = false) Map<String, Object> contrat) {
		try {
			preparationService.envoyerAuCandidat(id, contrat);
			return ResponseEntity.ok(Map.of("success", true, "status", "ENVOYE_CANDIDAT",
					"message", "Le contrat a été transmis au candidat."));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", exception.getMessage()));
		}
	}
}
