# Journal d'Avancement — ChildCare+ PFE

> Mettre à jour ce fichier après chaque session de travail significative.
> Format : date, titre, liste des changements.

---

## 2025-01 — Initialisation du projet

- Création du dépôt GitHub `GribejFarouk/Child-Care-`
- Rédaction de `GEMINI.md` (fichier mémoire du projet)
- Définition de l'architecture microservices (7 services)
- Définition du stack technologique (React + Django + PostgreSQL)
- Validation du scope par l'encadrant

## 2025-01 — Phase 1 : MVP Frontend

### Sprint 1 : Structure et pages de base
- Initialisation du projet React + Vite + Tailwind CSS
- Création de la Landing Page avec design glassmorphism
- Création des pages d'authentification (Login, Signup, ForgotPassword)
- Mise en place du routage avec HashRouter (compatibilité GitHub Pages)
- Création du système de layout (Sidebar, TopBar, MainLayout)

### Sprint 2 : Pages fonctionnelles
- Dashboard avec statistiques animées (AnimatedMetric)
- ChildrenListPage, ChildDetailPage, ChildFormPage
- MeasurementFormPage avec toutes les variables demandées par l'encadrant
- PregnancyTrackerPage avec timeline hebdomadaire
- GrowthChartsPage avec courbes OMS (Recharts) et percentiles garçons/filles
- AlertsCenterPage avec filtrage par sévérité
- OcrImportPage avec zone de drag-and-drop
- SettingsPage

### Sprint 3 : Composants UI et polish
- Composants réutilisables : GlassCard, SectionHeader, StatPill, FAB, TrustBanner
- DisclaimerModal (avertissement médical au premier accès)
- ToastHost + toastBus (système de notifications toast)
- motionPresets.js (presets d'animation réutilisables)
- mockData.js avec 12 exports et noms tunisiens

### Sprint 4 : Qualité et déploiement
- Correction du bug AnimatedMetric (MotionValue rendering)
- Correction de l'encodage UTF-16 → UTF-8 de mockData.js
- Code splitting Vite (vendor/charts/motion) — 0 warnings au build
- Medical disclaimers sur Dashboard, GrowthCharts, AlertsCenter
- 5 diagrammes de séquence PlantUML + exports PNG
- Déploiement sur GitHub Pages : https://GribejFarouk.github.io/Child-Care-/

### Livrables Phase 1
- ✅ 14 pages fonctionnelles (4 publiques + 10 protégées)
- ✅ 8 composants UI réutilisables
- ✅ 12 jeux de données simulées
- ✅ 5 diagrammes de séquence UML
- ✅ 0 erreur, 0 avertissement au build
- ✅ Application déployée et accessible en ligne

## 2025 — Création du scaffold du rapport PFE

- Création de la structure LaTeX du rapport (15 fichiers)
- Rédaction de l'introduction générale
- Rédaction du Chapitre 1 : Cadre général (contexte, problématique, objectifs, étude de l'existant, méthodologie Scrum)
- Rédaction du Chapitre 2 : Analyse et spécification des besoins (27 BF, 7 BNF, 5 cas d'utilisation)
- Rédaction du Chapitre 3 : Conception (architecture microservices, modèle de données, 5 diagrammes de séquence)
- Rédaction du Chapitre 4 : Réalisation (environnement, stack technique, organisation du code, 10 interfaces documentées, état d'avancement)
- Rédaction de la conclusion générale et perspectives
- Rédaction de la webographie (15 références)
- Création du README, REPORT_UPDATE_WORKFLOW et PROGRESS_LOG

---

## Prochaines étapes prévues

- [ ] Phase 2 : Auth Service + Profile Service (Django + DRF + PostgreSQL + JWT)
- [ ] Phase 3 : Measurements Service + Analytics Service + moteur d'alertes
- [ ] Phase 4 : OCR Service (pytesseract ou Google Vision API)
- [ ] Phase 5 : Docker Compose + connexion frontend ↔ backend
- [ ] Phase 6 : Service IA (anomaly detection + suggestions)
- [ ] Phase 7 : Tests + finalisation + soutenance
