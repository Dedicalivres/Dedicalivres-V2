# État projet — Dédicalivres Immersive V2 C.12

## Base validée

C.12 est la base stable issue de C.11.1.

## Décisions importantes

- Desktop prioritaire.
- Mobile plus tard.
- Carte validée comme moteur d’exploration.
- Fiche événement validée comme destination principale.
- Bouton “Site officiel” validé comme référence visuelle des boutons événement.
- Images événement : afficher l’image entière, ne pas forcer un crop.
- Auteurs : bloc visible mais liens neutralisés tant que la donnée n’est pas fiable.

## Parcours principal validé

Carte → ville → événement → fiche événement → retour carte.

## Points à surveiller

- `.env.local` doit exister à la racine.
- Sur Mac : utiliser `npx next dev --webpack`.
- Éviter l’accumulation de `node_modules` dans plusieurs packs.
- Garder un seul dossier de travail courant.

## Nettoyage disque recommandé

Depuis `~/Downloads` :

```bash
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
find . -name ".next" -type d -prune -exec rm -rf '{}' +
npm cache clean --force
```

Puis réinstaller uniquement dans le dossier courant.
