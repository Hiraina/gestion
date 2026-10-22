package com.example.demo.repository.finance;

import com.example.demo.entity.budget.BudgetRecrutement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface BudgetRecrutementRepository extends JpaRepository<BudgetRecrutement, Integer> {

	@Query(value = "SELECT b.id_budget AS id, b.id_poste AS idPoste, b.annee AS annee, " +
			"b.nombre_postes AS nombrePostes, b.budget_annuel_par_personne AS budgetAnnuelParPersonne, " +
			"(b.nombre_postes * b.budget_annuel_par_personne) AS budgetAnnuelTotal " +
			"FROM budgets_recrutement b WHERE b.id_poste = :idPoste AND b.annee = :annee",
			nativeQuery = true)
	Optional<BudgetRecrutementSummary> trouverParPosteEtAnnee(
			@Param("idPoste") Integer idPoste, @Param("annee") Integer annee);
}
