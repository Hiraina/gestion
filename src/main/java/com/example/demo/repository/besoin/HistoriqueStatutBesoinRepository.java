package com.example.demo.repository.besoin;

import com.example.demo.entity.besoin.HistoriqueStatutBesoin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface HistoriqueStatutBesoinRepository extends JpaRepository<HistoriqueStatutBesoin, Long> {

	@Query(value = "SELECT h.id_besoin AS \"idBesoin\", ancien.nom AS \"ancienStatut\", "
			+ "nouveau.nom AS \"nouveauStatut\", h.date_changement AS \"dateChangement\" "
			+ "FROM historique_statut_besoin h "
			+ "LEFT JOIN statut_recrutement ancien ON ancien.id_statut_recrutement = h.ancien_statut "
			+ "JOIN statut_recrutement nouveau ON nouveau.id_statut_recrutement = h.nouveau_statut "
			+ "ORDER BY h.id_besoin, h.date_changement, h.id_historique", nativeQuery = true)
	List<HistoriqueStatutBesoinProjection> listerHistoriqueDesStatuts();
}
