package com.example.demo.controller;

import com.example.demo.service.candidature.EntretienService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/Responsable-RH/api")
public class EntretienController {
	private final EntretienService service;

	public EntretienController(EntretienService service) {
		this.service = service;
	}

	@GetMapping("/candidatures")
	public List<Map<String, Object>> listerCandidatures() {
		return service.listerCandidatures();
	}

	@PostMapping("/candidatures/{id}/preselection")
	public ResponseEntity<Map<String, Object>> preselectionner(@PathVariable int id) {
		if (!service.preselectionner(id)) return ResponseEntity.badRequest()
				.body(Map.of("success", false, "message", "Cette candidature n'est plus sélectionnable."));
		return ResponseEntity.ok(Map.of("success", true, "message", "Le candidat a été présélectionné pour un entretien."));
	}

	@GetMapping("/entretiens")
	public List<Map<String, Object>> listerEntretiens() {
		return service.listerEntretiens();
	}

	@PostMapping("/entretiens/{id}/notes")
	public ResponseEntity<Map<String, Object>> enregistrerNotes(@PathVariable int id,
			@RequestBody Map<String, Object> payload) {
		try {
			service.enregistrerNotes(id, payload);
			return ResponseEntity.ok(Map.of("success", true, "message", "Les notes ont été enregistrées."));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", exception.getMessage()));
		}
	}

	@PatchMapping("/entretiens/{id}/decision")
	public ResponseEntity<Map<String, Object>> enregistrerDecision(@PathVariable int id,
			@RequestBody Map<String, Object> payload) {
		try {
			service.enregistrerDecision(id, payload);
			return ResponseEntity.ok(Map.of("success", true, "message", "La décision d'entretien a été enregistrée."));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", exception.getMessage()));
		}
	}
}
