package com.example.demo.controller;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
public class LoginController {

	private final JdbcTemplate jdbcTemplate;

	public LoginController(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@PostMapping("/api/login")
	public String login(@RequestParam String email, @RequestParam String password) {
		List<Map<String, Object>> rows = jdbcTemplate.queryForList(
				"SELECT u.mot_de_passe_hash, r.nom AS role " +
				"FROM utilisateurs u " +
				"JOIN utilisateur_roles ur ON ur.id_utilisateur = u.id_utilisateur " +
				"JOIN roles r ON r.id_role = ur.id_role " +
				"WHERE u.email = ? AND u.actif = TRUE", email);
		for (Map<String, Object> row : rows) {
			if (password.equals(row.get("mot_de_passe_hash"))) {
				String role = String.valueOf(row.get("role")).toLowerCase();
				String view = switch (role) {
					case "direction" -> "Responsable-Direction/template.html";
					case "finance" -> "Responsable-Finance/template.html";
					case "manager" -> "Responsable-Manager/template.html";
					case "rh" -> "Responsable-RH/template.html";
					default -> null;
				};
				if (view != null) {
					return "redirect:/" + view;
				}
			}
		}
		return "redirect:/login?error";
	}
}
