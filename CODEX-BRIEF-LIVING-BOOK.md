# Brief Codex — Livre Vivant Dédicalivres V2

## Contexte

Base à utiliser : D.5 stable.

Ne pas modifier :
- carte ;
- Supabase ;
- fiches événement ;
- page événements ;
- soumission ;
- admin V1/V2 ;
- routes existantes hors Hero/Livre.

## Objectif

Créer un prototype desktop-only du Livre Vivant premium dans le Hero.

## Direction artistique

- Noir Musée.
- Émeraude Prestige.
- Or discret.
- Objet précieux, silencieux, vivant.
- Pas de gadget cartoon.
- Inspiration : livre ouvert semi-3D, matière obsidienne, pages fines, liserés or, cœur émeraude lumineux.

## Technique recommandée

- React Three Fiber / Three.js / Drei si pertinent.
- Lazy load du composant 3D.
- Fallback CSS si WebGL indisponible.
- Framer Motion possible pour micro-interactions.
- Ne pas alourdir la carte.

## Interactions desktop

- Suivi léger du curseur.
- Respiration lumineuse.
- Ouverture subtile au scroll.
- Micro-reflets.
- Animation lente au repos.

## Livrables attendus

- Composant `LivingBook3D` ou `LivingBookPremium`.
- Fallback `LivingBookFallback`.
- Intégration dans Hero uniquement.
- Explication des fichiers modifiés.
- Commandes de test.
- Pas de secret.
- Pas de modification de la V1.
