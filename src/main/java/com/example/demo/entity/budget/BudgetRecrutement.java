package com.example.demo.entity.budget;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "budget_recrutement")
public class BudgetRecrutement {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_budget")
    private Integer id;

    @Column(name = "id_poste", nullable = false)
    private Integer idPoste;

    @Column(name = "annee", nullable = false)
    private Integer annee;

    @Column(name = "nombre_postes", nullable = false)
    private Integer nombrePoste;

    @Column(name = "budget_annuel_par_personne", nullable = false)
    private Double budgetAnnuelParPersonne;

    @Column(name = "statut", nullable = false)
    private String statut;

    @Column (name = "id_validateur", nullable = false)
    private Integer idValidateur;

    public BudgetRecrutement() {
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

    public Double getBudgetAnnuelParPersonne() {
        return budgetAnnuelParPersonne;
    }

    public void setBudgetAnnuelParPersonne(Double budgetAnnuelParPersonne) {
        this.budgetAnnuelParPersonne = budgetAnnuelParPersonne;
    }

    public String getStatut() {
        return statut;
    }

    public void setStatut(String statut) {
        this.statut = statut;
    }

    public Integer getIdValidateur() {
        return idValidateur;
    }

    public void setIdValidateur(Integer idValidateur) {
        this.idValidateur = idValidateur;
    }
}