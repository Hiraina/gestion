package com.example.demo.service.finance;

import com.example.demo.entity.validationFinance.ValidationFinanciaire;
import com.example.demo.repository.finance.BesoinFinanceRepository;
import com.example.demo.repository.finance.BesoinFinanceSummary;
import com.example.demo.repository.finance.BudgetRecrutementRepository;
import com.example.demo.repository.finance.BudgetRecrutementSummary;
import com.example.demo.repository.finance.ValidationFinanciereRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class FinanceService {

	private final BesoinFinanceRepository besoinRepository;
	private final BudgetRecrutementRepository budgetRepository;
	private final ValidationFinanciereRepository validationRepository;

	public FinanceService(BesoinFinanceRepository besoinRepository,
			BudgetRecrutementRepository budgetRepository,
			ValidationFinanciereRepository validationRepository) {
		this.besoinRepository = besoinRepository;
		this.budgetRepository = budgetRepository;
		this.validationRepository = validationRepository;
	}

	/** Liste des besoins transmis à la Finance (statut transmis_finance). */
	public List<Map<String, Object>> listerDemandes() {
		List<BesoinFinanceSummary> liste = besoinRepository.listerPourFinance();
		List<Map<String, Object>> result = new java.util.ArrayList<>();
		for (BesoinFinanceSummary b : liste) {
			Map<String, Object> m = new HashMap<>();
			m.put("id", b.getId());
			m.put("poste", b.getPoste());
			m.put("idPoste", b.getIdPoste());
			m.put("effectif", b.getEffectif());
			m.put("salaireMin", b.getSalaireMin() != null ? b.getSalaireMin().doubleValue() : 0);
			m.put("manager", b.getManager());
			m.put("motif", b.getMotif());
			m.put("dateSouhaitee", b.getDateSouhaitee() != null ? b.getDateSouhaitee().toString() : null);
			m.put("dateTransmissionFinance", b.getDateTransmissionFinance() != null ? b.getDateTransmissionFinance().toString() : null);
			result.add(m);
		}
		return result;
	}

	/** Détail d'un besoin à examiner. */
	public Optional<Map<String, Object>> trouverDemande(Integer id) {
		return besoinRepository.trouverPourFinance(id).map(b -> {
			Map<String, Object> m = new HashMap<>();
			m.put("id", b.getId());
			m.put("poste", b.getPoste());
			m.put("idPoste", b.getIdPoste());
			m.put("effectif", b.getEffectif());
			m.put("salaireMin", b.getSalaireMin() != null ? b.getSalaireMin().doubleValue() : 0);
			m.put("manager", b.getManager());
			m.put("motif", b.getMotif());
			m.put("dateSouhaitee", b.getDateSouhaitee() != null ? b.getDateSouhaitee().toString() : null);
			m.put("dateTransmissionFinance", b.getDateTransmissionFinance() != null ? b.getDateTransmissionFinance().toString() : null);
			return m;
		});
	}

	/**
	 * Vérifie la faisabilité budgétaire d'un besoin.
	 * Règle : coût annuel total (salaire min × 12 × effectif) < écart disponible
	 * (budget dédié - somme utilisée).
	 */
	public VerificationResult verifierDemande(Integer idBesoin) {
		Optional<BesoinFinanceSummary> besoinOpt = besoinRepository.trouverPourFinance(idBesoin);
		if (besoinOpt.isEmpty()) {
			return new VerificationResult(idBesoin, null, null, null, null, null, null, null, null, false,
					"Demande introuvable ou déjà traitée.");
		}

		BesoinFinanceSummary besoin = besoinOpt.get();
		Integer idPoste = besoin.getIdPoste();

		// Année déduite de la date souhaitée
		Integer annee = besoin.getDateSouhaitee() != null
				? besoin.getDateSouhaitee().getYear()
				: java.time.Year.now().getValue();

		// Budget annuel dédié
		Optional<BudgetRecrutementSummary> budgetOpt = budgetRepository.trouverParPosteEtAnnee(idPoste, annee);
		BigDecimal budgetDedie = budgetOpt.map(BudgetRecrutementSummary::getBudgetAnnuelTotal)
				.orElse(BigDecimal.ZERO);

		// Somme utilisée (validations approuvées)
		Integer idBudget = budgetOpt.map(BudgetRecrutementSummary::getId).orElse(null);
		BigDecimal sommeUtilisee = (idBudget != null)
				? validationRepository.trouverSommeUtiliseeParBudget(idBudget)
				: BigDecimal.ZERO;

		BigDecimal ecartDisponible = budgetDedie.subtract(sommeUtilisee);

		// Coût annuel total : salaire min × 12 × effectif
		BigDecimal salaireMin = besoin.getSalaireMin();
		Integer effectif = besoin.getEffectif();
		BigDecimal coutAnnuelTotal = salaireMin.multiply(BigDecimal.valueOf(12))
				.multiply(BigDecimal.valueOf(effectif));

		boolean valide = coutAnnuelTotal.compareTo(ecartDisponible) < 0;

		return new VerificationResult(
				idBesoin, idBudget, besoin.getPoste(), besoin.getEffectif(),
				salaireMin, budgetDedie, sommeUtilisee, ecartDisponible,
				coutAnnuelTotal, valide,
				valide ? "Budget suffisant : le coût annuel total est inférieur à l'écart disponible."
						: "Budget insuffisant : le coût annuel total dépasse l'écart disponible.");
	}

	/**
	 * Enregistre la décision financière et met à jour le statut du besoin.
	 * @param idBesoin identifiant du besoin
	 * @param idBudget identifiant du budget lié
	 * @param decision "valider" ou "refuser"
	 * @param commentaire commentaire du financier
	 * @param idFinancier identifiant du responsable finance
	 */
	public void enregistrerDecision(Integer idBesoin, Integer idBudget, String decision,
			String commentaire, Integer idFinancier) {

		// Récupérer le besoin pour obtenir le salaire et l'effectif
		BesoinFinanceSummary besoin = besoinRepository.trouverPourFinance(idBesoin)
				.orElseThrow(() -> new IllegalStateException("Besoin introuvable"));

		BigDecimal salaireAnnuel = besoin.getSalaireMin().multiply(BigDecimal.valueOf(12));

		// Créer la validation financière
		ValidationFinanciaire validation = new ValidationFinanciaire();
		validation.setIdProposition(0); // pas de proposition encore
		validation.setIdBudget(idBudget);
		validation.setSalaireAnnuelDemande(salaireAnnuel.doubleValue());
		validation.setDecision("APPROUVEE".equals(decision) ? "APPROUVEE" : "REFUSEE");
		validation.setCommentaire(commentaire);
		validation.setIdFinancier(idFinancier);
		validationRepository.save(validation);

		// Mettre à jour le statut du besoin
		String nouveauStatut = "APPROUVEE".equals(validation.getDecision()) ? "validee_finance" : "refusee";
		besoinRepository.mettreAJourStatutBesoin(idBudget, nouveauStatut);
	}

	/** Statistiques pour le tableau de bord Finance (page welcome). */
	public Map<String, Object> getStats() {
		Map<String, Object> stats = new HashMap<>();
		stats.put("demandes_attente", besoinRepository.compterTransmisFinance());
		stats.put("demandes_retournees", besoinRepository.compterRefusee());
		stats.put("budgets_valides", validationRepository.compterApprouvees());
		stats.put("budget_demande", besoinRepository.sommeBudgetDemandeTransmis() != null
				? besoinRepository.sommeBudgetDemandeTransmis().doubleValue() : 0);
		stats.put("budget_approuve", validationRepository.sommeApprouvees() != null
				? validationRepository.sommeApprouvees().doubleValue() : 0);
		stats.put("budget_restant", 0);
		return stats;
	}

	// ========================================================================
	// DTO de résultat de vérification
	// ========================================================================

	public static class VerificationResult {
		public final Integer idBesoin;
		public final Integer idBudget;
		public final String poste;
		public final Integer effectif;
		public final BigDecimal salaireMin;
		public final BigDecimal budgetAnnuelDedie;
		public final BigDecimal sommeReellementUtilisee;
		public final BigDecimal ecartDisponible;
		public final BigDecimal coutAnnuelTotal;
		public final boolean valide;
		public final String message;

		public VerificationResult(Integer idBesoin, Integer idBudget, String poste, Integer effectif,
				BigDecimal salaireMin, BigDecimal budgetAnnuelDedie,
				BigDecimal sommeReellementUtilisee, BigDecimal ecartDisponible,
				BigDecimal coutAnnuelTotal, boolean valide, String message) {
			this.idBesoin = idBesoin;
			this.idBudget = idBudget;
			this.poste = poste;
			this.effectif = effectif;
			this.salaireMin = salaireMin;
			this.budgetAnnuelDedie = budgetAnnuelDedie;
			this.sommeReellementUtilisee = sommeReellementUtilisee;
			this.ecartDisponible = ecartDisponible;
			this.coutAnnuelTotal = coutAnnuelTotal;
			this.valide = valide;
			this.message = message;
		}
	}
}
