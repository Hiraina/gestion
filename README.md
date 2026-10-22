# Gestion du recrutement

## Démarrer l’application en développement

> **Attention :** les deux premières commandes suppriment entièrement la base `carriere` et recréent une base vide. Toutes les données existantes seront perdues. À utiliser uniquement pour réinitialiser une base de développement, jamais sur une base contenant des données à conserver.

Depuis la racine du projet, exécutez :

```bash
docker exec postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS carriere WITH (FORCE);"
docker exec postgres psql -U postgres -d postgres -c "CREATE DATABASE carriere;"
mvn spring-boot:run
```
