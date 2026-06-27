# V2 francophone et extractions

La V1 et la V2 utilisent la même table Supabase `events`.

## Territoires

Le champ `country_code` accepte :

- `FR` : France
- `BE` : Belgique
- `LU` : Luxembourg
- `CH` : Suisse
- `MC` : Monaco

La colonne `region` conserve la subdivision locale : région, canton, province ou territoire.

## Extractions

La V2 ne contient aucun secret Cloudflare, R2 ou `service_role`.

Les extractions restent lancées depuis l’admin V1 authentifié :

`https://dedicalivres.fr/admin.html`

Le Worker lit les mêmes événements que la V2. Les filtres par catégorie, pays et période restent donc
compatibles sans duplication de données.

## Sécurité

- aucune modification des règles RLS ;
- aucune clé privée dans le navigateur ;
- aucune écriture directe dans R2 depuis l’admin V2 ;
- l’administration V1 reste la source de vérité jusqu’à migration explicite de l’authentification.
