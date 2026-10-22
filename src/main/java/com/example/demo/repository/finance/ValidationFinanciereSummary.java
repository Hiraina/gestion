package com.example.demo.repository.finance;

import java.math.BigDecimal;
import java.sql.Date;

public interface ValidationFinanciereSummary {
	Integer getId();
	Integer getIdProposition();
	Integer getIdBudget();
	BigDecimal getSalaireAnnuelDemande();
	String getDecision();
	String getCommentaire();
	Integer getIdFinancier();
	Date getDateDecision();
	Date getDateDemande();
}
