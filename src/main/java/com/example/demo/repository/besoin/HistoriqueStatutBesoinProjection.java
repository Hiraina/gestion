package com.example.demo.repository.besoin;

import java.time.LocalDateTime;

public interface HistoriqueStatutBesoinProjection {
	Integer getIdBesoin();
	String getAncienStatut();
	String getNouveauStatut();
	LocalDateTime getDateChangement();
}
