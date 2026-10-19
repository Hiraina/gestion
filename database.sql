-- COMPTE, RÔLES et UTILISATEURS

CREATE TABLE roles (
    id_role SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO roles (nom) VALUES
('RH'),
('manager'),
('direction'),
('finance'),
('candidat'),
('employe');

CREATE TABLE utilisateurs (
    id_utilisateur SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    mot_de_passe_hash TEXT NOT NULL,
    actif BOOLEAN NOT NULL DEFAULT TRUE,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE utilisateur_roles (
    id_utilisateur INTEGER NOT NULL
        REFERENCES utilisateurs(id_utilisateur),
    id_role INTEGER NOT NULL
        REFERENCES roles(id_role),

    PRIMARY KEY (id_utilisateur, id_role)
);

CREATE TABLE departements (
    id_departement SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);


CREATE TABLE postes (
    id_poste SERIAL PRIMARY KEY,
    titre VARCHAR(150) NOT NULL,
    description TEXT,
    id_departement INTEGER
        REFERENCES departements(id_departement),
    salaire_min NUMERIC(12, 2)
        CHECK (salaire_min >= 0),
    salaire_max NUMERIC(12, 2),
    actif BOOLEAN NOT NULL DEFAULT TRUE,

    CHECK (
        salaire_max IS NULL
        OR salaire_min IS NULL
        OR salaire_max >= salaire_min
    )
);

CREATE TABLE statut_emp (
    id_statut SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO TABLE statut_emp (nom) VALUES
('actif'),
('suspendu'),
('parti');

CREATE TABLE employes (
    id_employe SERIAL PRIMARY KEY,
    id_utilisateur INTEGER UNIQUE
        REFERENCES utilisateurs(id_utilisateur),
    matricule VARCHAR(30) NOT NULL UNIQUE,
    id_poste INTEGER REFERENCES postes(id_poste),
    id_manager INTEGER REFERENCES employes(id_employe),
    date_embauche DATE NOT NULL,
    date_depart DATE,
    id_statut INTEGER NOT NULL
        REFERENCES statut_emp(id_statut),

    CHECK (
        date_depart IS NULL
        OR date_depart >= date_embauche
    ),

    CHECK (
        id_manager IS NULL
        OR id_manager <> id_employe
    )
);

-- RECRUTEMENT

CREATE TABLE candidats (
    id_candidat SERIAL PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    telephone VARCHAR(30),
    cv_url TEXT,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE statut_offre (
    id_statut_offre SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL UNIQUE
)

INSERT INTO statut_offre (nom) VALUES
('brouillon'),
('publiee'),
('suspendue'),
('cloturee');

CREATE TABLE offres_emploi (
    id_offre SERIAL PRIMARY KEY,
    id_poste INTEGER NOT NULL REFERENCES postes(id_poste),
    titre VARCHAR(150) NOT NULL,
    description TEXT,
    date_publication DATE,
    date_cloture DATE,
    statut INT NOT NULL REFERENCES statut_offre(id_statut_offre),
    id_rh INTEGER NOT NULL
        REFERENCES utilisateurs(id_utilisateur),

    CHECK (
        date_cloture IS NULL
        OR date_publication IS NULL
        OR date_cloture >= date_publication
    )
);

CREATE TABLE statut_candidature (
    id_statut_candidature SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO statut_candidature (nom) VALUES
('recue'),
('en_etude'),
('entretien'),
('proposition'),
('embauche'),
('rejetee'),
('retirée');

CREATE TABLE candidatures (
    id_candidature SERIAL PRIMARY KEY,
    id_candidat INTEGER NOT NULL
        REFERENCES candidats(id_candidat),
    id_offre INTEGER NOT NULL
        REFERENCES offres_emploi(id_offre),
    date_candidature TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    statut INT NOT NULL REFERENCES statut_candidature(id_statut_candidature),

    UNIQUE (id_candidat, id_offre)
);


CREATE TABLE entretiens (
    id_entretien SERIAL PRIMARY KEY,
    id_candidature INTEGER NOT NULL
        REFERENCES candidatures(id_candidature),
    id_rh INTEGER NOT NULL
        REFERENCES utilisateurs(id_utilisateur),
    date_entretien TIMESTAMP NOT NULL,
    compte_rendu TEXT,
    resultat VARCHAR(20)
        CHECK (
            resultat IS NULL
            OR resultat IN (
                'FAVORABLE',
                'DEFAVORABLE',
                'A_REVOIR'
            )
        )
);


-- BUDGET SALARRIAL et NEGOCIATION avec la FINANCE

CREATE TABLE statut_recrutement (
    id_statut_recrutement SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO statut_recrutement (nom) VALUES
('en_attente'),
('valide'),
('refuse'),
('cloture');

CREATE TABLE budgets_recrutement (
    id_budget SERIAL PRIMARY KEY,
    id_poste INTEGER NOT NULL REFERENCES postes(id_poste),
    annee INTEGER NOT NULL,
    nombre_postes INTEGER NOT NULL DEFAULT 1
        CHECK (nombre_postes > 0),
    budget_annuel_par_personne NUMERIC(14, 2) NOT NULL
        CHECK (budget_annuel_par_personne >= 0),
    statut INT NOT NULL
        REFERENCES statut_recrutement(id_statut_recrutement),
    id_validateur INTEGER
        REFERENCES utilisateurs(id_utilisateur),

    UNIQUE (id_poste, annee)
);

CREATE TABLE statut_embauche (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO statut_embauche (nom) VALUES
('en_attente'),
('acceptee'),
('refusee'),
('contre_proposition'),
('annulee');

CREATE TABLE propositions_embauche (
    id_proposition SERIAL PRIMARY KEY,
    id_candidature INTEGER NOT NULL
        REFERENCES candidatures(id_candidature),
    numero_version INTEGER NOT NULL DEFAULT 1
        CHECK (numero_version > 0),
    salaire_mensuel_propose NUMERIC(12, 2) NOT NULL
        CHECK (salaire_mensuel_propose >= 0),
    salaire_annuel_propose NUMERIC(14, 2)
        GENERATED ALWAYS AS (
            salaire_mensuel_propose * 12
        ) STORED,
    salaire_mensuel_demande NUMERIC(12, 2)
        CHECK (
            salaire_mensuel_demande IS NULL
            OR salaire_mensuel_demande >= 0
        ),
    statut INT NOT NULL
        REFERENCES statut_embauche(id),
    date_proposition TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    date_reponse TIMESTAMP,

    UNIQUE (id_candidature, numero_version)
);

CREATE TABLE validations_financieres (
    id_validation SERIAL PRIMARY KEY,
    id_proposition INTEGER NOT NULL
        REFERENCES propositions_embauche(id_proposition),
    id_budget INTEGER NOT NULL
        REFERENCES budgets_recrutement(id_budget),
    salaire_annuel_demande NUMERIC(14, 2) NOT NULL
        CHECK (salaire_annuel_demande >= 0),
    decision VARCHAR(20) NOT NULL DEFAULT 'EN_ATTENTE'
        CHECK (decision IN (
            'EN_ATTENTE',
            'APPROUVEE',
            'REFUSEE'
        )),
    commentaire TEXT,
    id_financier INTEGER
        REFERENCES utilisateurs(id_utilisateur),
    date_decision TIMESTAMP,
    date_demande TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
