package com.example.demo.repository.besoin;

import java.time.LocalDate;

public interface DemandeBesoinListeProjection {
	Integer getId();
	String getPoste();
	Integer getEffectif();
	String getManager();
	LocalDate getDateSouhaitee();
	String getStatut();
}
