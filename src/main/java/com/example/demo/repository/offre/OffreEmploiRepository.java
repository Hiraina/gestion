package com.example.demo.repository.offre;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Repository
public class OffreEmploiRepository {

	private final JdbcTemplate jdbc;

	public OffreEmploiRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<Map<String, Object>> lister() {
		return jdbc.queryForList("""
				SELECT o.id_offre AS id, o.id_poste AS "idPoste", o.titre,
				       o.description, o.date_publication AS "datePublication",
				       o.date_cloture AS "dateCloture", s.nom AS statut,
				       p.titre AS "posteReference", d.nom AS departement,
				       COUNT(c.id_candidature) AS "nombreCandidatures"
				FROM offres_emploi o
				JOIN statut_offre s ON s.id_statut_offre = o.statut
				JOIN postes p ON p.id_poste = o.id_poste
				LEFT JOIN departements d ON d.id_departement = p.id_departement
				LEFT JOIN candidatures c ON c.id_offre = o.id_offre
				WHERE s.nom <> 'brouillon'
				GROUP BY o.id_offre, s.nom, p.titre, d.nom
				ORDER BY o.date_publication DESC NULLS LAST, o.id_offre DESC
				""");
	}

	public int trouverPostePourBesoinValide(int idBesoin) {
		List<Integer> ids = jdbc.query("""
				SELECT b.id_poste
				FROM besoins b
				JOIN statut_recrutement s ON s.id_statut_recrutement = b.statut
				WHERE b.id_besoin = ? AND LOWER(s.nom) = 'valide'
				""", (rs, rowNum) -> rs.getInt(1), idBesoin);
		return ids.stream().findFirst().orElseThrow(() -> new IllegalArgumentException(
				"La demande associée n'existe pas ou n'est plus validée."));
	}

	public Optional<Integer> trouverPosteActif(String titre, String departement) {
		List<Integer> ids;
		if (departement == null || departement.isBlank()) {
			ids = jdbc.query("""
					SELECT p.id_poste FROM postes p
					WHERE p.actif = TRUE AND LOWER(TRIM(p.titre)) = LOWER(TRIM(?))
					ORDER BY p.id_poste LIMIT 1
					""", (rs, rowNum) -> rs.getInt(1), titre);
		} else {
			ids = jdbc.query("""
					SELECT p.id_poste FROM postes p
					LEFT JOIN departements d ON d.id_departement = p.id_departement
					WHERE p.actif = TRUE AND LOWER(TRIM(p.titre)) = LOWER(TRIM(?))
					  AND LOWER(TRIM(COALESCE(d.nom, ''))) = LOWER(TRIM(?))
				ORDER BY p.id_poste LIMIT 1
				""", (rs, rowNum) -> rs.getInt(1), titre, departement);
		}
		return ids.stream().findFirst();
	}

	public int trouverResponsableRh() {
		List<Integer> ids = jdbc.query("""
				SELECT u.id_utilisateur
				FROM utilisateurs u
				JOIN utilisateur_roles ur ON ur.id_utilisateur = u.id_utilisateur
				JOIN roles r ON r.id_role = ur.id_role
				WHERE u.actif = TRUE AND LOWER(r.nom) = 'rh'
				ORDER BY u.id_utilisateur LIMIT 1
				""", (rs, rowNum) -> rs.getInt(1));
		return ids.stream().findFirst().orElseThrow(() -> new IllegalStateException(
				"Aucun utilisateur actif avec le rôle RH n'est configuré."));
	}

	public int creer(int idPoste, String titre, String description, String datePublication,
			String dateCloture, int idRh) {
		return jdbc.queryForObject("""
				INSERT INTO offres_emploi
					(id_poste, titre, description, date_publication, date_cloture, statut, id_rh)
				VALUES (?, ?, ?, CAST(? AS DATE), CAST(? AS DATE),
					(SELECT id_statut_offre FROM statut_offre WHERE nom = 'publiee'), ?)
				RETURNING id_offre
				""", Integer.class, idPoste, titre, description, datePublication, dateCloture, idRh);
	}

	public boolean changerStatut(int idOffre, String statut) {
		return jdbc.update("""
				UPDATE offres_emploi
				SET statut = (SELECT id_statut_offre FROM statut_offre WHERE nom = ?)
				WHERE id_offre = ?
				  AND EXISTS (SELECT 1 FROM statut_offre WHERE nom = ?)
				  AND statut <> (SELECT id_statut_offre FROM statut_offre WHERE nom = 'brouillon')
				""", statut, idOffre, statut) == 1;
	}
}
