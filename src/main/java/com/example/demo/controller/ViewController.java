package com.example.demo.controller;

import com.example.demo.dto.besoin.BesoinDTO;
import com.example.demo.dto.besoin.BrouillonDemandeRequest;
import com.example.demo.dto.besoin.ResumeManagerDTO;
import com.example.demo.dto.departement.DepartementDTO;
import com.example.demo.dto.poste.PosteDTO;
import com.example.demo.entity.departement.Departement;
import com.example.demo.repository.besoin.DemandeBesoinDetailProjection;
import com.example.demo.repository.besoin.DemandeBesoinDirectionProjection;
import com.example.demo.repository.besoin.DemandeBesoinFinanceProjection;
import com.example.demo.repository.besoin.DemandeBesoinValideProjection;
import com.example.demo.repository.besoin.ResumeDirectionProjection;
import com.example.demo.service.besoin.BesoinService;
import com.example.demo.service.besoin.BrouillonDemandeService;
import com.example.demo.service.besoin.ManagerAccueilService;
import com.example.demo.service.departement.DepartementService;
import com.example.demo.service.poste.PosteService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

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

	private final DepartementService departementService;
	private final PosteService posteService;
	private final BesoinService besoinService;
	private final BrouillonDemandeService brouillonDemandeService;
	private final ManagerAccueilService managerAccueilService;

	public ViewController(DepartementService departementService, PosteService posteService, BesoinService besoinService,
			BrouillonDemandeService brouillonDemandeService, ManagerAccueilService managerAccueilService) {
		this.departementService = departementService;
		this.posteService = posteService;
		this.besoinService = besoinService;
		this.brouillonDemandeService = brouillonDemandeService;
		this.managerAccueilService = managerAccueilService;
	}

	/** Page principale d'un espace de travail. */
	@GetMapping("/{dossier}/template.html")
	public String template(@PathVariable String dossier, Model model) {
		checkDossier(dossier);
		model.addAttribute("dossier", dossier);
		addDepartements(model);
		addPostes(model);
		return dossier + "/template";
	}

	/** Fragment injecté dynamiquement dans #main-content par templating.js. */
	@GetMapping("/{dossier}/pages/{page}.html")
	public String page(@PathVariable String dossier, @PathVariable String page, Model model) {
		checkDossier(dossier);
		if (!SAFE_NAME.matcher(page).matches()) {
			throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Page inconnue : " + page);
		}
		if (!exists(dossier + "/pages/" + page)) {
			throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Page inconnue : " + page);
		}
		model.addAttribute("dossier", dossier);
		addDepartements(model);
		addPostes(model);
		model.addAttribute("besoinDTO", new BesoinDTO());
		if ("Responsable-RH".equals(dossier) && "liste-demandes".equals(page)) {
			model.addAttribute("demandes", besoinService.listerPourRH());
		}
		return dossier + "/pages/" + page;
	}

	/** Pages autonomes de l'espace candidat. */
	@GetMapping("/candidat/{page}.html")
	public String candidat(@PathVariable String page, Model model) {
		if (!SAFE_NAME.matcher(page).matches()) {
			throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Page inconnue : " + page);
		}
		if (!exists("candidat/" + page)) {
			throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Page inconnue : " + page);
		}
		model.addAttribute("dossier", "candidat");
		addDepartements(model);
		addPostes(model);
		return "candidat/" + page;
	}

	/** Soumission d'une demande de besoin : insert en statut "en attente" (id 1). */
	@PostMapping("/{dossier}/pages/demande_besoin/soumettre")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> soumettreBesoin(@PathVariable String dossier,
			@ModelAttribute BesoinDTO besoinDTO, BindingResult result,
			@org.springframework.web.bind.annotation.RequestParam(required = false) Long brouillonId) {
		checkDossier(dossier);
		if (result.hasErrors()) {
			Map<String, Object> error = new HashMap<>();
			error.put("success", false);
			error.put("message", "Champs invalides : " + result.getAllErrors());
			return ResponseEntity.badRequest().body(error);
		}
		besoinService.creerBesoin(besoinDTO);
		if (brouillonId != null) {
			brouillonDemandeService.supprimer(brouillonId);
		}
		Map<String, Object> ok = new HashMap<>();
		ok.put("success", true);
		ok.put("message", "Votre demande a été soumise. Vous pouvez suivre son avancement dans « Suivi de mes demandes ».");
		return ResponseEntity.ok(ok);
	}

	@GetMapping("/{dossier}/pages/brouillons")
	@ResponseBody
	public List<com.example.demo.entity.besoin.BrouillonDemande> brouillons(@PathVariable String dossier) {
		checkDossier(dossier);
		return brouillonDemandeService.lister();
	}

	@GetMapping("/api/rh/besoins-valides")
	@ResponseBody
	public List<DemandeBesoinValideProjection> besoinsValides() {
		return besoinService.listerValides();
	}

	@GetMapping("/api/manager/suivi-besoins")
	@ResponseBody
	public List<Map<String, Object>> suiviBesoinsManager() {
		return besoinService.listerSuiviManager();
	}

	@GetMapping("/api/manager/accueil")
	@ResponseBody
	public ResumeManagerDTO resumeAccueilManager() {
		return managerAccueilService.obtenirResume();
	}

	@GetMapping("/api/manager/historique-besoins")
	@ResponseBody
	public List<Map<String, Object>> historiqueBesoinsManager() {
		return besoinService.listerHistoriqueFinaliseManager();
	}

	@GetMapping("/{dossier}/api/besoins/{id}")
	@ResponseBody
	public ResponseEntity<DemandeBesoinDetailProjection> detailsBesoin(@PathVariable String dossier,
			@PathVariable Integer id) {
		checkDossier(dossier);
		return besoinService.trouverDetailsPourRH(id)
				.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.notFound().build());
	}

	@PostMapping("/Responsable-RH/api/besoins/{id}/transmettre")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> transmettreBesoinFinance(@PathVariable Integer id) {
		if (!besoinService.transmettreALaFinance(id)) {
			return ResponseEntity.badRequest().body(Map.of("success", false,
					"message", "Cette demande n’existe pas ou n’est plus en attente de transmission."));
		}
		return ResponseEntity.ok(Map.of("success", true, "message", "La demande a été transmise à la Finance."));
	}

	@PostMapping("/Responsable-RH/api/besoins/{id}/transmettre-direction")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> transmettreBesoinDirection(@PathVariable Integer id) {
		if (!besoinService.transmettreALaDirection(id)) {
			return ResponseEntity.badRequest().body(Map.of("success", false,
					"message", "Cette demande n’existe pas ou n’est pas validée par la Finance."));
		}
		return ResponseEntity.ok(Map.of("success", true, "message", "La demande a été transmise à la Direction."));
	}

	@GetMapping("/api/direction/besoins-a-approuver")
	@ResponseBody
	public List<DemandeBesoinDirectionProjection> besoinsAapprouverDirection() {
		return besoinService.listerPourDirection();
	}

	@GetMapping("/api/direction/resume")
	@ResponseBody
	public ResumeDirectionProjection resumeDirection() {
		return besoinService.obtenirResumeDirection();
	}

	@PostMapping("/api/direction/besoins/{id}/decision")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> deciderBesoinDirection(@PathVariable Integer id,
			@RequestBody Map<String, String> request) {
		String decision = request.get("decision");
		if (!besoinService.deciderParDirection(id, decision)) {
			return ResponseEntity.badRequest().body(Map.of("success", false,
					"message", "Cette demande n’existe pas ou n’est plus en attente de décision."));
		}
		String message = "approuver".equals(decision)
				? "La demande a été approuvée et ajoutée au suivi des validations."
				: "La demande a été refusée.";
		return ResponseEntity.ok(Map.of("success", true, "message", message));
	}

	@GetMapping("/api/finance/besoins-a-examiner")
	@ResponseBody
	public List<DemandeBesoinFinanceProjection> besoinsAExaminerFinance() {
		return besoinService.listerPourFinance();
	}

	@GetMapping("/api/finance/besoins/{id}")
	@ResponseBody
	public ResponseEntity<DemandeBesoinFinanceProjection> detailsBesoinFinance(@PathVariable Integer id) {
		return besoinService.trouverPourFinance(id)
				.map(ResponseEntity::ok)
				.orElseGet(() -> ResponseEntity.notFound().build());
	}

	@PostMapping("/{dossier}/pages/brouillons")
	@ResponseBody
	public ResponseEntity<Map<String, Object>> enregistrerBrouillon(@PathVariable String dossier,
			@org.springframework.web.bind.annotation.RequestBody BrouillonDemandeRequest request) {
		checkDossier(dossier);
		if (request.donnees() == null || request.donnees().isEmpty()) {
			return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Le formulaire est vide."));
		}
		var brouillon = brouillonDemandeService.enregistrer(request.id(), request.donnees());
		return ResponseEntity.ok(Map.of("success", true, "id", brouillon.getId(), "message", "Brouillon enregistré."));
	}

	private void addDepartements(Model model) {
		List<DepartementDTO> departements = departementService.listerTous();
		model.addAttribute("departements", departements);
	}

	private void addPostes(Model model) {
		List<PosteDTO> postes = posteService.listerTous();
		model.addAttribute("postes", postes);
	}

	private void checkDossier(String dossier) {
		if (!DOSSIERS.contains(dossier)) {
			throw new ResponseStatusException(org.springframework.http.HttpStatus.NOT_FOUND, "Espace inconnu : " + dossier);
		}
	}

	private boolean exists(String viewName) {
		String location = "classpath:/webapp/" + viewName + ".html";
		if (location.startsWith("classpath:")) {
			location = location.substring("classpath:".length());
		}
		return new org.springframework.core.io.ClassPathResource(location).exists();
	}
}
