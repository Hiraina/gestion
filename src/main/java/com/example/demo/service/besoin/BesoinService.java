package com.example.demo.service.besoin;

import com.example.demo.dto.besoin.BesoinDTO;
import com.example.demo.entity.besoin.Besoin;
import com.example.demo.repository.besoin.BesoinRepository;
import com.example.demo.repository.besoin.DemandeBesoinListeProjection;
import com.example.demo.repository.besoin.DemandeBesoinDetailProjection;
import com.example.demo.repository.besoin.DemandeBesoinValideProjection;
import com.example.demo.repository.besoin.DemandeBesoinFinanceProjection;
import com.example.demo.repository.besoin.DemandeBesoinDirectionProjection;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

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
		besoin.setEffectif(dto.getEffectif());
		besoin.setNomManagerDemandeur(dto.getNomManagerDemandeur());
		besoin.setDateSouhaitee(dto.getDateSouhaitee());
		besoin.setMotif(dto.getMotif());
		besoin.setCompetance(dto.getCompetance());
		besoin.setStatut(1);
		repository.save(besoin);
	}

	public List<DemandeBesoinListeProjection> listerPourRH() {
		return repository.listerPourRH();
	}

	public Optional<DemandeBesoinDetailProjection> trouverDetailsPourRH(Integer id) {
		return repository.trouverDetailsPourRH(id);
	}

	public List<DemandeBesoinValideProjection> listerValides() {
		return repository.listerValides();
	}

	public boolean transmettreALaFinance(Integer id) {
		return repository.transmettreALaFinance(id) == 1;
	}

	public List<DemandeBesoinFinanceProjection> listerPourFinance() {
		return repository.listerPourFinance();
	}

	public Optional<DemandeBesoinFinanceProjection> trouverPourFinance(Integer id) {
		return repository.trouverPourFinance(id);
	}

	public boolean transmettreALaDirection(Integer id) {
		return repository.transmettreALaDirection(id) == 1;
	}

	public List<DemandeBesoinDirectionProjection> listerPourDirection() {
		return repository.listerPourDirection();
	}
}
