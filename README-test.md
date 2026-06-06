# Dédicalivres Immersive V2 — Base stable D.5

Base validée : D.4.

D.5 ne rajoute pas de fonctionnalité. C’est une base propre et stabilisée après les blocs D.1 à D.4.

## Fonctionnalités validées

### Socle C
- Carte réelle GeoJSON.
- Événements Supabase branchés.
- Parcours : France → région → département → ville → événement.
- Fiche événement V2.
- Boutons événement premium.
- Image événement adaptative, sans recadrage forcé.
- Modules utiles : lieu, organisation, accès, auteurs/intervenants si disponibles.
- Bloc auteurs visible mais liens neutralisés.
- Suggestions “Autres rencontres à proximité”.
- Retour fiche → carte avec contexte.
- Priorité desktop. Mobile plus tard.

### Blocs D
- Navigation principale V2.
- Menus publics :
  - Accueil
  - Explorer
  - Événements
  - Salons & Festivals
  - Soumettre
  - Espace
  - Admin V2 expérimental
- Page `/evenements` premium avec lecture Supabase.
- Recherche texte et filtres type/région/ville.
- Page `/soumettre` avec formulaire public V2.
- Upload image R2 préparé.
- Insertion Supabase préparée en modération.
- Page `/espace` préparée mais non activée.
- Page `/admin-v2` verrouillée / expérimentale.
- Documentation sécurité V2.

## Installation

Après extraction :

```bash
npm install
```

Sur Mac :

```bash
npx next dev --webpack
```

Puis ouvrir :

```text
http://localhost:3000
```

## Fichier `.env.local`

Le fichier `.env.local` n’est volontairement pas inclus dans le ZIP.

Il doit être placé à la racine du projet, au même niveau que `package.json` :

```text
dedicalivres-v2-current-stable-d5/
├── .env.local
├── package.json
├── app/
├── components/
├── public/
```

Contenu attendu :

```env
NEXT_PUBLIC_SUPABASE_URL=https://pwyetrqyiaxpzjrafpvb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TA_CLE_PUBLISHABLE
```

Ne jamais mettre de clé `service_role`.

## Commande rapide pour créer `.env.local`

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://pwyetrqyiaxpzjrafpvb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TA_CLE_PUBLISHABLE
EOF
```

## Test complet desktop

1. Ouvrir `http://localhost:3000`.
2. Tester la navigation principale.
3. Aller à la carte.
4. Tester région → département → ville → événement.
5. Ouvrir une fiche événement.
6. Cliquer “Retour à la carte”.
7. Aller sur `/evenements`.
8. Tester recherche et filtres.
9. Cliquer une vitrine événement.
10. Aller sur `/soumettre`.
11. Tester une soumission simple.
12. Aller sur `/espace`.
13. Aller sur `/admin-v2`.
14. Vérifier qu’aucune page admin réelle n’est exposée.

## Règles pour la suite

- Utiliser cette base comme nouveau dossier courant.
- Ne pas repartir d’anciens packs.
- Ne pas modifier carte + fiches + soumission dans un même sprint sauf nécessité.
- Ne pas toucher à la V1.
- Ne pas remplacer l’admin V1.
- Ne pas exposer de secret.
- Garder mobile pour une phase dédiée.
- Garder Codex pour les blocs lourds, notamment Livre Vivant 3D.

## Prochains blocs possibles

### E.1 — Livre Vivant / Codex Lab
Créer une branche ou dossier expérimental pour le livre animé premium desktop.

### D.6 — Salons & Festivals premium
Transformer `/salons-festivals` en vraie page filtrée.

### D.7 — Filtres carte/événements avancés
Harmoniser les filtres entre carte et page événements.

### D.8 — Préparation SEO V2
Métadonnées événement, ville, région, salons.

### Mobile
Plus tard, après aboutissement desktop.
