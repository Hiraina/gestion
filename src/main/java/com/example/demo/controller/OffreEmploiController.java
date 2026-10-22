package com.example.demo.controller;

import com.example.demo.service.offre.OffreEmploiService;
import org.springframework.http.HttpStatus;
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
@RequestMapping("/Responsable-RH/api/offres")
public class OffreEmploiController {

	private final OffreEmploiService service;

	public OffreEmploiController(OffreEmploiService service) {
		this.service = service;
	}

	@GetMapping
	public List<Map<String, Object>> lister() {
		return service.lister();
	}

	@PostMapping
	public ResponseEntity<Map<String, Object>> publier(@RequestBody Map<String, Object> payload) {
		try {
			int id = service.publier(payload);
			return ResponseEntity.status(HttpStatus.CREATED)
					.body(Map.of("success", true, "id", id, "message", "L'offre a été publiée et enregistrée."));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest()
					.body(Map.of("success", false, "message", exception.getMessage()));
		}
	}

	@PatchMapping("/{id}/statut")
	public ResponseEntity<Map<String, Object>> changerStatut(@PathVariable int id,
			@RequestBody Map<String, String> payload) {
		try {
			String statut = payload.get("statut");
			if (statut == null || !service.changerStatut(id, statut)) {
				return ResponseEntity.notFound().build();
			}
			return ResponseEntity.ok(Map.of("success", true, "message", "Le statut de l'offre a été mis à jour."));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest()
					.body(Map.of("success", false, "message", exception.getMessage()));
		}
	}
}
