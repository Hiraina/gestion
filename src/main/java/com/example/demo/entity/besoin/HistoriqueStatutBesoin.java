package com.example.demo.entity.besoin;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

@Entity
@Table(name = "historique_statut_besoin")
public class HistoriqueStatutBesoin {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_historique")
	private Long id;

	@Column(name = "id_besoin", nullable = false)
	private Integer idBesoin;

	@Column(name = "ancien_statut")
	private Integer ancienStatut;

	@Column(name = "nouveau_statut", nullable = false)
	private Integer nouveauStatut;

	@Column(name = "date_changement", nullable = false)
	private LocalDateTime dateChangement;

	protected HistoriqueStatutBesoin() {
	}
}
