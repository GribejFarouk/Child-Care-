# Deploiement et securite

Ce document decrit les protections mises en oeuvre pour la demonstration de ChildCare+ et les precautions necessaires avant tout deploiement.

> [!WARNING]
> ChildCare+ est un prototype academique pret pour la demonstration. Il n'est pas certifie RGPD, HIPAA ou HDS et ne doit pas etre utilise tel quel avec des donnees medicales reelles.

## Architecture

- Chaque microservice dispose de sa propre base PostgreSQL.
- Les services Django ne publient pas de port applicatif vers la machine hote; l'API passe par Nginx.
- Les ports PostgreSQL conserves pour l'administration locale sont lies uniquement a `127.0.0.1`.
- Nginx bloque les appels externes aux routes internes `/api/*/internal/`.

## Authentification entre services

Les appels internes utilisent le header `X-Internal-Service-Token`.

- `INTERNAL_SERVICE_TOKEN` doit etre identique dans les services qui publient et consomment des appels internes.
- Il doit faire au moins 32 caracteres et etre genere aleatoirement, par exemple avec `openssl rand -hex 64`.
- Toute valeur manquante, trop courte, commencant par `change_me_` ou `replace_with_`, ou correspondant a un ancien secret de demonstration, est refusee au demarrage.
- Le fichier `.env.example` contient volontairement une valeur non executable; le vrai secret local ne doit pas etre committe ni copie dans le rapport.

## Journal d'activite

Le service `audit_service` enregistre les actions sensibles necessaires a la tracabilite:

- connexion reussie ou refusee;
- partage, modification des permissions et revocation;
- acces autorise d'un medecin au profil, aux mesures, au calendrier, aux alertes, recommandations, score de risque et dossiers OCR;
- creation, validation OCR et sessions de consultation.

Le journal affiche au parent une vue limitee: type d'action, resultat, enfant concerne, resume et horodatage. Il n'expose pas les identifiants techniques, les metadonnees internes, les tokens, les textes OCR bruts ou les liens de consultation.

La publication d'un evenement d'audit est non bloquante: une indisponibilite temporaire du journal ne doit pas interrompre un acte fonctionnel autorise. Elle doit toutefois etre surveillee dans les journaux techniques.

## Confidentialite fonctionnelle

- Les consultations reposent sur des liens de salle externes de type Jitsi; aucun serveur WebRTC personnalise n'est implemente.
- Les medecins peuvent consulter les informations OCR autorisees et validees, mais les fichiers medicaux originaux ne sont pas servis dans l'interface medecin.
- Un partage revoque retire immediatement l'acces du medecin; les consultations utilisent le statut `active` du partage.

## Assistant sante et interpretation clinique

- Les `ClinicalFinding` sont des interpretations deterministes fondees sur les references OMS et les mesures confirmees. Elles ne constituent pas un diagnostic.
- Gemini est une couche facultative d'explication en langage simple pour le parent; il ne determine jamais si une mesure est anormale.
- `ASSISTANT_AI_ENABLED=false` et `ASSISTANT_DEMO_DATA_ONLY=true` sont les valeurs par defaut. L'utilisation d'un fournisseur externe d'IA est reservee a la demonstration avec des donnees fictives.
- Aucun nom d'enfant, texte ou fichier OCR, message medical, lien de consultation, token ou journal d'audit ne doit etre transmis au fournisseur d'IA.
- Si Gemini est desactive ou indisponible, l'application produit une explication deterministe a partir des constats deja valides.
- Le parent peut supprimer une conversation d'assistance; cette suppression est journalisee sans enregistrer le contenu des messages.
- Pour les jeunes enfants, l'interpretation nutritionnelle requiert notamment le rapport poids-pour-taille et l'avis d'un professionnel lorsque cette reference n'est pas implementee.

## A faire avant production

- Activer HTTPS/TLS et n'exposer publiquement que les ports necessaires.
- Remplacer les secrets JWT, Django, PostgreSQL et inter-services par des secrets geres hors depot.
- Mettre `DJANGO_DEBUG=False`, configurer strictement `ALLOWED_HOSTS` et CORS.
- Definir des politiques de retention, sauvegarde, restauration et suppression des donnees.
- Realiser une analyse de securite et une evaluation reglementaire adaptee au pays et aux donnees traitees.
