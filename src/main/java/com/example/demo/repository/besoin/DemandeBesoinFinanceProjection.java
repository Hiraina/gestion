package com.example.demo.repository.besoin;

import java.time.LocalDate;
import java.time.LocalDateTime;

public interface DemandeBesoinFinanceProjection {
	Integer getId();
	String getPoste();
	Integer getEffectif();
	String getManager();
	String getDepartement();
	String getMotif();
	String getCompetence();
	LocalDate getDateSouhaitee();
	LocalDateTime getDateTransmissionFinance();
}
