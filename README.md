# Dedicalivres Immersive V2

Prototype Next.js de l'experience immersive Dedicalivres.

La V2 est concue pour vivre en parallele de la V1 publique afin de tester une interface plus visuelle sans interrompre le site existant.

## Objectif

- Accueil immersif.
- Recherche d'evenements connectee a Supabase.
- Agenda visuel.
- Carte interactive France / region / departement / ville.
- Galerie auteurs et contributeurs.
- Contact et livre d'or.

## Donnees

La V2 lit les donnees publiques Supabase existantes.

Elle ne doit pas modifier l'admin V1 ni casser les flux de validation deja en place.

Variables attendues :

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Developpement local

```bash
npm install
npm run dev
```

Puis ouvrir :

```text
http://localhost:3000
```

## Verification

```bash
npm run build
```

## Publication

Voir `DEPLOYMENT-V2.md`.
