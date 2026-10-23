package com.example.demo.service.besoin;

import com.example.demo.dto.besoin.ResumeRhDTO;
import com.example.demo.repository.besoin.DemandeBesoinListeProjection;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ResponsableRhAccueilService {
	private final BesoinService besoinService;

	public ResponsableRhAccueilService(BesoinService besoinService) {
		this.besoinService = besoinService;
	}

	@Transactional(readOnly = true)
	public ResumeRhDTO obtenirResume() {
		List<DemandeBesoinListeProjection> demandes = besoinService.listerPourRH();
		return new ResumeRhDTO(
				compter(demandes, "en_attente"),
				compter(demandes, "transmis_finance"),
				compter(demandes, "transmis_direction"),
				compter(demandes, "valide"));
	}

	private long compter(List<DemandeBesoinListeProjection> demandes, String statut) {
		return demandes.stream().filter(demande -> statut.equals(demande.getStatut())).count();
	}
}
