package com.example.demo.repository.finance;

import java.math.BigDecimal;

public interface BudgetRecrutementSummary {
	Integer getId();
	Integer getIdPoste();
	Integer getAnnee();
	Integer getNombrePostes();
	BigDecimal getBudgetAnnuelParPersonne();
	BigDecimal getBudgetAnnuelTotal();
}
