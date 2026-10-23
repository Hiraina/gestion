package com.example.demo.repository.besoin;

import java.time.LocalDate;
import java.math.BigDecimal;

public interface DemandeBesoinValideProjection {
	Integer getId();
	String getPoste();
	String getDepartement();
	String getManager();
	Integer getEffectif();
	LocalDate getDateSouhaitee();
	BigDecimal getSalaireMensuelEstime();
	String getMotif();
	String getCompetence();
}
