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
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

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

	@PostMapping("/candidatures/{id}/accepter-par-rh")
	public ResponseEntity<Map<String, Object>> accepterParRh(@PathVariable int id) {
		try {
			preparationService.accepterReponseParRh(id);
			return ResponseEntity.ok(Map.of("success", true, "message", "Le contrat a été accepté par la RH."));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", exception.getMessage()));
		}
	}

	@PostMapping("/candidatures/{id}/envoyer")
	public ResponseEntity<Map<String, Object>> envoyerAuCandidat(@PathVariable int id,
			@RequestBody(required = false) Map<String, Object> contrat) {
		try {
			preparationService.envoyerAuCandidat(id, contrat);
			String token = preparationService.obtenirTokenAcces(id);
			String lien = ServletUriComponentsBuilder.fromCurrentContextPath()
					.path("/candidat/espace-candidat-contrat.html")
					.queryParam("token", token)
					.build()
					.toUriString();
			return ResponseEntity.ok(Map.of("success", true, "status", "ENVOYE_CANDIDAT",
					"message", "Le contrat a été transmis au candidat.", "accessUrl", lien));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", exception.getMessage()));
		}
	}

	@PostMapping("/candidatures/{id}/embaucher")
	public ResponseEntity<Map<String, Object>> embaucher(@PathVariable int id) {
		try {
			if (!service.embaucherCandidat(id)) {
				return ResponseEntity.badRequest().body(Map.of("success", false,
						"message", "L’embauche est possible uniquement après acceptation de tous les articles et en présence d’une proposition valide."));
			}
			return ResponseEntity.ok(Map.of("success", true, "message", "Le candidat a été embauché."));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", exception.getMessage()));
		}
	}
}
