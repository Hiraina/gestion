package com.example.demo.repository.contrat;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class CandidatContratRepository {
	private final JdbcTemplate jdbc;

	public CandidatContratRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<Map<String, Object>> listerCandidatsAcceptes() {
		return jdbc.queryForList("""
				SELECT c.id_candidature AS id, ca.nom, ca.prenom, ca.email,
				       o.titre AS poste, s.nom AS statut,
				       details.contract_type AS "contractType",
				       details.company_name AS "companyName",
				       p.id_proposition AS "idProposition",
				       pc.statut AS "contractStatus",
				       pc.date_envoi AS "contractSentAt",
			       pc.reponse_candidat::text AS "candidateResponseData",
			       pc.date_reponse AS "candidateResponseAt",
				       fin.id_validation AS "financeValidationId",
				       fin.salaire_annuel_demande AS "salaryAnnualApproved",
				       ROUND(fin.salaire_annuel_demande / 12, 2) AS "salaryMonthlyApproved",
				       fin.commentaire AS "financeComment",
				       fin.date_decision AS "financeDecisionDate",
				       fin.annee_budget AS "financeBudgetYear"
				FROM candidatures c
				JOIN candidats ca ON ca.id_candidat = c.id_candidat
				JOIN offres_emploi o ON o.id_offre = c.id_offre
				JOIN statut_candidature s ON s.id_statut_candidature = c.statut
				LEFT JOIN LATERAL (
				  SELECT pr.id_proposition
				  FROM propositions_embauche pr
				  WHERE pr.id_candidature = c.id_candidature
				  ORDER BY pr.numero_version DESC, pr.id_proposition DESC LIMIT 1
				) p ON TRUE
				LEFT JOIN preparations_contrat pc ON pc.id_candidature = c.id_candidature
				LEFT JOIN LATERAL (
				  SELECT v.id_validation, v.salaire_annuel_demande, v.commentaire,
				         v.date_decision, b.annee AS annee_budget
				  FROM validations_financieres v
				  LEFT JOIN budgets_recrutement b ON b.id_budget = v.id_budget
				  WHERE v.id_proposition = p.id_proposition
				    AND v.decision = 'APPROUVEE'
				  ORDER BY v.date_decision DESC NULLS LAST, v.date_demande DESC, v.id_validation DESC
				  LIMIT 1
				) fin ON TRUE
				LEFT JOIN LATERAL (
				  SELECT substring(o.description FROM length('RH-OFFRE-JSON-V1:') + 1)::jsonb #>> '{data,contract}' AS contract_type,
				         substring(o.description FROM length('RH-OFFRE-JSON-V1:') + 1)::jsonb #>> '{data,company}' AS company_name
				  WHERE o.description LIKE 'RH-OFFRE-JSON-V1:%'
				) details ON TRUE
				WHERE s.nom = 'proposition'
				  AND EXISTS (
				    SELECT 1 FROM entretiens e
				    WHERE e.id_candidature = c.id_candidature AND e.resultat = 'FAVORABLE'
				  )
				  AND NOT EXISTS (
				    SELECT 1 FROM contrat_travail ct
				    WHERE ct.id_proposition = p.id_proposition
				  )
				ORDER BY c.date_candidature DESC, c.id_candidature DESC
				""");
	}

	public boolean envoyerContrat(int candidatureId, String contractJson) {
		return jdbc.update("""
				INSERT INTO preparations_contrat (id_candidature, id_proposition, donnees, statut, date_envoi)
				SELECT c.id_candidature, p.id_proposition, CAST(? AS JSONB), 'ENVOYE_CANDIDAT', CURRENT_TIMESTAMP
				FROM candidatures c
				JOIN statut_candidature s ON s.id_statut_candidature = c.statut
				LEFT JOIN LATERAL (
				  SELECT pr.id_proposition FROM propositions_embauche pr
				  WHERE pr.id_candidature = c.id_candidature
				  ORDER BY pr.numero_version DESC, pr.id_proposition DESC LIMIT 1
				) p ON TRUE
				WHERE c.id_candidature = ? AND s.nom = 'proposition'
				  AND EXISTS (SELECT 1 FROM entretiens e
				    WHERE e.id_candidature = c.id_candidature AND e.resultat = 'FAVORABLE')
				ON CONFLICT (id_candidature) DO NOTHING
				""", contractJson, candidatureId) == 1;
	}
}
