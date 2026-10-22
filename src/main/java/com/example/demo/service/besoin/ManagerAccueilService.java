package com.example.demo.service.besoin;

import com.example.demo.repository.besoin.DemandeBesoinListeProjection;
import com.example.demo.dto.besoin.ResumeManagerDTO;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Set;

@Service
public class ManagerAccueilService {

	private static final Set<String> STATUTS_EN_COURS = Set.of(
			"en_attente", "transmis_finance", "validee_finance", "transmis_direction");

	private final BesoinService besoinService;
	private final BrouillonDemandeService brouillonDemandeService;

	public ManagerAccueilService(BesoinService besoinService, BrouillonDemandeService brouillonDemandeService) {
		this.besoinService = besoinService;
		this.brouillonDemandeService = brouillonDemandeService;
	}

	public ResumeManagerDTO obtenirResume() {
		List<DemandeBesoinListeProjection> demandes = besoinService.listerPourRH();
		long enCours = demandes.stream()
				.filter(demande -> STATUTS_EN_COURS.contains(demande.getStatut()))
				.count();
		long validees = demandes.stream()
				.filter(demande -> "valide".equals(demande.getStatut()))
				.count();
		return new ResumeManagerDTO(demandes.size(), brouillonDemandeService.lister().size(), enCours, validees);
	}
}
