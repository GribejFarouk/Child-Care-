# Workflow de Mise à Jour du Rapport

## Règle fondamentale

> **Le rapport est un document vivant.** Chaque phase de développement DOIT être accompagnée d'une mise à jour du rapport **le jour même** de la complétion du travail.

## Quand mettre à jour

| Événement | Action sur le rapport |
|---|---|
| Nouvelle fonctionnalité développée | Mettre à jour le Chapitre 4 (section interfaces + section avancement) |
| Nouveau service backend créé | Ajouter une sous-section dans le Chapitre 4 |
| Nouveau diagramme UML | Ajouter dans le Chapitre 3, copier le PNG dans `figures/` |
| Décision d'architecture | Mettre à jour le Chapitre 3 (section architecture) |
| Phase complétée | Mettre à jour le tableau d'avancement (Chapitre 4) + PROGRESS_LOG.md |
| Bug critique résolu | Documenter dans PROGRESS_LOG.md |

## Comment mettre à jour

### Chapitre 4 — Réalisation (le plus fréquemment mis à jour)

1. **Section "Interfaces réalisées"** : ajouter une sous-section pour chaque nouvelle page/fonctionnalité
   - Description fonctionnelle (2-3 paragraphes)
   - Capture d'écran (placeholder puis image réelle)
   - Notes sur l'état (simulé vs connecté au backend)

2. **Section "État d'avancement"** : mettre à jour le tableau avec le nouvel état
   - Utiliser uniquement : **Réalisé**, **En cours**, **Non démarré**
   - Ne jamais écrire **Réalisé** pour quelque chose qui n'est pas terminé

3. **Section "Bilan quantitatif"** : mettre à jour les chiffres

### Chapitre 3 — Conception

- Ajouter les nouveaux diagrammes (classes, séquence, déploiement)
- Mettre à jour l'architecture si un service est ajouté ou modifié

### PROGRESS_LOG.md

- Ajouter une entrée datée pour chaque session de travail significative
- Format : `## [DATE] — [Titre court]` suivi de la liste des changements

## Règles strictes

1. **Distinguer réalisé / en cours / prévu** : ne jamais mélanger les états
2. **Pas de contenu fictif** : documenter uniquement ce qui existe dans le code
3. **Captures d'écran à jour** : remplacer les placeholders dès que l'interface est stable
4. **Cohérence des versions** : les numéros de version dans le rapport doivent correspondre au `package.json`
5. **Mise à jour le jour même** : ne pas accumuler de retard de documentation

## Checklist avant soumission

- [ ] Tous les placeholders `[...]` ont été remplacés
- [ ] Toutes les `\includegraphics` ont été décommentées avec les vrais fichiers
- [ ] Le tableau d'avancement reflète l'état réel du projet
- [ ] La webographie est complète et tous les liens fonctionnent
- [ ] Le document compile sans erreur sur Overleaf
- [ ] La pagination est correcte (table des matières, listes de figures/tableaux)
- [ ] Les noms (étudiant, encadrant, faculté) sont corrects sur la page de garde
