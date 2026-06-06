# État projet — Dédicalivres Immersive V2 D.5

## Base stable

D.5 est la base stable validée après D.4.

## Parcours principal

Accueil → Explorer → Carte → Ville → Événement → Fiche événement → Retour carte.

## Parcours secondaire

Navigation → Événements → Recherche / filtres → Fiche événement.

## Parcours acquisition

Navigation → Soumettre → Formulaire V2 → R2/Supabase → Modération future.

## Sécurité

- Front uniquement avec clé publishable/anon.
- Pas de service_role.
- Pas de secrets Cloudflare/R2.
- RLS nécessaire.
- Admin V1 intact.
- Admin V2 expérimental verrouillé.
- Espace utilisateur préparé mais non activé.
- Service payant seulement préparé conceptuellement.

## Décisions produit retenues

- Desktop prioritaire.
- Mobile plus tard.
- Carte = moteur principal.
- Fiche événement = destination principale.
- Bouton “Site officiel” = référence visuelle pour actions événement.
- Image événement = toujours visible en entier.
- Auteurs = visibles mais non cliquables tant que donnée non fiable.
- Codex pertinent pour Livre Vivant 3D, dans un dossier lab séparé.

## Nettoyage disque recommandé

Depuis `~/Downloads` :

```bash
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
find . -name ".next" -type d -prune -exec rm -rf '{}' +
npm cache clean --force
```

Garder uniquement :
- `dedicalivres-v2-current-stable-d5`
- éventuellement le ZIP `dedicalivres-v2-current-stable-d5.zip`
