package com.example.demo.service.contrat;

import com.example.demo.repository.contrat.CandidatContratRepository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.Locale;

@Service
@Transactional
public class ContratPreparationService {
	private static final List<String> REQUIRED_ARTICLES = List.of(
			"ctArticle1", "ctArticle2", "ctArticle3", "ctArticle4", "ctArticle5", "ctArticle6", "ctArticle7");

	private final CandidatContratRepository repository;
	private final ObjectMapper objectMapper;

	public ContratPreparationService(CandidatContratRepository repository, ObjectMapper objectMapper) {
		this.repository = repository;
		this.objectMapper = objectMapper;
	}

	public void envoyerAuCandidat(int candidatureId, Map<String, Object> contrat) {
		if (candidatureId <= 0) throw new IllegalArgumentException("Identifiant de candidature invalide.");
		verifierContrat(contrat);
		final String donnees;
		try {
			donnees = objectMapper.writeValueAsString(contrat);
		} catch (Exception exception) {
			throw new IllegalStateException("Le contrat n'a pas pu être préparé pour l'envoi.", exception);
		}
		if (!repository.envoyerContrat(candidatureId, donnees)) {
			throw new IllegalArgumentException("Cette candidature n'est plus admissible à l'envoi ou son contrat a déjà été envoyé.");
		}
	}

	public String obtenirTokenAcces(int candidatureId) {
		return repository.trouverTokenAcces(candidatureId);
	}

	@Transactional(readOnly = true)
	public Map<String, Object> obtenirEspaceCandidat(String token, String nom, String email) {
		Map<String, Object> row = trouverEtVerifierIdentite(token, nom, email);
		Map<String, Object> result = new LinkedHashMap<>();
		result.put("candidateName", (texte(row.get("prenom")) + " " + texte(row.get("nom"))).trim());
		result.put("status", row.get("statut"));
		result.put("contract", lireJson(row.get("contract")));
		if (row.get("response") != null) result.put("response", lireJson(row.get("response")));
		result.put("responseDate", row.get("responseDate"));
		return result;
	}

	public void enregistrerReponseCandidat(String token, Map<String, Object> reponse) {
		if (reponse == null) throw new IllegalArgumentException("Les réponses au contrat sont manquantes.");
		trouverEtVerifierIdentite(token, texte(reponse.get("name")), texte(reponse.get("email")));
		Object articles = reponse.get("articles");
		if (!(articles instanceof Map<?, ?> answers) || answers.size() != REQUIRED_ARTICLES.size()) {
			throw new IllegalArgumentException("Répondez à chacun des articles du contrat.");
		}
		for (String article : REQUIRED_ARTICLES) {
			Object answer = answers.get(article);
			if (!(answer instanceof Map<?, ?> fields)
					|| !List.of("accepted", "refused", "modify").contains(texte(fields.get("choice")))) {
				throw new IllegalArgumentException("Une réponse d'article est invalide.");
			}
			if (!"accepted".equals(texte(fields.get("choice"))) && texte(fields.get("comment")).isBlank()) {
				throw new IllegalArgumentException("Expliquez chaque refus ou demande de modification.");
			}
		}
		try {
			if (!repository.enregistrerReponseCandidat(token, objectMapper.writeValueAsString(reponse))) {
				throw new IllegalArgumentException("Une réponse a déjà été enregistrée pour ce contrat.");
			}
		} catch (IllegalArgumentException exception) {
			throw exception;
		} catch (Exception exception) {
			throw new IllegalStateException("La réponse n'a pas pu être enregistrée.", exception);
		}
	}

	private Map<String, Object> trouverEtVerifierIdentite(String token, String nom, String email) {
		if (token == null || token.isBlank()) throw new IllegalArgumentException("Le lien du contrat est invalide.");
		Map<String, Object> row = repository.trouverEspaceCandidat(token).stream().findFirst()
				.orElseThrow(() -> new IllegalArgumentException("Ce lien de contrat est invalide ou expiré."));
		String nomAttendu = (texte(row.get("prenom")) + " " + texte(row.get("nom"))).trim();
		if (!normaliser(nom).equals(normaliser(nomAttendu))
				|| !normaliser(email).equals(normaliser(texte(row.get("email"))))) {
			throw new IllegalArgumentException("Le nom et l'adresse e-mail ne correspondent pas à ce contrat.");
		}
		return row;
	}

	private Object lireJson(Object raw) {
		if (!(raw instanceof String json)) return Map.of();
		try {
			return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
		} catch (Exception exception) {
			return Map.of();
		}
	}

	private String normaliser(String value) {
		return value == null ? "" : value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
	}

	private void verifierContrat(Map<String, Object> contrat) {
		if (contrat == null) throw new IllegalArgumentException("Les informations du contrat sont manquantes.");
		Map<String, String> labels = Map.of(
				"companyName", "l'entreprise", "candidateName", "le nom du candidat", "job", "le poste",
				"type", "le type de contrat", "salary", "la rémunération mensuelle", "startDate", "la date de début");
		for (String field : labels.keySet()) {
			String value = texte(contrat.get(field));
			if (value.isEmpty()) throw new IllegalArgumentException("Veuillez renseigner " + labels.get(field) + ".");
			if (value.length() > 500) throw new IllegalArgumentException("Le champ " + labels.get(field) + " est trop long.");
		}
		if (!List.of("CDI", "CDD", "CE", "Stage").contains(texte(contrat.get("type")))) {
			throw new IllegalArgumentException("Le type de contrat est invalide.");
		}
		try {
			LocalDate.parse(texte(contrat.get("startDate")));
		} catch (RuntimeException exception) {
			throw new IllegalArgumentException("La date de début du contrat est invalide.");
		}
		try {
			String montant = texte(contrat.get("salary")).replaceAll("[^0-9,.-]", "").replace(',', '.');
			if (new BigDecimal(montant).compareTo(BigDecimal.ZERO) <= 0) {
				throw new IllegalArgumentException("La rémunération mensuelle doit être supérieure à zéro.");
			}
		} catch (NumberFormatException exception) {
			throw new IllegalArgumentException("La rémunération mensuelle doit contenir un montant valide.");
		}
		Object rawArticles = contrat.get("articles");
		if (!(rawArticles instanceof Map<?, ?> articles)) {
			throw new IllegalArgumentException("Les articles du contrat sont manquants.");
		}
		for (String article : REQUIRED_ARTICLES) {
			String text = texte(articles.get(article));
			if (text.isEmpty()) throw new IllegalArgumentException("Veuillez compléter tous les articles du contrat.");
			if (text.length() > 20000) throw new IllegalArgumentException("Un article dépasse la limite de 20 000 caractères.");
		}
	}

	private String texte(Object value) {
		return value == null ? "" : String.valueOf(value).trim();
	}
}
