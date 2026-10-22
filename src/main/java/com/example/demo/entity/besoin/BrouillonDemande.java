package com.example.demo.entity.besoin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "brouillon_demande")
public class BrouillonDemande {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "date_creation", nullable = false)
	private LocalDateTime dateCreation;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "donnees", nullable = false, columnDefinition = "jsonb")
	private Map<String, Object> donnees;

	public BrouillonDemande() {
	}

	public Long getId() {
		return id;
	}

	public void setId(Long id) {
		this.id = id;
	}

	public LocalDateTime getDateCreation() {
		return dateCreation;
	}

	public void setDateCreation(LocalDateTime dateCreation) {
		this.dateCreation = dateCreation;
	}

	public Map<String, Object> getDonnees() {
		return donnees;
	}

	public void setDonnees(Map<String, Object> donnees) {
		this.donnees = donnees;
	}
}
