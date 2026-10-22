package com.example.demo.repository.candidature;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CandidatureRepository {
	private final JdbcTemplate jdbc;

	public CandidatureRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public boolean offreOuverte(int offreId) {
		Integer count = jdbc.queryForObject("""
				SELECT COUNT(*) FROM offres_emploi o
				JOIN statut_offre s ON s.id_statut_offre = o.statut
				WHERE o.id_offre = ? AND s.nom = 'publiee'
				  AND (o.date_cloture IS NULL OR o.date_cloture >= CURRENT_DATE)
				""", Integer.class, offreId);
		return count != null && count > 0;
	}

	public Integer trouverCandidat(String email) {
		return jdbc.query("SELECT id_candidat FROM candidats WHERE LOWER(email) = LOWER(?) ORDER BY id_candidat LIMIT 1",
				(rs, rowNum) -> rs.getInt(1), email).stream().findFirst().orElse(null);
	}

	public int enregistrerCandidat(Integer id, String nom, String prenom, String email, String telephone) {
		if (id == null) {
			return jdbc.queryForObject("""
					INSERT INTO candidats (nom, prenom, email, telephone)
					VALUES (?, ?, ?, ?) RETURNING id_candidat
					""", Integer.class, nom, prenom, email, telephone);
		}
		jdbc.update("UPDATE candidats SET nom = ?, prenom = ?, telephone = ? WHERE id_candidat = ?",
				nom, prenom, telephone, id);
		return id;
	}

	public boolean dejaPostule(int candidatId, int offreId) {
		Integer count = jdbc.queryForObject("SELECT COUNT(*) FROM candidatures WHERE id_candidat = ? AND id_offre = ?",
				Integer.class, candidatId, offreId);
		return count != null && count > 0;
	}

	public int creerCandidature(int candidatId, int offreId) {
		return jdbc.queryForObject("""
				INSERT INTO candidatures (id_candidat, id_offre, statut)
				VALUES (?, ?, (SELECT id_statut_candidature FROM statut_candidature WHERE nom = 'recue'))
				RETURNING id_candidature
				""", Integer.class, candidatId, offreId);
	}

	public void enregistrerDocument(int candidatureId, String type, String url) {
		jdbc.update("INSERT INTO type_document (libelle) VALUES (?) ON CONFLICT (libelle) DO NOTHING", type);
		jdbc.update("""
				INSERT INTO documents_candidature (id_candidature, type_document, url_document)
				VALUES (?, (SELECT id_type_document FROM type_document WHERE libelle = ?), ?)
				""", candidatureId, type, url);
	}

	public void enregistrerCv(int candidatId, String url) {
		jdbc.update("UPDATE candidats SET cv_url = ? WHERE id_candidat = ?", url, candidatId);
	}
}
