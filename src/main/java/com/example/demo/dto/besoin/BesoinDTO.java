package com.example.demo.dto.besoin;

import java.time.LocalDate;

public class BesoinDTO {

	private Integer idPoste;
	private Integer effectif = 1;
	private String nomManagerDemandeur;
	private LocalDate dateSouhaitee;
	private String motif;
	private String competance;

	public BesoinDTO() {
	}

	public Integer getIdPoste() {
		return idPoste;
	}

	public void setIdPoste(Integer idPoste) {
		this.idPoste = idPoste;
	}

	public Integer getEffectif() {
		return effectif;
	}

	public void setEffectif(Integer effectif) {
		this.effectif = effectif;
	}

	public String getNomManagerDemandeur() {
		return nomManagerDemandeur;
	}

	public void setNomManagerDemandeur(String nomManagerDemandeur) {
		this.nomManagerDemandeur = nomManagerDemandeur;
	}

	public LocalDate getDateSouhaitee() {
		return dateSouhaitee;
	}

	public void setDateSouhaitee(LocalDate dateSouhaitee) {
		this.dateSouhaitee = dateSouhaitee;
	}

	public String getMotif() {
		return motif;
	}

	public void setMotif(String motif) {
		this.motif = motif;
	}

	public String getCompetance() {
		return competance;
	}

	public void setCompetance(String competance) {
		this.competance = competance;
	}
}
