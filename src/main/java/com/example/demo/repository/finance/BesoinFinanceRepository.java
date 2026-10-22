package com.example.demo.repository.finance;

import com.example.demo.entity.besoin.Besoin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface BesoinFinanceRepository extends JpaRepository<Besoin, Integer> {

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, p.id_poste AS idPoste, b.effectif AS effectif, " +
			"p.salaire_min AS salaireMin, " +
			"b.nom_manager_demandeur AS manager, b.motif AS motif, " +
			"b.date_souhaitee AS \"dateSouhaitee\", " +
			"b.date_transmission_finance AS \"dateTransmissionFinance\" " +
			"FROM besoins b " +
			"JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut " +
			"JOIN postes p ON p.id_poste = b.id_poste " +
			"WHERE s.nom = 'transmis_finance' " +
			"ORDER BY b.date_transmission_finance DESC, b.id_besoin DESC", nativeQuery = true)
	List<BesoinFinanceSummary> listerPourFinance();

	@Query(value = "SELECT b.id_besoin AS id, p.titre AS poste, p.id_poste AS idPoste, b.effectif AS effectif, " +
			"p.salaire_min AS salaireMin, " +
			"b.nom_manager_demandeur AS manager, b.motif AS motif, " +
			"b.date_souhaitee AS \"dateSouhaitee\", " +
			"b.date_transmission_finance AS \"dateTransmissionFinance\" " +
			"FROM besoins b " +
			"JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut " +
			"JOIN postes p ON p.id_poste = b.id_poste " +
			"WHERE b.id_besoin = :id AND s.nom = 'transmis_finance'", nativeQuery = true)
	Optional<BesoinFinanceSummary> trouverPourFinance(@Param("id") Integer id);

	@Modifying
	@Query(value = "UPDATE besoins SET statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = :nouveauStatut) " +
			"WHERE id_besoin = :idBesoin " +
			"AND statut = (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'transmis_finance')",
			nativeQuery = true)
	int deciderBesoin(@Param("idBesoin") Integer idBesoin, @Param("nouveauStatut") String nouveauStatut);

	@Query(value = "SELECT COUNT(*) FROM besoins b " +
			"JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut " +
			"WHERE s.nom = 'transmis_finance'", nativeQuery = true)
	Long compterTransmisFinance();

	@Query(value = "SELECT COUNT(*) FROM besoins b " +
			"JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut " +
			"WHERE s.nom = 'refuse'", nativeQuery = true)
	Long compterRefusee();

	@Query(value = "SELECT COALESCE(SUM(p.salaire_min * 12 * b.effectif), 0) " +
			"FROM besoins b " +
			"JOIN postes p ON p.id_poste = b.id_poste " +
			"JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut " +
			"WHERE s.nom = 'transmis_finance'", nativeQuery = true)
	BigDecimal sommeBudgetDemandeTransmis();
}
