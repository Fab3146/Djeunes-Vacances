# Argentine à 9

Outil collaboratif pour préparer un voyage en Argentine en février 2027 : 50 destinations, 155 photos créditées, 12 circuits documentés, neuf profils, synthèse des envies, grande carte et carnet imprimable.

## Application en ligne

Next.js 16, Neon Postgres et Vercel. Un lien privé commun ouvre le voyage ; chacun sélectionne son prénom. Toute personne qui possède ce lien peut modifier les profils et la préparation commune. Aucun compte voyageur.

Les routes serveur `/api/voyages/[slug]` lisent les réponses et enregistrent chaque vote ou préférence séparément. Les versions empêchent les écrasements silencieux. La synthèse se recharge toutes les dix secondes lorsque la page est visible. Une panne réseau conserve les modifications en attente sur l’appareil ; un conflit demande de choisir entre la saisie locale et la réponse en ligne.

Le lien contient 192 bits aléatoires ; seul son SHA-256 est enregistré en base. Les réponses ne sont jamais incluses dans les fichiers statiques. Les API et pages du voyage ne sont pas mises en cache. `DATABASE_URL` reste côté serveur.

## Développement et vérification

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
```

Configurer `DATABASE_URL` dans `.env.local` et dans Vercel, sans exposer cette valeur au navigateur. `/apercu` est un aperçu avec profils fictifs et stockage local, disponible uniquement en développement et dans les déploiements Vercel Preview. Il renvoie 404 en production.

## Installation des données

Exécuter `db/argentine.sql` avec le propriétaire de la base dans la console Neon, ou `npm run db:migrate` avec une connexion d’administration. Migration additive : les anciennes tables sont conservées. Le script accorde uniquement les droits sur les nouvelles tables et fonctions au rôle `authenticator` utilisé par la connexion existante. Les fonctions utilisent les droits de l’appelant.

Importer une sauvegarde privée une seule fois :

```sh
npm run db:seed -- /chemin/prive/sauvegarde.json argentine-2027
```

Le script n’écrase jamais un voyage déjà importé. Il écrit le lien dans `.private/argentine-2027.json`, exclu de Git. Ne jamais publier ce fichier, la sauvegarde personnelle ni les variables d’environnement. L’import n’est jamais exécuté pendant le build ou au démarrage du site.

## Sources et HTML autonome

Les données éditoriales sont dans `data/argentine/base.json` et `enrichment.json`. Le code de l’interface et du moteur est dans `src/argentine/`. Les photographies sont sous `public/photos/`, avec crédits et licences dans les manifestes. `npm run build:catalog` génère le catalogue, les scripts publics et `argentine-2027.html` depuis ces mêmes sources.

Le HTML autonome reste utilisable hors connexion, avec export/import JSON version 1. Ses réponses sont locales ; celles du site en ligne sont partagées. Un export en ligne peut être importé dans le HTML et réciproquement. En ligne, une restauration JSON remplace la préparation commune après aperçu et confirmation, avec contrôle de version.

Les circuits sont composés pour le groupe à partir de sources touristiques officielles et de trajets OSRM documentés. Aucun service d’IA, de réservation ou de calcul routier payant. Les nouvelles destinations ne sont pas automatiquement ajoutées aux circuits préparés.

## Publication

Le dépôt conserve la version précédente dans son historique. Vercel construit la branche de travail en Preview ; la production provient de `main`. Vérifier la migration, la reprise de la sauvegarde et les écritures concurrentes sur Neon avant de fusionner. Conserver la protection Vercel des prévisualisations ; la production doit être accessible sans compte Vercel pour les voyageurs.
