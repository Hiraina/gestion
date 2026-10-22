package com.example.demo.repository.candidature;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class EntretienRepository {
	private final JdbcTemplate jdbc;

	public EntretienRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<Map<String, Object>> listerCandidatures() {
		return jdbc.queryForList("""
				SELECT c.id_candidature AS id, ca.nom, ca.prenom, ca.email, ca.telephone,
				       c.date_candidature AS "dateCandidature", o.titre AS poste,
				       CASE WHEN o.description LIKE 'RH-OFFRE-JSON-V1:%'
				         THEN substring(o.description FROM length('RH-OFFRE-JSON-V1:') + 1)::jsonb #>> '{data,contract}'
				       END AS contract,
				       s.nom AS statut, cv.url_document AS "cvUrl", lm.url_document AS "lettreUrl",
				       (SELECT td.libelle FROM type_document td JOIN documents_candidature dc
				          ON dc.type_document = td.id_type_document
				        WHERE dc.id_candidature = c.id_candidature AND LOWER(td.libelle) LIKE '%cv%' LIMIT 1) AS "cvName",
				       (SELECT td.libelle FROM type_document td JOIN documents_candidature dc
				          ON dc.type_document = td.id_type_document
				        WHERE dc.id_candidature = c.id_candidature AND (LOWER(td.libelle) LIKE '%motivation%' OR LOWER(td.libelle) LIKE '%lettre%') LIMIT 1) AS "lettreName"
				FROM candidatures c
				JOIN candidats ca ON ca.id_candidat = c.id_candidat
				JOIN offres_emploi o ON o.id_offre = c.id_offre
				JOIN statut_candidature s ON s.id_statut_candidature = c.statut
				LEFT JOIN LATERAL (
				  SELECT dc.url_document FROM documents_candidature dc JOIN type_document td
				    ON td.id_type_document = dc.type_document
				  WHERE dc.id_candidature = c.id_candidature AND LOWER(td.libelle) LIKE '%cv%' LIMIT 1
				) cv ON TRUE
				LEFT JOIN LATERAL (
				  SELECT dc.url_document FROM documents_candidature dc JOIN type_document td
				    ON td.id_type_document = dc.type_document
				  WHERE dc.id_candidature = c.id_candidature
				    AND (LOWER(td.libelle) LIKE '%motivation%' OR LOWER(td.libelle) LIKE '%lettre%') LIMIT 1
				) lm ON TRUE
				WHERE s.nom IN ('recue', 'en_etude')
				  AND EXISTS (SELECT 1 FROM statut_offre so WHERE so.id_statut_offre = o.statut AND so.nom = 'publiee')
				ORDER BY c.date_candidature DESC, c.id_candidature DESC
				""");
	}

	public boolean preselectionner(int id) {
		return jdbc.update("""
				UPDATE candidatures
				SET statut = (SELECT id_statut_candidature FROM statut_candidature WHERE nom = 'entretien')
				WHERE id_candidature = ?
				  AND statut IN (SELECT id_statut_candidature FROM statut_candidature WHERE nom IN ('recue', 'en_etude'))
				""", id) == 1;
	}

	public List<Map<String, Object>> listerEntretiens() {
		return jdbc.queryForList("""
				SELECT c.id_candidature AS id, ca.nom, ca.prenom, ca.email,
				       o.titre AS poste, c.date_candidature AS "dateCandidature", s.nom AS statut,
				       e.compte_rendu AS notes, e.resultat,
				       e.date_entretien AS "dateEntretien"
				FROM candidatures c
				JOIN candidats ca ON ca.id_candidat = c.id_candidat
				JOIN offres_emploi o ON o.id_offre = c.id_offre
				JOIN statut_candidature s ON s.id_statut_candidature = c.statut
				LEFT JOIN LATERAL (
				  SELECT et.compte_rendu, et.resultat, et.date_entretien
				  FROM entretiens et
				  WHERE et.id_candidature = c.id_candidature
				  ORDER BY et.id_entretien DESC LIMIT 1
				) e ON TRUE
				WHERE s.nom = 'entretien' OR e.resultat IS NOT NULL
				ORDER BY COALESCE(e.date_entretien, c.date_candidature) DESC, c.id_candidature DESC
				""");
	}

	public boolean estEnEntretien(int id) {
		Integer count = jdbc.queryForObject("""
				SELECT COUNT(*) FROM candidatures c
				JOIN statut_candidature s ON s.id_statut_candidature = c.statut
				WHERE c.id_candidature = ? AND s.nom = 'entretien'
				""", Integer.class, id);
		return count != null && count > 0;
	}

	public void enregistrerNotes(int id, String notes, int idRh) {
		int updated = jdbc.update("""
				UPDATE entretiens SET compte_rendu = ?, date_entretien = CURRENT_TIMESTAMP
				WHERE id_entretien = (SELECT id_entretien FROM entretiens
				  WHERE id_candidature = ? ORDER BY id_entretien DESC LIMIT 1)
				""", notes, id);
		if (updated == 0) {
			jdbc.update("""
					INSERT INTO entretiens (id_candidature, id_rh, date_entretien, compte_rendu)
					VALUES (?, ?, CURRENT_TIMESTAMP, ?)
					""", id, idRh, notes);
		}
	}

	public void enregistrerDecision(int id, String notes, String resultat, int idRh) {
		int updated = jdbc.update("""
				UPDATE entretiens SET compte_rendu = ?, resultat = ?, date_entretien = CURRENT_TIMESTAMP
				WHERE id_entretien = (SELECT id_entretien FROM entretiens
				  WHERE id_candidature = ? ORDER BY id_entretien DESC LIMIT 1)
				""", notes, resultat, id);
		if (updated == 0) {
			jdbc.update("""
					INSERT INTO entretiens (id_candidature, id_rh, date_entretien, compte_rendu, resultat)
					VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?)
					""", id, idRh, notes, resultat);
		}
		String statut = switch (resultat) {
			case "FAVORABLE" -> "proposition";
			case "DEFAVORABLE" -> "rejetee";
			default -> "entretien";
		};
		jdbc.update("UPDATE candidatures SET statut = (SELECT id_statut_candidature FROM statut_candidature WHERE nom = ?) WHERE id_candidature = ?",
				statut, id);
	}
}
