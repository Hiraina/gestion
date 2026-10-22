package com.example.demo.repository.besoin;

import java.time.LocalDate;

public interface DemandeBesoinDirectionProjection {
	Integer getId();
	String getPoste();
	String getDepartement();
	String getManager();
	Integer getEffectif();
	LocalDate getDateSouhaitee();
}
