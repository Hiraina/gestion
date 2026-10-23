CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE preparations_contrat
    ADD COLUMN token_acces UUID NOT NULL DEFAULT gen_random_uuid();

ALTER TABLE preparations_contrat
    ADD CONSTRAINT preparations_contrat_token_acces_unique UNIQUE (token_acces);
