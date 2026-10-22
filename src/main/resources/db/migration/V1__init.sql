-- Migration Flyway V1 : schema initial de l'application Carriere+
--
-- Source de verite du schema. Appliquee automatiquement au demarrage.
-- Toute evolution du schema doit passer par une nouvelle migration
-- (V2__....sql, V3__....sql) et JAMAIS par une modification de ce fichier.
--
-- Contenu : les 23 tables de la base + les donnees de demonstration
-- (roles, statuts, 4 comptes utilisateurs et leurs roles).
--
-- Ce fichier est genere a partir de database.sql (copie de confort pour
-- un reset manuel via psql) ; les deux doivent rester identiques.
--
-- Corrections appliquees par rapport a la version initiale :
--   * utilisateur_roles : CREATE TABLE deplace avant son INSERT
--   * "INSERT INTO TABLE statut_emp" -> "INSERT INTO statut_emp"
--   * ";" manquant apres "CREATE TABLE statut_offre (...)"
--   * table besoins : ";" manquant, colonne "annee" absente alors que la
--     contrainte UNIQUE (id_poste, annee) la reference, et deplacement apres
--     la creation de statut_recrutement dont elle depend
--   * les INSERT de semence (utilisateurs, utilisateur_roles) sont conserves :
--     le login de l'application lit ces tables

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

INSERT INTO utilisateurs (nom, prenom, email, mot_de_passe_hash, actif) VALUES
('Direction', 'User', 'direction@gmail.com', 'direction123', TRUE),
('Finance', 'User', 'finance@gmail.com', 'finance123', TRUE),
('Manager', 'User', 'manager@gmail.com', 'manager123', TRUE),
('RH', 'User', 'rh@gmail.com', 'rh123', TRUE);

CREATE TABLE utilisateur_roles (
    id_utilisateur INTEGER NOT NULL
        REFERENCES utilisateurs(id_utilisateur),
    id_role INTEGER NOT NULL
        REFERENCES roles(id_role),

    PRIMARY KEY (id_utilisateur, id_role)
);

INSERT INTO utilisateur_roles (id_utilisateur, id_role)
SELECT u.id_utilisateur, r.id_role
FROM utilisateurs u JOIN roles r ON
  (u.email='direction@gmail.com' AND r.nom='direction') OR
  (u.email='finance@gmail.com' AND r.nom='finance') OR
  (u.email='manager@gmail.com' AND r.nom='manager') OR
  (u.email='rh@gmail.com' AND r.nom='RH');

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

-- Departements et postes de l'entreprise (donnees de demonstration)
INSERT INTO departements (nom, description) VALUES
('Ressources Humaines', 'Gestion du personnel et du recrutement'),
('Direction', 'Direction generale et strategique'),
('Finance', 'Budgets, comptabilite et validation financiere'),
('Informatique', 'Systemes d information et support technique'),
('Marketing', 'Communication et promotion'),
('Production', 'Fabrication et operations'),
('Ventes', 'Ventes et relation client')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO postes (titre, description, id_departement, salaire_min, salaire_max, actif) VALUES
('Directeur RH', 'Pilote la strategie RH et le circuit de validation des besoins', 2, 800000000, 1200000000, TRUE),
('Charge de recrutement RH', 'Gere les offres, candidatures et entretiens', 1, 400000000, 600000000, TRUE),
('Responsable Finance', 'Valide les budgets et les propositions salariales', 3, 700000000, 1000000000, TRUE),
('Analyste budgets', 'Suivi des couts du personnel et des budgets de recrutement', 3, 450000000, 650000000, TRUE),
('Developpeur backend', 'Developpement et maintenance du SI RH', 4, 500000000, 800000000, TRUE),
('Responsable Marketing', 'Communication et marque employeur', 5, 550000000, 850000000, TRUE),
('Chef de production', 'Supervise les equipes de production', 6, 600000000, 900000000, TRUE),
('Commercial', 'Developpement commercial et relation client', 7, 350000000, 700000000, TRUE),
('Assistant administratif', 'Support administratif transverses', 1, 250000000, 400000000, TRUE)
ON CONFLICT DO NOTHING;

