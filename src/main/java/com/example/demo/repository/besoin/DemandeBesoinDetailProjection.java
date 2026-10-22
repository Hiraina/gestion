package com.example.demo.repository.besoin;

import java.math.BigDecimal;
import java.time.LocalDate;

public interface DemandeBesoinDetailProjection {
	Integer getId();
	String getPoste();
	Integer getEffectif();
	String getManager();
	String getDepartement();
	LocalDate getDateSouhaitee();
	String getMotif();
	String getCompetence();
	String getStatut();
	BigDecimal getCoutAnnuelTotal();
}
