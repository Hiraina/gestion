package com.example.demo.service.besoin;

import com.example.demo.dto.besoin.BesoinDTO;
import com.example.demo.entity.besoin.Besoin;
import com.example.demo.repository.besoin.BesoinRepository;
import com.example.demo.repository.besoin.DemandeBesoinListeProjection;
import com.example.demo.repository.besoin.DemandeBesoinDetailProjection;
import com.example.demo.repository.besoin.DemandeBesoinValideProjection;
import com.example.demo.repository.besoin.DemandeBesoinFinanceProjection;
import com.example.demo.repository.besoin.DemandeBesoinDirectionProjection;
import com.example.demo.repository.besoin.ResumeDirectionProjection;
import com.example.demo.repository.besoin.HistoriqueStatutBesoinProjection;
import com.example.demo.repository.besoin.HistoriqueStatutBesoinRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class BesoinService {

	private final BesoinRepository repository;
	private final HistoriqueStatutBesoinRepository historiqueRepository;

	public BesoinService(BesoinRepository repository, HistoriqueStatutBesoinRepository historiqueRepository) {
		this.repository = repository;
		this.historiqueRepository = historiqueRepository;
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

	public List<Map<String, Object>> listerSuiviManager() {
		Map<Integer, List<Map<String, Object>>> historiqueParBesoin = new HashMap<>();
		for (HistoriqueStatutBesoinProjection evenement : historiqueRepository.listerHistoriqueDesStatuts()) {
			Map<String, Object> ligne = new HashMap<>();
			ligne.put("ancienStatut", evenement.getAncienStatut());
			ligne.put("nouveauStatut", evenement.getNouveauStatut());
			ligne.put("dateChangement", evenement.getDateChangement() != null
					? evenement.getDateChangement().toString() : null);
			historiqueParBesoin.computeIfAbsent(evenement.getIdBesoin(), id -> new ArrayList<>()).add(ligne);
		}

		List<Map<String, Object>> suivi = new ArrayList<>();
		for (DemandeBesoinListeProjection demande : repository.listerPourRH()) {
			Map<String, Object> ligne = new HashMap<>();
			ligne.put("id", demande.getId());
			ligne.put("poste", demande.getPoste());
			ligne.put("effectif", demande.getEffectif());
			ligne.put("manager", demande.getManager());
			ligne.put("departement", demande.getDepartement());
			ligne.put("dateSouhaitee", demande.getDateSouhaitee());
			ligne.put("statut", demande.getStatut());
			ligne.put("historique", historiqueParBesoin.getOrDefault(demande.getId(), List.of()));
			suivi.add(ligne);
		}
		return suivi;
	}

	@SuppressWarnings("unchecked")
	public List<Map<String, Object>> listerHistoriqueFinaliseManager() {
		List<Map<String, Object>> demandesFinalisees = new ArrayList<>();
		for (Map<String, Object> demande : listerSuiviManager()) {
			String statut = String.valueOf(demande.get("statut"));
			if (!"valide".equals(statut) && !"refuse".equals(statut) && !"refusee".equals(statut)) {
				continue;
			}
			List<Map<String, Object>> historique = (List<Map<String, Object>>) demande.get("historique");
			if (historique != null && !historique.isEmpty()) {
				demande.put("dateStatutFinal", historique.get(historique.size() - 1).get("dateChangement"));
			}
			demandesFinalisees.add(demande);
		}
		return demandesFinalisees;
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

	public ResumeDirectionProjection obtenirResumeDirection() {
		return repository.obtenirResumeDirection();
	}

	public boolean deciderParDirection(Integer id, String decision) {
		if ("approuver".equals(decision)) {
			return repository.approuverParDirection(id) == 1;
		}
		if ("refuser".equals(decision)) {
			return repository.refuserParDirection(id) == 1;
		}
		return false;
	}
}
