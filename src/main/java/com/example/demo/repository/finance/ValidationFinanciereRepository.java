package com.example.demo.repository.finance;

import com.example.demo.entity.validationFinance.ValidationFinanciaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;

public interface ValidationFinanciereRepository extends JpaRepository<ValidationFinanciaire, Integer> {

	@Query(value = "SELECT COALESCE(SUM(v.salaire_annuel_demande), 0) AS sommeUtilisee " +
			"FROM validations_financieres v WHERE v.id_budget = :idBudget AND v.decision = 'APPROUVEE'",
			nativeQuery = true)
	BigDecimal trouverSommeUtiliseeParBudget(@Param("idBudget") Integer idBudget);

	@Query(value = "SELECT v.id_validation AS id, v.id_proposition AS idProposition, " +
			"v.id_budget AS idBudget, v.salaire_annuel_demande AS salaireAnnuelDemande, " +
			"v.decision AS decision, v.commentaire AS commentaire, " +
			"v.id_financier AS idFinancier, v.date_decision AS dateDecision, " +
			"v.date_demande AS dateDemande " +
			"FROM validations_financieres v WHERE v.id_budget = :idBudget " +
			"ORDER BY v.date_demande DESC", nativeQuery = true)
	List<ValidationFinanciereSummary> trouverParBudget(@Param("idBudget") Integer idBudget);

	@Query(value = "SELECT COUNT(*) FROM validations_financieres v WHERE v.decision = 'APPROUVEE'",
			nativeQuery = true)
	Long compterApprouvees();

	@Query(value = "SELECT COALESCE(SUM(v.salaire_annuel_demande), 0) " +
			"FROM validations_financieres v WHERE v.decision = 'APPROUVEE'",
			nativeQuery = true)
	BigDecimal sommeApprouvees();
}
