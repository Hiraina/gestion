package com.example.demo.entity.validationFinance;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.sql.Date;

@Entity 
@Table (name = "validation_financiere")
public class ValidationFinanciaire {
    @Column (name = "id_validation", nullable = false)
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id; 

    @Column(name = "id_proposition", nullable = false)
    private Integer idProposition;

    @Column (name = "id_budget", nullable = false)
    private Integer idBudget;

    @Column (name = "salaire_annuel_demande", nullable = false)
    private Double salaireAnnuelDemande;

    @Column (name = "decision", nullable = false)
    private String decision;

    @Column (name = "commentaire", nullable = false)
    private String commentaire;

    @Column (name = "id_financier", nullable = false)
    private Integer idFinancier;

    @Column (name = "date_decision", nullable = false)
    private Date dateDecision;

    @Column (name = "date_demande", nullable = false)
    private Date dateDemande;

    public ValidationFinanciaire() {
    }

    public Integer getId() {
        return id;
    }

    public Integer getIdProposition() {
        return idProposition;
    }

    public Integer getIdBudget() {
        return idBudget;
    }

    public Double getSalaireAnnuelDemande() {
        return salaireAnnuelDemande;
    }

    public String getDecision() {
        return decision;
    }

    public String getCommentaire() {
        return commentaire;
    }

    public Integer getIdFinancier() {
        return idFinancier;
    }

    public Date getDateDecision() {
        return dateDecision;
    }

    public Date getDateDemande() {
        return dateDemande;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public void setIdProposition(Integer idProposition) {
        this.idProposition = idProposition;
    }

    public void setIdBudget(Integer idBudget) {
        this.idBudget = idBudget;
    }

    public void setSalaireAnnuelDemande(Double salaireAnnuelDemande) {
        this.salaireAnnuelDemande = salaireAnnuelDemande;
    }

    public void setDecision(String decision) {
        this.decision = decision;
    }

    public void setCommentaire(String commentaire) {
        this.commentaire = commentaire;
    }

    public void setIdFinancier(Integer idFinancier) {
        this.idFinancier = idFinancier;
    }

    public void setDateDecision(Date dateDecision) {
        this.dateDecision = dateDecision;
    }

    public void setDateDemande(Date dateDemande) {
        this.dateDemande = dateDemande;
    }
}