# Voyage djeunes

## 1. Reformulation du besoin

Voyage djeunes est une web app collaborative pour aider le groupe Les Djeuns à organiser ses vacances annuelles via un lien privé, sans compte utilisateur. La V1 doit surtout aider à décider: trouver les meilleures dates communes, choisir une destination, comparer les logements, préparer un itinéraire riche en points d'intérêt, puis exporter ces points vers Google My Maps ou Google Maps.

## 2. Décisions produit V1

- Accès par slug privé non prédictible, pas d'authentification.
- Participants sans compte, créés dans le voyage.
- Disponibilités par jour avec trois états: `available`, `maybe`, `unavailable`.
- Scoring dates: `available = 1`, `maybe = 0.5`, `unavailable = 0`, absence de réponse = 0.
- Recommandations: top 3 week-ends, top 3 semaines, alternatives longues.
- Votes destination et logement en score `1..5`, car c'est plus utile qu'un simple like pour arbitrer.
- Itinéraire structuré en segments et points illimités par catégorie.
- Export CSV compatible Google My Maps et liens Google Maps découpés en lots raisonnables.

## 3. Architecture technique

- Next.js App Router + TypeScript strict.
- Tailwind CSS pour l'UI.
- Neon Postgres via `@neondatabase/serverless`.
- Toutes les opérations DB restent côté serveur.
- Mutations via server actions.
- Export CSV via route handler.
- Connexion centralisée dans `lib/db.ts`.
- Logique métier isolée dans `lib/availability.ts`, `lib/itinerary.ts`, `lib/exports.ts`, `lib/scoring.ts`.

## 4. Schéma de données détaillé

Tables principales:

- `trips`: voyage, édition, description, slug privé, statut.
- `participants`: membres sans compte, préférences, conduite, styles.
- `availabilities`: disponibilité journalière par participant.
- `destinations`: propositions enrichies.
- `destination_votes`: score 1 à 5, un vote par participant et destination.
- `lodgings`: logements rattachables à une destination.
- `lodging_votes`: score 1 à 5, un vote par participant et logement.
- `itinerary_segments`: jours, transferts, zones ou étapes custom.
- `itinerary_points`: points illimités avec catégorie, segment, jour, coordonnées, tags, priorité et statut.

La cohérence des votes est renforcée par `trip_id` dans les tables de vote et des clés étrangères composites: un participant ne peut voter que sur un objet du même voyage.

## 5. SQL complet Neon SQL Editor

Le SQL complet est dans [`db/schema.sql`](./db/schema.sql).

Ordre recommandé:

1. Ouvrir le projet Neon `Voyage djeunes`.
2. Utiliser la branche cible, probablement `production`.
3. Utiliser la database cible, probablement `neondb`.
4. Coller et exécuter tout le contenu de `db/schema.sql`.
5. Vérifier le seed avec le slug `demo-les-djeuns-2026`.
6. Configurer `DATABASE_URL` localement.
7. Lancer `/db-test`.

## 6. Structure du projet Next.js

```txt
app/
  actions.ts
  db-test/page.tsx
  trips/new/page.tsx
  trips/[slug]/page.tsx
  trips/[slug]/availability/page.tsx
  trips/[slug]/destinations/page.tsx
  trips/[slug]/lodgings/page.tsx
  trips/[slug]/itinerary/page.tsx
  trips/[slug]/exports/page.tsx
  trips/[slug]/exports/csv/route.ts
components/
  app-header.tsx
  db-test-form.tsx
  empty-state.tsx
  score-pill.tsx
  trip-nav.tsx
db/
  schema.sql
lib/
  availability.ts
  dates.ts
  db.ts
  exports.ts
  itinerary.ts
  scoring.ts
  slugs.ts
  types.ts
  validation.ts
  queries/
    mutations.ts
    trips.ts
```

## 7. Plan d'implémentation étape par étape

1. Créer la base Next.js, TypeScript et Tailwind.
2. Ajouter le module Neon `lib/db.ts` et la validation serveur.
3. Écrire le schéma Postgres complet avec contraintes, index et seed.
4. Ajouter les fonctions métier de scoring, groupement, filtrage et export.
5. Isoler les requêtes SQL dans `lib/queries`.
6. Brancher les server actions.
7. Construire les pages du sitemap.
8. Ajouter la route CSV.
9. Documenter le setup local et le test de connexion.

## 8. Code du MVP

Le MVP est implémenté dans les fichiers du dépôt. Les fonctionnalités livrées:

- Création de voyage.
- Dashboard voyage.
- Ajout participants.
- Saisie disponibilités par plage.
- Calcul de scores et fenêtres recommandées.
- Ajout et vote destinations.
- Ajout et vote logements.
- Ajout segments d'itinéraire.
- Ajout massif de points d'intérêt, sans limite par catégorie.
- Filtres par segment, jour, catégorie et recherche.
- Export CSV My Maps.
- Génération de liens Google Maps.
- Server action de test de connexion Neon.

## 9. Instructions de setup

Créer `.env.local`:

```bash
DATABASE_URL="postgresql://USERNAME:PASSWORD@HOST/neondb?sslmode=require&channel_binding=require"
```

Installer et lancer:

```bash
npm install
npm run dev
```

Puis:

1. Exécuter `db/schema.sql` dans Neon SQL Editor.
2. Ouvrir `http://localhost:3000/db-test`.
3. Ouvrir `http://localhost:3000/trips/demo-les-djeuns-2026`.
4. Créer un nouveau voyage via `/trips/new` si besoin.

## 10. V1.5 / V2

À préparer ensuite:

- Édition et suppression des objets.
- Import CSV/Google Places pour ajouter beaucoup de points plus vite.
- Vue carte interactive avec clustering.
- Export KML complet.
- Découpage intelligent des longs trajets Google Maps par durée/distance.
- Commentaires simples sur destinations/logements/points.
- Album photo collaboratif.
- Souvenirs et timeline post-voyage.
- Option de passphrase par voyage si le lien privé ne suffit plus.
