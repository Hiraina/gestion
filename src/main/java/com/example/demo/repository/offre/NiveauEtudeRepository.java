package com.example.demo.repository.offre;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class NiveauEtudeRepository {

	private final JdbcTemplate jdbc;

	public NiveauEtudeRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<String> listerLibelles() {
		return jdbc.queryForList(
				"SELECT libelle FROM niveau_etude ORDER BY id_niveau_etude",
				String.class);
	}
}
