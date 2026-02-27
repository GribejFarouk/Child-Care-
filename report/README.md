# Rapport PFE — ChildCare+

## Structure du rapport

```
report/
├── main.tex                          # Fichier principal (compile tout)
├── frontmatter/
│   ├── page_garde.tex                # Page de garde
│   ├── dedicace.tex                  # Dédicace
│   └── remerciements.tex             # Remerciements
├── chapters/
│   ├── introduction.tex              # Introduction générale
│   ├── chapter1.tex                  # Cadre général du projet
│   ├── chapter2.tex                  # Analyse et spécification des besoins
│   ├── chapter3.tex                  # Conception
│   ├── chapter4.tex                  # Réalisation
│   ├── conclusion.tex                # Conclusion générale et perspectives
│   └── webographie.tex               # Références bibliographiques
├── figures/                          # Captures d'écran et diagrammes
│   └── .gitkeep
├── README.md                         # Ce fichier
├── REPORT_UPDATE_WORKFLOW.md         # Règles de mise à jour du rapport
└── PROGRESS_LOG.md                   # Journal d'avancement
```

## Compilation

### Sur Overleaf (recommandé)

1. Créer un nouveau projet sur [Overleaf](https://www.overleaf.com/)
2. Téléverser l'intégralité du dossier `report/`
3. Définir `main.tex` comme document principal
4. Compiler avec **pdfLaTeX**

### En local

```bash
cd report
pdflatex main.tex
pdflatex main.tex   # Deux passes pour la table des matières
```

## Placeholders à remplacer

Avant la soumission finale, remplacer les placeholders suivants :

| Placeholder | Fichier(s) | Description |
|---|---|---|
| `[NOM_ETUDIANT]` | page_garde.tex | Nom complet de l'étudiant |
| `[NOM_ENCADRANT]` | page_garde.tex, remerciements.tex | Nom de l'encadrant |
| `[NOM_FACULTE]` | page_garde.tex, remerciements.tex | Nom de la faculté |
| `[VOTRE_DÉDICACE_PERSONNELLE]` | dedicace.tex | Texte de dédicace |
| `[VOTRE_TEXTE_DE_REMERCIEMENTS]` | remerciements.tex | Texte de remerciements |
| `[À COMPLÉTER]` | chapter4.tex | Spécifications matérielles |

## Captures d'écran

Placer les captures d'écran dans `report/figures/` avec les noms suivants :

- `screenshot_landing.png`
- `screenshot_login.png`
- `screenshot_dashboard.png`
- `screenshot_children.png`
- `screenshot_measurement.png`
- `screenshot_growth.png`
- `screenshot_alerts.png`
- `screenshot_pregnancy.png`
- `screenshot_ocr.png`

Puis décommenter les `\includegraphics` correspondants dans `chapter4.tex`.

## Diagrammes

Les diagrammes de séquence PlantUML sont dans `docs/diagrams/`. Copier les PNG dans `report/figures/` puis décommenter les `\includegraphics` dans `chapter3.tex`.

## Règles de mise à jour

Voir [REPORT_UPDATE_WORKFLOW.md](REPORT_UPDATE_WORKFLOW.md) pour les règles de mise à jour du rapport à chaque phase de développement.
