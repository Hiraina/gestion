package com.example.demo.entity.besoin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;

@Entity
@Table(name = "besoins")
public class Besoin {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_besoin")
	private Integer id;

	@Column(name = "id_poste", nullable = false)
	private Integer idPoste;

	@Column(name = "nom_manager_demandeur", nullable = false, length = 150)
	private String nomManagerDemandeur;

	@Column(name = "date_souhaitee", nullable = false)
	private LocalDate dateSouhaitee;

	@Column(name = "motif", columnDefinition = "TEXT")
	private String motif;

	@Column(name = "competance", columnDefinition = "TEXT")
	private String competance;

	@Column(name = "statut", nullable = false)
	private Integer statut = 1;

	public Besoin() {
	}

	public Integer getId() {
		return id;
	}

	public void setId(Integer id) {
		this.id = id;
	}

	public Integer getIdPoste() {
		return idPoste;
	}

	public void setIdPoste(Integer idPoste) {
		this.idPoste = idPoste;
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

	public Integer getStatut() {
		return statut;
	}

	public void setStatut(Integer statut) {
		this.statut = statut;
	}
}
