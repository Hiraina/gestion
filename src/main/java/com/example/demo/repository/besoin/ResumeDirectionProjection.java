package com.example.demo.repository.besoin;

import java.math.BigDecimal;

public interface ResumeDirectionProjection {
	long getEnAttente();
	long getApprouvees();
	long getRefusees();
	long getEnCours();
	BigDecimal getBudgetAapprouver();
}
