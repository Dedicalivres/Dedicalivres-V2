# V2 en parallèle de la V1 — runbook de build & déploiement

*27 juin 2026. À exécuter sur ta machine ou sur Vercel (réseau npm requis — impossible dans le sandbox Cowork).*

## Principe d'architecture

- **V1** reste seule sur `dedicalivres.fr` : elle écrit et alimente Supabase. Inchangée.
- **Supabase** = base unique partagée. La RLS déjà en place protège les deux fronts.
- **V2** = app Next.js déployée séparément sur `v2.dedicalivres.fr`, en lecture sur la même base.

Aucun conflit possible : toute l'écriture passe par l'admin V1, la V2 ne fait que lire les données validées.

## Ce qui a déjà été fait

Les dépendances du `package.json` ont été **figées** sur les versions exactes du `package-lock.json` (Next 16.2.6, React 19.2.6, Supabase JS 2.106.2, Tailwind 4.3.0, Three 0.184.0…). L'original est sauvegardé en `package.json.bak-latest`. L'install est désormais reproductible.

## Étape 1 — Build local (vérification)

```bash
cd Dedicalivres-V2-francophone-upgrade-2026-06-16-ready

# Install reproductible depuis le lock
npm ci

# Variables d'environnement (mêmes valeurs que la V1)
cp .env.example .env.local
# puis éditer .env.local :
#   NEXT_PUBLIC_SUPABASE_URL=https://pwyetrqyiaxpzjrafpvb.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_EfFj0D-4g3x0E3j0AofRRA_BHo98vvj

# Vérif TypeScript (doit passer)
npx tsc --noEmit

# Build de production
npm run build
npm start   # test local sur http://localhost:3000
```

### Si le build échoue sur SWC

C'est le blocage historique (binaire natif non téléchargé à cause du réseau). Sur une machine avec accès npm normal, `npm ci` le récupère automatiquement. Si besoin :

```bash
rm -rf node_modules package-lock.json
npm install
```

### Décision à trancher : bundler

Les scripts forcent `--webpack`, mais `next.config.ts` configure Turbopack — incohérence. Next 16 utilise Turbopack par défaut. Deux options, à tester :

- **Garder Webpack** : laisser les scripts tels quels, retirer le bloc `turbopack` de `next.config.ts`.
- **Passer à Turbopack** (recommandé Next 16) : retirer `--webpack` des scripts `dev` et `build`.

À valider au premier build réussi — ne pas changer sans pouvoir tester.

## Étape 2 — Déploiement Vercel

1. Créer un dépôt GitHub séparé `Dedicalivres-V2` et y pousser ce dossier.
2. Importer le dépôt dans Vercel (framework détecté : Next.js).
3. Variables d'environnement Vercel :
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://pwyetrqyiaxpzjrafpvb.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = clé publishable (jamais la service_role)
4. Premier déploiement → tester l'URL temporaire Vercel.
5. Brancher le sous-domaine `v2.dedicalivres.fr` (enregistrement CNAME vers Vercel).

## Étape 3 — Tests de recette

- Accueil → Explorer → Carte → Ville → Événement → Fiche → Retour carte.
- Filtres pays (FR, BE, LU, CH, MC).
- Portraits auteurs visibles.
- Vérifier que la V2 lit bien les **mêmes** événements validés que la V1.
- Confirmer qu'aucune action V2 n'écrit en base (lecture seule à ce stade).

## Garde-fous

- Ne jamais exposer `service_role` ni de secret Cloudflare/R2 côté V2.
- L'admin V1 reste la seule interface d'écriture/modération.
- L'`admin-v2` reste verrouillé (page informative uniquement).
- Toute future fonction V2 (favoris, alertes) = nouvelles tables additives, sans toucher la V1.
