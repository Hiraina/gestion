package com.example.demo.controller;

import com.example.demo.service.contrat.ContratPreparationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/candidat/contrats")
public class EspaceCandidatContratController {
	private final ContratPreparationService service;

	public EspaceCandidatContratController(ContratPreparationService service) {
		this.service = service;
	}

	@PostMapping("/{token}/acces")
	public ResponseEntity<Map<String, Object>> ouvrirEspace(@PathVariable String token,
			@RequestBody(required = false) Map<String, String> identification) {
		try {
			if (identification == null) throw new IllegalArgumentException("Saisissez votre nom et votre adresse e-mail.");
			Map<String, Object> data = service.obtenirEspaceCandidat(token,
					identification.get("name"), identification.get("email"));
			return ResponseEntity.ok(data);
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(Map.of("message", exception.getMessage()));
		}
	}

	@PostMapping("/{token}/reponse")
	public ResponseEntity<Map<String, Object>> envoyerReponse(@PathVariable String token,
			@RequestBody(required = false) Map<String, Object> reponse) {
		try {
			service.enregistrerReponseCandidat(token, reponse);
			return ResponseEntity.ok(Map.of("success", true, "status", "REPONSE_RECUE",
					"message", "Votre réponse a été transmise à l'équipe RH."));
		} catch (IllegalArgumentException exception) {
			Map<String, Object> error = new HashMap<>();
			error.put("success", false);
			error.put("message", exception.getMessage());
			return ResponseEntity.badRequest().body(error);
		}
	}
}
