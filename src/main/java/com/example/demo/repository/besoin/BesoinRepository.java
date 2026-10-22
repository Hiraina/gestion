package com.example.demo.repository.besoin;

import com.example.demo.entity.besoin.Besoin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface BesoinRepository extends JpaRepository<Besoin, Integer> {

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, b.effectif AS effectif, "
			+ "b.nom_manager_demandeur AS manager, d.nom AS departement, b.date_souhaitee AS \"dateSouhaitee\", "
			+ "s.nom AS statut "
			+ "FROM besoins b JOIN postes p ON p.id_poste = b.id_poste "
			+ "LEFT JOIN departements d ON d.id_departement = p.id_departement "
			+ "JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut "
			+ "ORDER BY b.id_besoin DESC", nativeQuery = true)
	List<DemandeBesoinListeProjection> listerPourRH();

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, b.effectif AS effectif, "
			+ "b.nom_manager_demandeur AS manager, d.nom AS departement, "
			+ "b.date_souhaitee AS \"dateSouhaitee\", b.motif AS motif, "
			+ "b.competance AS competence, s.nom AS statut, "
			+ "(p.salaire_min * 12 * b.effectif) AS \"coutAnnuelTotal\" "
			+ "FROM besoins b JOIN postes p ON p.id_poste = b.id_poste "
			+ "LEFT JOIN departements d ON d.id_departement = p.id_departement "
			+ "JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut "
			+ "WHERE b.id_besoin = :id", nativeQuery = true)
	Optional<DemandeBesoinDetailProjection> trouverDetailsPourRH(@Param("id") Integer id);

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, d.nom AS departement, "
			+ "b.nom_manager_demandeur AS manager, b.effectif AS effectif, "
			+ "b.date_souhaitee AS \"dateSouhaitee\", b.motif AS motif, "
			+ "b.competance AS competence "
			+ "FROM besoins b JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut "
			+ "JOIN postes p ON p.id_poste = b.id_poste "
			+ "LEFT JOIN departements d ON d.id_departement = p.id_departement "
			+ "WHERE LOWER(s.nom) = 'valide' "
			+ "ORDER BY b.id_besoin DESC", nativeQuery = true)
	List<DemandeBesoinValideProjection> listerValides();

	@Modifying
	@Query(value = "UPDATE besoins SET statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'transmis_finance'), "
			+ "date_transmission_finance = CURRENT_TIMESTAMP "
			+ "WHERE id_besoin = :id AND statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'en_attente')",
			nativeQuery = true)
	int transmettreALaFinance(@Param("id") Integer id);

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, b.effectif AS effectif, "
			+ "b.nom_manager_demandeur AS manager, d.nom AS departement, b.motif AS motif, "
			+ "b.competance AS competence, b.date_souhaitee AS \"dateSouhaitee\", "
			+ "b.date_transmission_finance AS \"dateTransmissionFinance\" "
			+ "FROM besoins b JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut "
			+ "JOIN postes p ON p.id_poste = b.id_poste "
			+ "LEFT JOIN departements d ON d.id_departement = p.id_departement "
			+ "WHERE s.nom = 'transmis_finance' "
			+ "ORDER BY b.date_transmission_finance DESC, b.id_besoin DESC", nativeQuery = true)
	List<DemandeBesoinFinanceProjection> listerPourFinance();

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, b.effectif AS effectif, "
			+ "b.nom_manager_demandeur AS manager, d.nom AS departement, b.motif AS motif, "
			+ "b.competance AS competence, b.date_souhaitee AS \"dateSouhaitee\", "
			+ "b.date_transmission_finance AS \"dateTransmissionFinance\" "
			+ "FROM besoins b JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut "
			+ "JOIN postes p ON p.id_poste = b.id_poste "
			+ "LEFT JOIN departements d ON d.id_departement = p.id_departement "
			+ "WHERE b.id_besoin = :id AND s.nom = 'transmis_finance'", nativeQuery = true)
	Optional<DemandeBesoinFinanceProjection> trouverPourFinance(@Param("id") Integer id);

	@Modifying
	@Query(value = "UPDATE besoins SET statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'transmis_direction') "
			+ "WHERE id_besoin = :id AND statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'validee_finance')",
			nativeQuery = true)
	int transmettreALaDirection(@Param("id") Integer id);

	@Modifying
	@Query(value = "UPDATE besoins SET statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'valide') "
			+ "WHERE id_besoin = :id AND statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'transmis_direction')",
			nativeQuery = true)
	int approuverParDirection(@Param("id") Integer id);

	@Modifying
	@Query(value = "UPDATE besoins SET statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'refuse') "
			+ "WHERE id_besoin = :id AND statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'transmis_direction')",
			nativeQuery = true)
	int refuserParDirection(@Param("id") Integer id);

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, d.nom AS departement, "
			+ "b.nom_manager_demandeur AS manager, b.effectif AS effectif, "
			+ "b.date_souhaitee AS \"dateSouhaitee\" "
			+ "FROM besoins b JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut "
			+ "JOIN postes p ON p.id_poste = b.id_poste "
			+ "LEFT JOIN departements d ON d.id_departement = p.id_departement "
			+ "WHERE s.nom = 'transmis_direction' "
			+ "ORDER BY b.id_besoin DESC", nativeQuery = true)
	List<DemandeBesoinDirectionProjection> listerPourDirection();
}
