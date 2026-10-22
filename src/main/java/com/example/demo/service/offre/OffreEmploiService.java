package com.example.demo.service.offre;

import com.example.demo.repository.offre.OffreEmploiRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class OffreEmploiService {

	private static final String DETAILS_PREFIX = "RH-OFFRE-JSON-V1:";
	private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

	private final OffreEmploiRepository repository;
	private final ObjectMapper objectMapper;

	public OffreEmploiService(OffreEmploiRepository repository, ObjectMapper objectMapper) {
		this.repository = repository;
		this.objectMapper = objectMapper;
	}

	@Transactional(readOnly = true)
	public List<Map<String, Object>> lister() {
		return repository.lister().stream().map(this::enrichir).toList();
	}

	@Transactional(readOnly = true)
	public List<Map<String, Object>> listerPublieesPourCandidats() {
		return repository.listerPublieesPourCandidats().stream().map(this::enrichir).toList();
	}

	public int publier(Map<String, Object> payload) {
		Map<String, Object> data = nestedMap(payload.get("data"));
		Map<String, Object> request = nestedMap(payload.get("request"));
		String titre = required(data, "jobTitle", "L'intitulé du poste est obligatoire.");
		for (String field : List.of("company", "department", "location", "workMode", "positions",
				"contract", "experience", "education", "companyDescription", "missions", "skills",
				"salaryDisplay", "applicationInstructions")) {
			required(data, field, "Veuillez compléter tous les champs obligatoires de l'offre.");
		}
		String publication = required(data, "publicationDate", "La date de publication est obligatoire.");
		String descriptionPoste = required(data, "jobDescription", "La description du poste est obligatoire.");
		int positions;
		try {
			positions = Integer.parseInt(required(data, "positions", "Le nombre de postes est obligatoire."));
		} catch (NumberFormatException exception) {
			throw new IllegalArgumentException("Le nombre de postes doit être un nombre entier positif.");
		}
		if (positions < 1) throw new IllegalArgumentException("Le nombre de postes doit être supérieur à zéro.");
		for (String confirmation : List.of("checkInformation", "checkContent", "checkSalary", "checkApplication")) {
			if (!Boolean.TRUE.equals(data.get(confirmation))) {
				throw new IllegalArgumentException("Veuillez confirmer les quatre points de vérification avant de publier.");
			}
		}
		LocalDate publicationDate = parseDate(publication, "La date de publication est invalide.");
		String dateCloture = optional(data, "deadline");
		if (dateCloture != null) {
			LocalDate deadline = parseDate(dateCloture, "La date limite est invalide.");
			if (deadline.isBefore(publicationDate)) {
				throw new IllegalArgumentException("La date limite ne peut pas précéder la date de publication.");
			}
		}
		if ("Fourchette salariale".equals(optional(data, "salaryDisplay"))) {
			try {
				long minimum = Long.parseLong(required(data, "salaryMin", "La fourchette salariale est incomplète."));
				long maximum = Long.parseLong(required(data, "salaryMax", "La fourchette salariale est incomplète."));
				if (minimum < 0 || maximum < minimum) throw new NumberFormatException();
			} catch (NumberFormatException exception) {
				throw new IllegalArgumentException("La fourchette salariale est invalide.");
			}
		}

		Integer requestId = integer(request.get("requestId"));
		int idPoste;
		if (requestId != null) {
			idPoste = repository.trouverPostePourBesoinValide(requestId);
		} else {
			idPoste = repository.trouverPosteActif(titre, optional(data, "department"))
					.orElseThrow(() -> new IllegalArgumentException(
							"Aucun poste actif correspondant au titre et au département n'existe dans le référentiel. " +
							"Associez l'offre à une demande validée ou choisissez un poste déjà enregistré."));
		}

		Map<String, Object> envelope = new LinkedHashMap<>();
		envelope.put("format", "rh-offre-v1");
		envelope.put("data", data);
		envelope.put("request", request);
		final String details;
		try {
			details = DETAILS_PREFIX + objectMapper.writeValueAsString(envelope);
		} catch (Exception exception) {
			throw new IllegalStateException("Les détails de l'offre n'ont pas pu être enregistrés.", exception);
		}

		return repository.creer(idPoste, titre, details, publicationDate.toString(),
				dateCloture, repository.trouverResponsableRh());
	}

	public boolean changerStatut(int id, String statut) {
		if (!List.of("publiee", "suspendue", "cloturee").contains(statut)) {
			throw new IllegalArgumentException("Statut d'offre invalide.");
		}
		return repository.changerStatut(id, statut);
	}

	private Map<String, Object> enrichir(Map<String, Object> row) {
		Map<String, Object> result = new LinkedHashMap<>(row);
		Object rawDescription = result.get("description");
		if (rawDescription instanceof String description && description.startsWith(DETAILS_PREFIX)) {
			try {
				Map<String, Object> envelope = objectMapper.readValue(description.substring(DETAILS_PREFIX.length()), MAP_TYPE);
				Map<String, Object> data = nestedMap(envelope.get("data"));
				result.put("data", data);
				result.put("request", nestedMap(envelope.get("request")));
				result.put("description", data.getOrDefault("jobDescription", ""));
				result.put("departement", data.getOrDefault("department", result.get("departement")));
				result.put("contrat", data.getOrDefault("contract", ""));
			} catch (Exception exception) {
				result.put("detailsIndisponibles", true);
				result.put("description", "Les détails de cette offre n'ont pas pu être lus.");
			}
		} else {
			result.put("data", Map.of());
			result.put("request", Map.of());
			result.put("departement", result.getOrDefault("departement", ""));
			result.put("contrat", "");
		}
		return result;
	}

	@SuppressWarnings("unchecked")
	private Map<String, Object> nestedMap(Object value) {
		return value instanceof Map<?, ?> map ? (Map<String, Object>) map : new LinkedHashMap<>();
	}

	private String required(Map<String, Object> values, String key, String message) {
		String value = optional(values, key);
		if (value == null) throw new IllegalArgumentException(message);
		return value;
	}

	private String optional(Map<String, Object> values, String key) {
		Object value = values.get(key);
		if (value == null) return null;
		String text = String.valueOf(value).trim();
		return text.isEmpty() ? null : text;
	}

	private LocalDate parseDate(String value, String message) {
		try {
			return LocalDate.parse(value);
		} catch (RuntimeException exception) {
			throw new IllegalArgumentException(message);
		}
	}

	private Integer integer(Object value) {
		if (value == null || String.valueOf(value).isBlank()) return null;
		try {
			return Integer.valueOf(String.valueOf(value));
		} catch (NumberFormatException exception) {
			throw new IllegalArgumentException("L'identifiant de la demande est invalide.");
		}
	}
}
