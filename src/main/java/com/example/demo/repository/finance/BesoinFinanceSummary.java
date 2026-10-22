package com.example.demo.repository.finance;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public interface BesoinFinanceSummary {
	Integer getId();
	String getPoste();
	Integer getIdPoste();
	Integer getEffectif();
	BigDecimal getSalaireMin();
	String getManager();
	String getMotif();
	LocalDate getDateSouhaitee();
	LocalDateTime getDateTransmissionFinance();
}
