package com.example.demo.repository.besoin;

import java.time.LocalDate;

public interface DemandeBesoinValideProjection {
	Integer getId();
	String getPoste();
	String getDepartement();
	String getManager();
	Integer getEffectif();
	LocalDate getDateSouhaitee();
	String getMotif();
	String getCompetence();
}
