package com.example.demo.service.besoin;

import com.example.demo.dto.besoin.BesoinDTO;
import com.example.demo.entity.besoin.Besoin;
import com.example.demo.repository.besoin.BesoinRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class BesoinService {

	private final BesoinRepository repository;

	public BesoinService(BesoinRepository repository) {
		this.repository = repository;
	}

	public void creerBesoin(BesoinDTO dto) {
		Besoin besoin = new Besoin();
		besoin.setIdPoste(dto.getIdPoste());
		besoin.setNomManagerDemandeur(dto.getNomManagerDemandeur());
		besoin.setDateSouhaitee(dto.getDateSouhaitee());
		besoin.setMotif(dto.getMotif());
		besoin.setCompetance(dto.getCompetance());
		besoin.setStatut(1);
		repository.save(besoin);
	}
}
