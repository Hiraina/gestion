package com.example.demo.controller;

import com.example.demo.service.candidature.CandidatureService;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

@RestController
@RequestMapping("/api/candidatures")
public class CandidatureController {
	private final CandidatureService service;

	public CandidatureController(CandidatureService service) {
		this.service = service;
	}

	@PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<Map<String, Object>> deposer(@RequestParam int offreId,
			@RequestParam Map<String, String> fields,
			@RequestParam("cv") MultipartFile cv,
			@RequestParam("letter") MultipartFile lettre) {
		try {
			int id = service.deposer(offreId, fields, cv, lettre);
			return ResponseEntity.ok(Map.of("success", true, "id", id,
					"message", "Votre candidature a bien été enregistrée."));
		} catch (IllegalArgumentException exception) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", exception.getMessage()));
		}
	}

	@GetMapping("/documents/{filename:.+}")
	public ResponseEntity<ByteArrayResource> document(@PathVariable String filename) throws IOException {
		Path path = service.document(filename);
		if (path == null) return ResponseEntity.notFound().build();
		String type = Files.probeContentType(path);
		MediaType mediaType = type == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(type);
		return ResponseEntity.ok().contentType(mediaType)
				.header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
				.body(new ByteArrayResource(Files.readAllBytes(path)));
	}
}
