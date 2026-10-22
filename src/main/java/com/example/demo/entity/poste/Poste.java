package com.example.demo.entity.poste;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;

@Entity
@Table(name = "postes")
public class Poste {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_poste")
	private Integer id;

	@Column(name = "titre", nullable = false, length = 150)
	private String titre;

	@Column(name = "description", columnDefinition = "TEXT")
	private String description;

	@Column(name = "id_departement")
	private Integer idDepartement;

	@Column(name = "salaire_min")
	private BigDecimal salaireMin;

	@Column(name = "salaire_max")
	private BigDecimal salaireMax;

	@Column(name = "actif", nullable = false)
	private Boolean actif = true;

	public Poste() {
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
