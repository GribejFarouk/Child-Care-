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

## 2025-05 — Phase 1 : Realignment après feedback professeur

### Changement de scope majeur
- **Suppression du suivi de grossesse** — Le professeur a demandé le retrait car il relève de la santé maternelle, pas infantile
- Le scope est désormais : naissance → adolescence

### Sprint 5 : Realignment frontend
- Suppression de PregnancyTrackerPage.jsx et de `pregnancyData` de mockData.js
- Suppression de la route et du lien sidebar grossesse
- **Login/Signup avec sélection de rôle** (Parent / Médecin) — redirection vers le tableau de bord correspondant
- Champ « Spécialité » conditionnel pour les médecins à l'inscription
- **HealthCalendarPage** — vue unifiée rendez-vous + vaccinations, filtres par enfant/type, badges de statut
- **DoctorCollaborationPage** — médecins liés, codes d'accès, permissions sélectives avec toggles, chat, toast voice/video
- **DoctorLayout** — layout dédié médecin avec accent teal, badge MÉDECIN, 3 items sidebar
- **4 pages médecin** : DoctorDashboard, DoctorPatients, DoctorPatientDetail, DoctorMessages
- DoctorPatientDetail affiche « Données masquées par le parent » pour les sections non autorisées
- **MeasurementFormPage** enrichi : champs pied, oreille, cou, poignet + IMC auto-calculé + sélection source
- **Module IA préliminaire** : cartes de suggestions sur Dashboard et ChildDetailPage avec badge et disclaimer
- Fix crash SettingsPage (currentUser.name → firstName/lastName)
- Fix crash AlertsCenterPage (alert.title + date parsing)
- mockData.js enrichi : ~16 exports (doctors, sharingPermissions, consultationMessages, doctorPatients, currentDoctor, etc.)

### Sprint 6 : Diagrammes UML
- Mise à jour de `usecase_global.puml` : acteur Médecin, 6 nouveaux UC, suppression grossesse
- Mise à jour de `architecture_globale.puml` : ajout SharingMS, CommMS, suppression PregMS
- Mise à jour de `classe_globale.puml` : 6 nouvelles classes, suppression Grossesse
- Régénération de 3 PNGs via PlantUML online server
- Copie de tous les PNGs dans `report/figures/`

### Sprint 7 : Rapport LaTeX
- Introduction : suppression grossesse, ajout collaboration/calendrier/IA
- Chapitre 1 : mise à jour contexte, problématique, objectifs, solution, comparaison
- Chapitre 2 : rewrite complet — 3 acteurs, 36 BF en 10 modules, 8 BNF, 6 CU avec médecin
- Chapitre 3 : rewrite complet — 7 microservices mis à jour, 9 entités, diagrammes intégrés
- Chapitre 4 : 19 pages documentées, arborescence mise à jour, 16 exports mock data
- Conclusion : livrables, perspectives mises à jour

### Livrables Phase 1 (final)
- ✅ 19 pages fonctionnelles (4 publiques + 11 parent + 4 médecin)
- ✅ 2 layouts (parent et médecin)
- ✅ 8 composants UI réutilisables
- ✅ ~16 jeux de données simulées
- ✅ 8 diagrammes UML (3 structurels + 5 séquence) avec PNGs
- ✅ 0 erreur, 0 avertissement au build
- ✅ Rapport LaTeX complet et cohérent
- ✅ Application déployée et accessible en ligne

---

## 2026-05 — Phase 2 : Backend Foundation

### Sprint 1 : Auth Service & Profile Service
- Création du projet Django `auth_service` avec modèle `CustomUser` (email, rôles)
- Création du projet Django `profile_service` avec modèles `ParentProfile`, `DoctorProfile`, `Child`
- Configuration PostgreSQL prête pour la production avec fallback SQLite pour le développement local
- Implémentation de `SharedJWTAuthentication` : validation JWT stateless sans appel inter-services

### Sprint 2 : Intégration Frontend API
- Configuration de `VITE_API_BASE_URL` avec fallback mock data (`hasApi`) pour préserver la démo GitHub Pages
- Création du client Axios avec intercepteur JWT et rafraîchissement automatique de jeton (refresh token)
- Mise à jour de `AuthContext`, `LoginPage` et `SignupPage` pour utiliser les API d'authentification réelles

