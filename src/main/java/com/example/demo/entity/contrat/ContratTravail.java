package com.example.demo.entity.contrat;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "contrat_travail")
public class ContratTravail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_contrat")
    private Integer id;

    @Column(name = "id_type_contrat", nullable = false)
    private Integer idTypeContrat;

    @Column(name = "id_proposition", nullable = false)
    private Integer idProposition;

    @Column(name = "date_signature", nullable = false)
    private java.sql.Timestamp dateSignature;

    @Column(name = "duree_travail")
    private Integer dureeTravail;

    @Column(name = "periode_essai")
    private Integer periodeEssai;

    @Column(name = "date_debut", nullable = false)
    private java.sql.Date dateDebut;

    @Column(name = "date_fin")
    private java.sql.Date dateFin;

    @Column(name = "salaire_mensuel", nullable = false)
    private java.math.BigDecimal salaireMensuel;

    public ContratTravail() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public Integer getIdTypeContrat() {
        return idTypeContrat;
    }

    public void setIdTypeContrat(Integer idTypeContrat) {
        this.idTypeContrat = idTypeContrat;
    }

    public Integer getIdProposition() {
        return idProposition;
    }

    public void setIdProposition(Integer idProposition) {
        this.idProposition = idProposition;
    }

    public java.sql.Timestamp getDateSignature() {
        return dateSignature;
    }

    public void setDateSignature(java.sql.Timestamp dateSignature) {
        this.dateSignature = dateSignature;
    }

    public Integer getDureeTravail() {
        return dureeTravail;
    }

    public void setDureeTravail(Integer dureeTravail) {
        this.dureeTravail = dureeTravail;
    }

    public Integer getPeriodeEssai() {
        return periodeEssai;
    }

    public void setPeriodeEssai(Integer periodeEssai) {
        this.periodeEssai = periodeEssai;
    }

    public java.sql.Date getDateDebut() {
        return dateDebut;
    }

    public void setDateDebut(java.sql.Date dateDebut) {
        this.dateDebut = dateDebut;
    }

    public java.sql.Date getDateFin() {
        return dateFin;
    }

    public void setDateFin(java.sql.Date dateFin) {
        this.dateFin = dateFin;
    }

    public java.math.BigDecimal getSalaireMensuel() {
        return salaireMensuel;
    }

    public void setSalaireMensuel(java.math.BigDecimal salaireMensuel) {
        this.salaireMensuel = salaireMensuel;
    }
}
