package com.example.demo.repository.besoin;

import com.example.demo.entity.besoin.Besoin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface BesoinRepository extends JpaRepository<Besoin, Integer> {

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, b.effectif AS effectif, "
			+ "b.nom_manager_demandeur AS manager, b.date_souhaitee AS \"dateSouhaitee\", "
			+ "s.nom AS statut "
			+ "FROM besoins b JOIN postes p ON p.id_poste = b.id_poste "
			+ "JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut "
			+ "ORDER BY b.id_besoin DESC", nativeQuery = true)
	List<DemandeBesoinListeProjection> listerPourRH();

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, b.effectif AS effectif, "
			+ "b.nom_manager_demandeur AS manager, d.nom AS departement, "
			+ "b.date_souhaitee AS \"dateSouhaitee\", b.motif AS motif, "
			+ "b.competance AS competence, s.nom AS statut "
			+ "FROM besoins b JOIN postes p ON p.id_poste = b.id_poste "
			+ "LEFT JOIN departements d ON d.id_departement = p.id_departement "
			+ "JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut "
			+ "WHERE b.id_besoin = :id", nativeQuery = true)
	Optional<DemandeBesoinDetailProjection> trouverDetailsPourRH(Integer id);
}