### Sprint 3 : Dockerisation et Tests
- Création du fichier `docker-compose.yml` (5 services : auth, profiles, 2x db postgres, nginx gateway)
- Configuration du reverse proxy Nginx (`/api/auth/` et `/api/profiles/`)
- Création de 24 tests unitaires/intégration backend (11 Auth, 13 Profiles) avec 100% de succès
- Vérification que le build frontend réussit toujours (0 avertissement)
- `walkthrough.md` créé pour tracer l'implémentation de la phase 2

### Sprint 4 : Nettoyage et Finalisation de la Phase 2
- Connexion des pages (ChildrenList, ChildForm, ChildDetail, Settings) à l'API via `children.js` et `profiles.js`
- Mise en place de `ProtectedRoute` (protection des routes Parent/Médecin si API activée)
- Fix de l'inscription médecin (sauvegarde de la spécialité dans Profile Service)
- Nettoyage des références historiques à la grossesse dans la documentation et les sources
- Mise à jour de `.gitignore` pour le backend Python

---

## 2026-05 — Phase 3 : Measurements & Analytics

### Sprint 1 : Measurements Service
- Création du projet Django `measurements_service` avec configuration PostgreSQL/SQLite.
- Implémentation du modèle `Measurement` avec calcul automatique de l'IMC (`save()`).
- Application de `SharedJWTAuthentication` et permissions strictes (seuls les parents peuvent accéder à la V1, médecins bloqués pour le moment).
- API de CRUD sur les mesures avec vérification d'appartenance `parent_id` (via JWT).
- Rédaction de 10 tests unitaires et d'intégration validant le comportement du service.

### Sprint 2 : Analytics Service & Alert Engine
- Création du projet Django `analytics_service`.
- Moteur de règles préliminaire transparent (`rules.py`) pour la détection d'anomalies de croissance et IMC (non-OMS pour l'instant).
- Modèle `Alert` avec mécanisme de prévention des doublons (`UniqueConstraint` sur `measurement_id` + `alert_type`).
- API `/analyze/` appelée par le frontend après la création d'une mesure.
- Tests couvrant le moteur de règles, la création d'alertes et le filtrage.

### Sprint 3 : Intégration Frontend & Infrastructure
- Nouveaux modules API frontend : `measurements.js` et `analytics.js` avec pattern de fallback mock.
- Refonte de `MeasurementFormPage` pour appeler séquentiellement l'API de création puis l'API d'analyse.
- Connexion de `ChildDetailPage` à l'historique des mesures réel.
- Connexion de `AlertsCenterPage` au backend Analytics.
- Mise à jour de `docker-compose.yml` et `nginx.conf` pour inclure les nouveaux services sur les ports 8003/8004.

---

## 2026-05 — Phase 3.5 : Docker + PostgreSQL Stabilisation

### Sprint 1 : Audit et corrections
- Audit complet des 4 Dockerfiles, entrypoints, requirements, settings, et migrations.
- Correction des origines CORS : `http://localhost:80` → `http://localhost` dans les 4 services (le navigateur les traite comme des origines différentes).
- Correction de `.env.example` : les `DB_HOST` pointent maintenant vers les noms de service Docker (`auth_db`, `profile_db`, etc.).
- Création du fichier `.env` réel pour Docker Compose avec des valeurs de développement.
- Création de `frontend/.env.development` avec `VITE_API_BASE_URL=http://localhost`.
- Mise à jour de `.gitignore` pour inclure `.env.example` et `frontend/.env.development`.

### Résultat de l'audit statique
- ✅ 4 Dockerfiles identiques et corrects (python:3.12-slim)
- ✅ 4 entrypoints identiques (migrate + gunicorn)
- ✅ 4 requirements.txt incluent `psycopg2-binary` et `gunicorn`
- ✅ 4 settings.py supportent PostgreSQL (Docker) ou SQLite (local)
- ✅ 4 migrations initiales committées
- ✅ docker-compose.yml : 9 services avec health checks sur PostgreSQL
- ✅ nginx.conf : 4 blocs upstream/location correctement routés
- ✅ JWT_SIGNING_KEY partagé dans le `.env` injecté dans les 4 services
- ✅ DJANGO_ALLOWED_HOSTS inclut les noms de service Docker
- ✅ CORS autorise `http://localhost:5173` (Vite) et `http://localhost` (Nginx)

---

## 2026-05 — Phase 4 : OCR Service & Frontend Integration

