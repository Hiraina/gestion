package com.example.demo.controller;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;

/**
 * Sert les vues Thymeleaf stockées dans classpath:/webapp/.
 *
 * Les fichiers "template.html" sont les pages principales d'un espace de travail,
 * les fichiers "pages/*.html" sont des fragments injectés par templating.js.
 */
@Controller
public class ViewController {

	/** Dossiers autorisés : évite toute traversée de répertoire via l'URL. */
	private static final List<String> DOSSIERS = List.of(
			"Responsable-Direction",
			"Responsable-Finance",
			"Responsable-Manager",
			"Responsable-RH");

	/** Nom de fichier de fragment : caractères sûrs uniquement. */
	private static final Pattern SAFE_NAME = Pattern.compile("^[A-Za-z0-9_-]+$");

	@Value("${spring.thymeleaf.prefix:classpath:/webapp/}")
	private String templatePrefix;

	@Value("${spring.thymeleaf.suffix:.html}")
	private String templateSuffix;

	/** Page principale d'un espace de travail. */
	@GetMapping("/{dossier}/template.html")
	public String template(@PathVariable String dossier, Model model) {
		checkDossier(dossier);
		model.addAttribute("dossier", dossier);
		return dossier + "/template";
	}

	/** Fragment injecté dynamiquement dans #main-content par templating.js. */
	@GetMapping("/{dossier}/pages/{page}.html")
	public String page(@PathVariable String dossier, @PathVariable String page, Model model) {
		checkDossier(dossier);
		if (!SAFE_NAME.matcher(page).matches()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Page inconnue : " + page);
		}
		if (!exists(dossier + "/pages/" + page)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Page inconnue : " + page);
		}
		model.addAttribute("dossier", dossier);
		return dossier + "/pages/" + page;
	}

	/** Pages autonomes de l'espace candidat. */
	@GetMapping("/candidat/{page}.html")
	public String candidat(@PathVariable String page, Model model) {
		if (!SAFE_NAME.matcher(page).matches()) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Page inconnue : " + page);
		}
		if (!exists("candidat/" + page)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Page inconnue : " + page);
		}
		model.addAttribute("dossier", "candidat");
		return "candidat/" + page;
	}

	private void checkDossier(String dossier) {
		if (!DOSSIERS.contains(dossier)) {
			throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Espace inconnu : " + dossier);
		}
	}

	private boolean exists(String viewName) {
		String location = templatePrefix + viewName + templateSuffix;
		if (location.startsWith("classpath:")) {
			location = location.substring("classpath:".length());
		}
		return new ClassPathResource(location).exists();
	}
}
