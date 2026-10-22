package com.example.demo.service.candidature;

import com.example.demo.repository.candidature.EntretienRepository;
import com.example.demo.repository.offre.OffreEmploiRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class EntretienService {
	private final EntretienRepository repository;
	private final OffreEmploiRepository offreRepository;

	public EntretienService(EntretienRepository repository, OffreEmploiRepository offreRepository) {
		this.repository = repository;
		this.offreRepository = offreRepository;
	}

	@Transactional(readOnly = true)
	public List<Map<String, Object>> listerCandidatures() {
		return repository.listerCandidatures();
	}

	public boolean preselectionner(int id) {
		return repository.preselectionner(id);
	}

	@Transactional(readOnly = true)
	public List<Map<String, Object>> listerEntretiens() {
		return repository.listerEntretiens();
	}

	public void enregistrerNotes(int id, Map<String, Object> payload) {
		verifierEnEntretien(id);
		String notes = texte(payload.get("notes"));
		if (notes.length() > 20000) throw new IllegalArgumentException("Les notes ne peuvent pas dépasser 20 000 caractères.");
		repository.enregistrerNotes(id, notes, offreRepository.trouverResponsableRh());
	}

	public void enregistrerDecision(int id, Map<String, Object> payload) {
		verifierEnEntretien(id);
		String resultat = texte(payload.get("resultat"));
		if (!List.of("FAVORABLE", "DEFAVORABLE", "A_REVOIR").contains(resultat)) {
			throw new IllegalArgumentException("La décision d'entretien est invalide.");
		}
		String notes = texte(payload.get("notes"));
		if (notes.length() > 20000) throw new IllegalArgumentException("Les notes ne peuvent pas dépasser 20 000 caractères.");
		repository.enregistrerDecision(id, notes, resultat, offreRepository.trouverResponsableRh());
	}

	private void verifierEnEntretien(int id) {
		if (id <= 0 || !repository.estEnEntretien(id)) {
			throw new IllegalArgumentException("Cette candidature n'est plus en attente d'entretien.");
		}
	}

	private String texte(Object value) {
		return value == null ? "" : String.valueOf(value).trim();
	}
}