### Sprint 1 : OCR Service Backend
- Création du projet Django `ocr_service` (Tesseract OCR, PyTesseract, Pillow, pdf2image).
- Modèle `OCRImport` pour la traçabilité des imports (ne sauvegarde pas de mesures automatiquement).
- Parseur regex robuste (`parser.py`) pour extraire: poids, taille, périmètre crânien, et date. Supporte les formats et mots-clés français/anglais.
- Permissions `IsParent` (bloque les médecins) et `SharedJWTAuthentication`.
- 10+ tests unitaires avec Tesseract mocké pour la stabilité CI/CD.

### Sprint 2 : Infrastructure & Frontend
- Ajout de `ocr_db` (PostgreSQL 16) et `ocr_service` dans `docker-compose.yml`.
- Configuration de `client_max_body_size 10m` dans Nginx pour permettre l'upload d'images et de PDF.
- Intégration frontend de `api/ocr.js` (FormData natif, pas de Content-Type manuel).
- Refonte de `OcrImportPage` pour appeler le backend de manière asynchrone, présenter les champs extraits pour validation manuelle par le parent, et lier la soumission au pipeline de `Measurements` et `Analytics`.

---

---

## 2026-05 — Phase 4.5 / 4.6 : Stabilisation demo et registre medical

- Suppression des dependances actives a `mockData.js` dans les pages principales.
- Synchronisation du dashboard, des enfants, des mesures, des alertes et des courbes avec les API backend.
- Correction du bug OCR lie au `Content-Type` global Axios.
- Ajout du `calendar_service` Django avec modele `HealthEvent`.
- Mise en place du registre medical : vaccinations, rendez-vous, controles et autres evenements.
- Ajout du routage Nginx `/api/calendar/` et d'une base PostgreSQL dediee.
- Stabilisation Docker Desktop : PostgreSQL par service, Gunicorn limite, Nginx avec resolution DNS Docker dynamique.

---

## 2026-05 — Phase 5 : Collaboration parent-medecin

- Creation du `collaboration_service` Django.
- Ajout du modele `ChildShare` : enfant partage, medecin, code de partage, statut et permissions JSON.
- Ajout du modele `Message` pour la messagerie parent-medecin.
- Endpoint d'acceptation de code par le medecin.
- Endpoint interne `access-check` utilise par les autres services pour verifier les permissions.
- Page parent `Medecins` : creation de partage, modification des permissions, revocation et messagerie.
- Page medecin `Mes Patients` : acceptation du code, liste des patients partages et dossier patient.
- Dossier patient medecin avec onglets controles par permissions : profil, mesures, alertes, calendrier et OCR.
- Correction de l'affichage du vrai nom, age et sexe de l'enfant cote medecin.
- Correction des acces refuses lies au `Host` interne de Docker.
- Ouverture controlee de l'OCR aux medecins avec permission `ocr`.

---

## 2026-05 — Mise a jour du rapport avant reunion encadrant

- Suppression des references fonctionnelles au suivi de grossesse.
- Mise a jour des objectifs selon le scope valide : sante de l'enfant de la naissance a l'adolescence.
- Mise a jour des besoins fonctionnels : parent, medecin, partage, messagerie, calendrier, OCR.
- Mise a jour de la conception : 7 microservices Django, PostgreSQL, Docker Compose, Nginx.
- Mise a jour de la realisation : backend implemente, frontend connecte aux API, plus de mock data actif.
- Mise a jour initiale du texte du rapport avant redesign des diagrammes.

---

## 2026-05 -- Redesign des diagrammes UML

- Redesign simplifie du diagramme de cas d'utilisation global.
- Redesign simplifie de l'architecture globale : React, Nginx, 7 services Django et PostgreSQL par service.
- Redesign simplifie du diagramme de classes : User, Child, Measurement, Alert, OCRImport, HealthEvent, ChildShare et Message.
- Refonte des 5 diagrammes de sequence : authentification, ajout de mesure, OCR, courbes et alertes.
- Regeneration des PNG dans `docs/diagrams/` et `report/figures/`.
- Suppression des anciennes references a la grossesse, OMS clinique, Redis et Notification Service dans les diagrammes.

---

## Prochaines étapes prévues

- [x] Phase 2 : Auth Service + Profile Service (Django + DRF + PostgreSQL + JWT)
- [x] Phase 3 : Measurements Service + Analytics Service + Alert Engine
- [x] Phase 3.5 : Docker + PostgreSQL Integration Stabilization
- [x] Phase 4 : OCR Service
- [x] Phase 4.6 : Calendar Service + stabilisation demo
- [x] Phase 5 : Collaboration parent-medecin + messagerie + permissions
- [x] Phase 6 : Redesign des diagrammes
- [ ] Phase 6 : rapport final + soutenance
