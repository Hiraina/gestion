CREATE TABLE preparations_contrat (
    id_preparation SERIAL PRIMARY KEY,
    id_candidature INTEGER NOT NULL UNIQUE
        REFERENCES candidatures(id_candidature),
    id_proposition INTEGER
        REFERENCES propositions_embauche(id_proposition),
    donnees JSONB NOT NULL,
    statut VARCHAR(30) NOT NULL DEFAULT 'ENVOYE_CANDIDAT'
        CHECK (statut IN ('ENVOYE_CANDIDAT')),
    date_envoi TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_preparations_contrat_statut
    ON preparations_contrat (statut, date_envoi DESC);
