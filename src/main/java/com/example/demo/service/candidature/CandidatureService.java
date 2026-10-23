package com.example.demo.service.candidature;

import com.example.demo.repository.candidature.CandidatureRepository;
import tools.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.UUID;

@Service
public class CandidatureService {
	private static final long MAX_FILE_SIZE = 5L * 1024 * 1024;
	private final CandidatureRepository repository;
	private final ObjectMapper objectMapper;
	private final Path uploadDirectory;

	public CandidatureService(CandidatureRepository repository,
			ObjectMapper objectMapper,
			@Value("${app.upload-dir:uploads}") String uploadDirectory) {
		this.repository = repository;
		this.objectMapper = objectMapper;
		this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize().resolve("candidatures");
	}

	@Transactional
	public int deposer(int offreId, Map<String, String> fields, MultipartFile cv, MultipartFile lettre) {
		if (offreId <= 0 || !repository.offreOuverte(offreId)) {
			throw new IllegalArgumentException("Cette offre n’est plus ouverte aux candidatures.");
		}
		String prenom = required(fields, "firstName");
		String nom = required(fields, "lastName");
		String email = required(fields, "email");
		if (!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) throw new IllegalArgumentException("L’adresse e-mail est invalide.");
		for (String key : new String[] { "phone", "birthDate", "city", "education", "fieldOfStudy", "hasExperience",
				"skills" }) required(fields, key);
		required(fields, "position");
		String motivation = required(fields, "motivation");
		if (motivation.length() < 20 || motivation.length() > 1500) throw new IllegalArgumentException("La motivation doit contenir entre 20 et 1 500 caractères.");
		if (!"true".equalsIgnoreCase(fields.get("consent")) && !"on".equalsIgnoreCase(fields.get("consent"))) {
			throw new IllegalArgumentException("Le consentement au traitement des données est obligatoire.");
		}
		verifierDocument(cv, "CV");
		verifierDocument(lettre, "lettre de motivation");
		if (!repository.offreOuverte(offreId)) throw new IllegalArgumentException("Cette offre n’est plus ouverte aux candidatures.");

		Integer existingId = repository.trouverCandidat(email);
		int candidatId = repository.enregistrerCandidat(existingId, nom, prenom, email, fields.get("phone"));
		if (repository.dejaPostule(candidatId, offreId)) {
			throw new IllegalArgumentException("Une candidature existe déjà pour cette offre avec cette adresse e-mail.");
		}
		Map<String, String> donneesCandidature = new LinkedHashMap<>(fields);
		donneesCandidature.remove("offreId");
		donneesCandidature.remove("consent");
		final String donneesCandidatureJson;
		try {
			donneesCandidatureJson = objectMapper.writeValueAsString(donneesCandidature);
		} catch (Exception exception) {
			throw new IllegalStateException("Les réponses du formulaire n’ont pas pu être enregistrées.", exception);
		}
		int candidatureId = repository.creerCandidature(candidatId, offreId, donneesCandidatureJson);
		Path cvPath = null;
		Path lettrePath = null;
		try {
			cvPath = enregistrerFichier(cv);
			lettrePath = enregistrerFichier(lettre);
			repository.enregistrerDocument(candidatureId, "CV", "/api/candidatures/documents/" + cvPath.getFileName(),
					cv.getOriginalFilename(), cv.getSize());
			repository.enregistrerDocument(candidatureId, "Lettre de motivation", "/api/candidatures/documents/" + lettrePath.getFileName(),
					lettre.getOriginalFilename(), lettre.getSize());
			repository.enregistrerCv(candidatId, "/api/candidatures/documents/" + cvPath.getFileName());
		} catch (IOException | RuntimeException exception) {
			deleteQuietly(cvPath);
			deleteQuietly(lettrePath);
			if (exception instanceof IllegalArgumentException invalid) throw invalid;
			throw new IllegalStateException("Les documents de candidature n’ont pas pu être enregistrés.", exception);
		}
		return candidatureId;
	}

	private String required(Map<String, String> fields, String key) {
		String value = fields.get(key);
		if (value == null || value.isBlank()) throw new IllegalArgumentException("Veuillez renseigner tous les champs obligatoires.");
		return value.trim();
	}

	private void verifierDocument(MultipartFile file, String label) {
		if (file == null || file.isEmpty()) throw new IllegalArgumentException("Veuillez joindre le document demandé : " + label + ".");
		if (file.getSize() > MAX_FILE_SIZE) throw new IllegalArgumentException("Chaque document doit faire au maximum 5 Mo.");
		String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
		if (!(name.endsWith(".pdf") || name.endsWith(".doc") || name.endsWith(".docx"))) {
			throw new IllegalArgumentException("Les documents doivent être au format PDF, DOC ou DOCX.");
		}
	}

	private Path enregistrerFichier(MultipartFile file) throws IOException {
		Files.createDirectories(uploadDirectory);
		String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase();
		String extension = original.substring(original.lastIndexOf('.'));
		Path destination = uploadDirectory.resolve(UUID.randomUUID() + extension).normalize();
		if (!destination.startsWith(uploadDirectory)) throw new IllegalArgumentException("Nom de document invalide.");
		try (var input = file.getInputStream()) {
			Files.copy(input, destination);
		}
		return destination;
	}

	private void deleteQuietly(Path path) {
		if (path == null) return;
		try { Files.deleteIfExists(path); } catch (IOException ignored) { }
	}

	public Path document(String filename) {
		if (filename == null || !filename.matches("[a-fA-F0-9-]{36}\\.(pdf|doc|docx)")) return null;
		Path file = uploadDirectory.resolve(filename).normalize();
		return file.startsWith(uploadDirectory) && Files.isRegularFile(file) ? file : null;
	}
}
