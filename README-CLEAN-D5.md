# Dédicalivres Immersive V2 — D.5 clean

Version stable D.5 nettoyée.

Retiré volontairement :
- dossiers `backup-originals-*` ;
- `node_modules` ;
- `.next` ;
- `.turbo` ;
- `.env.local` ;
- fichiers système.

À faire après extraction :

```bash
npm install
npx next dev --webpack
```

Puis recréer `.env.local` à la racine :

```env
NEXT_PUBLIC_SUPABASE_URL=https://pwyetrqyiaxpzjrafpvb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TA_CLE_PUBLISHABLE
```