CREATE TABLE statut_emp (
    id_statut SERIAL PRIMARY KEY,
    nom VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO statut_emp (nom) VALUES
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
);

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

CREATE TABLE type_document (
    id_type_document SERIAL PRIMARY KEY,
    libelle VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE documents_candidature (
    id_document SERIAL PRIMARY KEY,
    id_candidature INTEGER NOT NULL
        REFERENCES candidatures(id_candidature),
    type_document INTEGER NOT NULL
        REFERENCES type_document(id_type_document),
    url_document TEXT NOT NULL,
    date_ajout TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (id_candidature, type_document)
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
('cloture'),
('transmis_finance'),
('validee_finance'),
('transmis_direction');

-- DEMANDES DE BESOIN (circuit de validation manager -> direction -> RH)

CREATE TABLE besoins (
    id_besoin SERIAL PRIMARY KEY,
    id_poste INTEGER NOT NULL REFERENCES postes(id_poste),
    nom_manager_demandeur VARCHAR(150) NOT NULL,
    date_souhaitee DATE NOT NULL,
    motif TEXT,
    competance TEXT,
    effectif INTEGER NOT NULL DEFAULT 1
        CHECK (effectif > 0),
    statut INT NOT NULL
        REFERENCES statut_recrutement(id_statut_recrutement),
    date_transmission_finance TIMESTAMP
);

INSERT INTO besoins (id_poste, nom_manager_demandeur, date_souhaitee, motif, competance, effectif, statut, date_transmission_finance) VALUES
(1, 'Manager Demo', CURRENT_DATE, 'Besoin valide finance', 'Competence demo', 1, (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom='validee_finance'), CURRENT_TIMESTAMP);

CREATE TABLE brouillon_demande (
    id BIGSERIAL PRIMARY KEY,
    date_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    donnees JSONB NOT NULL
);

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
    statut INT NOT NULL REFERENCES statut_embauche(id),
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

CREATE TABLE type_contrat(
    id_type_contrat SERIAL PRIMARY KEY,
    libelle VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE contrat_travail(
    id_contrat SERIAL PRIMARY KEY,
    id_type_contrat INTEGER NOT NULL REFERENCES type_contrat(id_type_contrat),
    id_proposition INTEGER NOT NULL REFERENCES propositions_embauche(id_proposition),
    date_signature TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duree_travail INTEGER,
    periode_essai INTEGER,
    date_debut DATE NOT NULL,
    date_fin DATE,
    salaire_mensuel NUMERIC(12, 2) NOT NULL
        CHECK (salaire_mensuel >= 0),
    salaire_annuel NUMERIC(14, 2)
        GENERATED ALWAYS AS (
            salaire_mensuel * 12
        ) STORED,

    CHECK (
        date_fin IS NULL
        OR date_fin >= date_debut
    )
);

-- ============================================================================
-- DONNEES DE TEST POUR LA FINANCE (budget annuel, somme utilisee, besoins)
-- A conserver pour tester le calcul automatique de faisabilite financiere.
-- ============================================================================

-- Budget de recrutement pour le poste "Developpeur backend" (annee 2026)
-- budget annuel dedie = nombre_postes * budget_annuel_par_personne = 1 * 50 000 000 Ar
INSERT INTO budgets_recrutement (id_poste, annee, nombre_postes, budget_annuel_par_personne, statut, id_validateur)
SELECT p.id_poste, 2026, 1, 50000000,
       (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'valide'),
       (SELECT id_utilisateur FROM utilisateurs WHERE email = 'finance@gmail.com')
FROM postes p WHERE p.titre = 'Developpeur backend'
AND NOT EXISTS (SELECT 1 FROM budgets_recrutement WHERE id_poste = p.id_poste AND annee = 2026);

-- Besoin transmis a la Finance (statut transmis_finance) pour Developpeur backend
INSERT INTO besoins (id_poste, date_souhaitee, motif, effectif, statut, nom_manager_demandeur)
SELECT p.id_poste, '2026-11-01', 'Renfort equipe developpement backend', 1,
       (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'transmis_finance'),
       'M. Dubois'
FROM postes p WHERE p.titre = 'Developpeur backend'
AND NOT EXISTS (SELECT 1 FROM besoins WHERE id_poste = p.id_poste AND date_souhaitee = '2026-11-01');

-- Somme utilisee : validation financiere APPROUVEE sur ce budget (10 000 000 Ar)
-- Cela donne un ecart disponible de 40 000 000 Ar (50M - 10M)
-- Cout annuel total pour 1 personne a 3 000 000 Ar/mois = 36 000 000 Ar < 40M => VALIDE
INSERT INTO offres_emploi (id_poste, titre, description, statut, id_rh)
SELECT p.id_poste, 'Offre test Developpeur backend', 'Test calcul finance', 2, 4
FROM postes p WHERE p.titre = 'Developpeur backend'
AND NOT EXISTS (SELECT 1 FROM offres_emploi WHERE titre = 'Offre test Developpeur backend');

INSERT INTO candidats (nom, prenom, email)
SELECT 'Candidat', 'Test Finance', 'test.finance@mg.mg'
WHERE NOT EXISTS (SELECT 1 FROM candidats WHERE email = 'test.finance@mg.mg');

INSERT INTO candidatures (id_candidat, id_offre, statut)
SELECT c.id_candidat, o.id_offre, 1
FROM candidats c, offres_emploi o
WHERE c.email = 'test.finance@mg.mg' AND o.titre = 'Offre test Developpeur backend'
AND NOT EXISTS (SELECT 1 FROM candidatures WHERE id_candidat = c.id_candidat AND id_offre = o.id_offre);

INSERT INTO propositions_embauche (id_candidature, salaire_mensuel_propose, statut)
SELECT ca.id_candidature, 3000000, 2
FROM candidatures ca, offres_emploi o
WHERE ca.id_offre = o.id_offre AND o.titre = 'Offre test Developpeur backend'
AND NOT EXISTS (SELECT 1 FROM propositions_embauche WHERE id_candidature = ca.id_candidature AND numero_version = 1);

INSERT INTO validations_financieres (id_proposition, id_budget, salaire_annuel_demande, decision, commentaire, id_financier)
SELECT pr.id_proposition, b.id_budget, 10000000, 'APPROUVEE', 'Test somme utilisee developpeur backend', 4
FROM propositions_embauche pr, budgets_recrutement b, postes po
WHERE pr.id_proposition = (SELECT MAX(id_proposition) FROM propositions_embauche)
  AND po.titre = 'Developpeur backend' AND b.id_poste = po.id_poste AND b.annee = 2026
AND NOT EXISTS (SELECT 1 FROM validations_financieres WHERE id_proposition = pr.id_proposition);

-- Budget de recrutement pour le poste "Responsable Finance" (annee 2026)
-- Permet d'avoir un ecart disponible non nul lors de l'examen d'un besoin sur ce poste en 2026.
INSERT INTO budgets_recrutement (id_poste, annee, nombre_postes, budget_annuel_par_personne, statut, id_validateur)
SELECT p.id_poste, 2026, 1, 800000000,
       (SELECT id_statut_recrutement FROM statut_recrutement WHERE nom = 'valide'),
       (SELECT id_utilisateur FROM utilisateurs WHERE email = 'finance@gmail.com')
FROM postes p WHERE p.titre = 'Responsable Finance'
AND NOT EXISTS (SELECT 1 FROM budgets_recrutement WHERE id_poste = p.id_poste AND annee = 2026);

