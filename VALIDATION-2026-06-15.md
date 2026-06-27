# Validation du passage francophone

## Vérifications réalisées

- schéma Supabase vérifié en lecture ;
- `events.country_code` confirmé pour `FR`, `BE`, `LU`, `CH` et `MC` ;
- RLS conservée, aucune migration appliquée ;
- contrôle TypeScript : réussi avec `tsc --noEmit --ignoreDeprecations 6.0` ;
- absence de secret `service_role`, R2 ou Worker dans le code V2 ;
- archive vérifiée sans `.env.local`, `node_modules`, `.next` ni sauvegarde locale ;
- V2 stable d’origine laissée intacte.

## Limite de vérification

La compilation Next complète n’a pas pu télécharger le binaire SWC manquant dans l’ancienne installation
locale. Le contrôle TypeScript est propre, mais un `npm install` puis `npm run build` devra être relancé
dans un environnement disposant du composant Next.js complet avant mise en production.

Le script `npm run lint` fourni par cette version utilise encore `next lint`, commande retirée des versions
récentes de Next.js. Ce point existait avant l’adaptation et n’a pas été modifié.
