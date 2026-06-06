# Publication V2 en parallele de la V1

## Strategie retenue

La V1 reste le site public stable sur `dedicalivres.fr`.

La V2 doit etre publiee dans un depot separe, par exemple :

```text
Dedicalivres/Dedicalivres-V2
```

URL cible recommandee :

```text
v2.dedicalivres.fr
```

ou :

```text
immersive.dedicalivres.fr
```

## Pourquoi un depot separe

- La V1 est un site statique HTML/CSS/JS.
- La V2 est une application Next.js.
- Les deux peuvent lire Supabase, mais elles n'ont pas le meme mode d'hebergement.
- Un depot separe evite toute regression sur la V1.

## Hebergement recommande

Vercel est le plus simple pour Next.js.

Etapes :

1. Creer le depot GitHub `Dedicalivres-V2`.
2. Pousser ce projet dans ce depot.
3. Importer le depot dans Vercel.
4. Ajouter les variables d'environnement :

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

5. Lancer le premier deploiement.
6. Tester l'URL Vercel temporaire.
7. Brancher `v2.dedicalivres.fr` ou `immersive.dedicalivres.fr`.

## Points de vigilance

- Ne jamais publier `.env.local`.
- Ne jamais utiliser de cle Supabase `service_role` dans la V2.
- Garder la V2 en lecture publique tant que les modules admin ne sont pas stabilises.
- Ne pas remplacer la V1 avant validation complete mobile + desktop.

## Commandes utiles

```bash
npm run build
```

```bash
npm run dev
```
