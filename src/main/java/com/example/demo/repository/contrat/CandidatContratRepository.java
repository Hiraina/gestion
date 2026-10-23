package com.example.demo.repository.contrat;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

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
			       o.description AS "offerDescription",
				       p.id_proposition AS "idProposition",
				       pc.statut AS "contractStatus",
				       pc.date_envoi AS "contractSentAt",
			       pc.donnees::text AS "contractData",
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

	public List<Map<String, Object>> trouverEspaceCandidat(String token) {
		return jdbc.queryForList("""
				SELECT ca.nom, ca.prenom, ca.email, pc.statut,
				       pc.donnees::text AS contract,
				       pc.reponse_candidat::text AS response,
				       pc.date_reponse AS "responseDate"
				FROM preparations_contrat pc
				JOIN candidatures c ON c.id_candidature = pc.id_candidature
				JOIN candidats ca ON ca.id_candidat = c.id_candidat
				WHERE pc.token_acces = CAST(? AS UUID)
				""", token);
	}

	public boolean enregistrerReponseCandidat(String token, String reponseJson) {
		return jdbc.update("""
				UPDATE preparations_contrat
				SET reponse_candidat = CAST(? AS JSONB),
				    statut = 'REPONSE_RECUE',
				    date_reponse = CURRENT_TIMESTAMP
				WHERE token_acces = CAST(? AS UUID)
				  AND statut = 'ENVOYE_CANDIDAT'
				""", reponseJson, token) == 1;
	}

	public Optional<String> trouverReponseRecue(int candidatureId) {
		List<String> responses = jdbc.query("""
				SELECT reponse_candidat::text
				FROM preparations_contrat
				WHERE id_candidature = ? AND statut = 'REPONSE_RECUE'
				""", (rs, rowNum) -> rs.getString(1), candidatureId);
		return responses.stream().findFirst();
	}

	public boolean enregistrerAcceptationRh(int candidatureId, String reponseJson) {
		return jdbc.update("""
				UPDATE preparations_contrat
				SET reponse_candidat = CAST(? AS JSONB)
				WHERE id_candidature = ? AND statut = 'REPONSE_RECUE'
				""", reponseJson, candidatureId) == 1;
	}

	public String trouverTokenAcces(int candidatureId) {
		return jdbc.queryForObject("""
				SELECT token_acces::text FROM preparations_contrat
				WHERE id_candidature = ?
				""", String.class, candidatureId);
	}

	public boolean embaucherCandidat(int candidatureId) {
		return jdbc.update("""
				INSERT INTO contrat_travail (id_type_contrat, id_proposition, date_debut, salaire_mensuel)
				SELECT tc.id_type_contrat,
				       pc.id_proposition,
				       CAST(pc.donnees->>'startDate' AS DATE),
				       CAST(REPLACE(REGEXP_REPLACE(pc.donnees->>'salary', '[^0-9,.-]', '', 'g'), ',', '.') AS NUMERIC)
				FROM preparations_contrat pc
				JOIN type_contrat tc ON LOWER(TRIM(tc.libelle)) = LOWER(TRIM(pc.donnees->>'type'))
				WHERE pc.id_candidature = ?
				  AND pc.id_proposition IS NOT NULL
				  AND pc.statut = 'REPONSE_RECUE'
				  AND pc.reponse_candidat->'articles'->'ctArticle1'->>'choice' = 'accepted'
				  AND pc.reponse_candidat->'articles'->'ctArticle2'->>'choice' = 'accepted'
				  AND pc.reponse_candidat->'articles'->'ctArticle3'->>'choice' = 'accepted'
				  AND pc.reponse_candidat->'articles'->'ctArticle4'->>'choice' = 'accepted'
				  AND pc.reponse_candidat->'articles'->'ctArticle5'->>'choice' = 'accepted'
				  AND pc.reponse_candidat->'articles'->'ctArticle6'->>'choice' = 'accepted'
				  AND pc.reponse_candidat->'articles'->'ctArticle7'->>'choice' = 'accepted'
				  AND NOT EXISTS (
				    SELECT 1 FROM contrat_travail ct
				    WHERE ct.id_proposition = pc.id_proposition
				  )
				""", candidatureId) == 1;
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
