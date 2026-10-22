package com.example.demo.service.besoin;

import com.example.demo.entity.besoin.BrouillonDemande;
import com.example.demo.repository.besoin.BrouillonDemandeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class BrouillonDemandeService {

	private final BrouillonDemandeRepository repository;

	public BrouillonDemandeService(BrouillonDemandeRepository repository) {
		this.repository = repository;
	}

	public List<BrouillonDemande> lister() {
		return repository.findAllByOrderByDateCreationDesc();
	}

	public BrouillonDemande enregistrer(Long id, Map<String, Object> donnees) {
		BrouillonDemande brouillon = id == null
				? new BrouillonDemande()
				: repository.findById(id).orElseThrow();
		if (brouillon.getDateCreation() == null) {
			brouillon.setDateCreation(LocalDateTime.now());
		}
		brouillon.setDonnees(donnees);
		return repository.save(brouillon);
	}

	public void supprimer(Long id) {
		repository.deleteById(id);
	}
}
