package com.example.demo.repository.offre;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class TypeContratRepository {

	private final JdbcTemplate jdbc;

	public TypeContratRepository(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<String> listerLibelles() {
		return jdbc.queryForList(
				"SELECT libelle FROM type_contrat ORDER BY libelle",
				String.class);
	}
}
