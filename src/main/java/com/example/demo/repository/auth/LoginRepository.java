package com.example.demo.repository.auth;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class LoginRepository {

	private final JdbcTemplate jdbcTemplate;

	public LoginRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public List<Map<String, Object>> findActifUtilisateurRoles(String email) {
		return jdbcTemplate.queryForList(
				"SELECT u.mot_de_passe_hash, r.nom AS role " +
				"FROM utilisateurs u " +
				"JOIN utilisateur_roles ur ON ur.id_utilisateur = u.id_utilisateur " +
				"JOIN roles r ON r.id_role = ur.id_role " +
				"WHERE u.email = ? AND u.actif = TRUE", email);
	}
}
