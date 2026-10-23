ALTER TABLE preparations_contrat
    ADD COLUMN reponse_candidat JSONB,
    ADD COLUMN date_reponse TIMESTAMP;

ALTER TABLE preparations_contrat
    DROP CONSTRAINT preparations_contrat_statut_check,
    ADD CONSTRAINT preparations_contrat_statut_check
        CHECK (statut IN ('ENVOYE_CANDIDAT', 'REPONSE_RECUE'));

CREATE INDEX idx_preparations_contrat_reponse
    ON preparations_contrat (date_reponse DESC)
    WHERE reponse_candidat IS NOT NULL;
