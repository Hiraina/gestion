package com.example.demo.controller;

import com.example.demo.service.offre.OffreEmploiService;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/offres-emploi")
public class OffrePubliqueController {
	private final OffreEmploiService service;

	public OffrePubliqueController(OffreEmploiService service) {
		this.service = service;
	}

	@GetMapping
	public ResponseEntity<List<Map<String, Object>>> listerOffresPubliques() {
		return ResponseEntity.ok()
				.cacheControl(CacheControl.noStore())
				.body(service.listerPublieesPourCandidats());
	}
}
