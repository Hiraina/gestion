package com.example.demo.dto.poste;

import com.example.demo.entity.poste.Poste;

import java.math.BigDecimal;

public class PosteDTO {

	private Integer id;
	private String titre;
	private String description;
	private Integer idDepartement;
	private BigDecimal salaireMin;
	private BigDecimal salaireMax;
	private Boolean actif;

	public PosteDTO() {
	}

	public PosteDTO(Poste poste) {
		this.id = poste.getId();
		this.titre = poste.getTitre();
		this.description = poste.getDescription();
		this.idDepartement = poste.getIdDepartement();
		this.salaireMin = poste.getSalaireMin();
		this.salaireMax = poste.getSalaireMax();
		this.actif = poste.getActif();
	}

	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
	}

	public String getTitre() {
		return titre;
	}

	public void setTitre(String titre) {
		this.titre = titre;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}

	public Integer getIdDepartement() {
		return idDepartement;
	}

	public void setIdDepartement(Integer idDepartement) {
		this.idDepartement = idDepartement;
	}

	public BigDecimal getSalaireMin() {
		return salaireMin;
	}

	public void setSalaireMin(BigDecimal salaireMin) {
		this.salaireMin = salaireMin;
	}

	public BigDecimal getSalaireMax() {
		return salaireMax;
	}

	public void setSalaireMax(BigDecimal salaireMax) {
		this.salaireMax = salaireMax;
	}

	public Boolean getActif() {
		return actif;
	}

	public void setActif(Boolean actif) {
		this.actif = actif;
	}
}
