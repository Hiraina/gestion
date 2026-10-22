package com.example.demo.dto.departement;

import com.example.demo.entity.departement.Departement;

public class DepartementDTO {

	private Integer id;
	private String nom;
	private String description;

	public DepartementDTO() {
	}

	public DepartementDTO(Departement departement) {
		this.id = departement.getId();
		this.nom = departement.getNom();
		this.description = departement.getDescription();
	}

	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
	}

	public String getNom() {
		return nom;
	}

	public void setNom(String nom) {
		this.nom = nom;
	}

	public String getDescription() {
		return description;
	}

	public void setDescription(String description) {
		this.description = description;
	}
}
