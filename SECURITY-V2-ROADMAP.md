# Dédicalivres V2 — Roadmap sécurité

## Principe

La V2 peut évoluer vers un service plus avancé ou payant, mais aucune sécurité ne doit être sacrifiée.

## Règles non négociables

- Ne jamais exposer `service_role` dans le frontend.
- Ne jamais exposer de secrets Cloudflare/R2.
- Garder RLS activé sur toutes les tables sensibles.
- Les actions admin doivent rester réservées à `is_admin()`.
- Les soumissions publiques doivent rester en modération.
- Les données privées ne doivent jamais être lisibles publiquement.
- L’admin V1 validé ne doit pas être remplacé par l’admin V2 expérimental.

## Rôles futurs

### Public
- Lire les événements validés.
- Lire les contenus publics.
- Soumettre un événement en attente.
- Soumettre une image via endpoint contrôlé.

### Utilisateur
- Favoris.
- Alertes.
- Événements suivis.
- Préférences.

### Organisateur
- Soumettre/mettre à jour ses événements.
- Voir uniquement ses propres soumissions.
- Pas de validation publique directe.

### Admin
- Valider.
- Modifier.
- Supprimer.
- Modérer images.
- Consulter stats et logs.

## Tables futures possibles

- user_profiles
- user_favorites
- user_alerts
- organizer_profiles
- event_submissions
- admin_audit_logs
- subscription_status

## Service payant plus tard

À ne pas gérer côté front.

Prévoir :
- provider de paiement côté serveur ;
- webhook serveur ;
- table subscription_status ;
- RLS selon rôle et abonnement ;
- jamais de logique d’abonnement critique uniquement en React.

## R2

Upload public uniquement via endpoint contrôlé.

Prévoir plus tard :
- limite de taille ;
- types MIME autorisés ;
- renommage serveur ;
- scan/modération ;
- thumbnails ;
- suppression réservée admin.

## État D.4

D.4 prépare les écrans et la documentation.
D.4 n’active pas encore l’authentification complète.
