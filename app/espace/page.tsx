import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Bell, Bookmark, CalendarCheck, Crown, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";

export const metadata: Metadata = {
  title: "Espace personnel",
  description: "Espace utilisateur Dédicalivres en préparation : favoris, alertes et suivi d’événements.",
  robots: { index: false, follow: true },
};

const futureBlocks = [
  {
    icon: Bookmark,
    title: "Favoris",
    description: "Préparer le suivi d’événements, villes, territoires et auteurs sans activer de compte public maintenant.",
    status: "Prévu",
  },
  {
    icon: Bell,
    title: "Alertes personnalisées",
    description: "Recevoir plus tard des alertes par pays, territoire, ville, type d’événement ou auteur suivi.",
    status: "Architecture",
  },
  {
    icon: CalendarCheck,
    title: "Événements suivis",
    description: "Créer une base pour retrouver les événements consultés ou enregistrés.",
    status: "Futur",
  },
  {
    icon: Crown,
    title: "Service premium",
    description: "Prévoir les rôles et limites d’accès avant toute fonctionnalité payante.",
    status: "Non activé",
  },
];

export default function SpacePage() {
  return (
    <main className="secure-page-shell">
      <div className="menu-page-ambient menu-page-ambient-one" />
      <div className="menu-page-ambient menu-page-ambient-two" />

      <section className="secure-page-card">
        <div className="menu-page-topbar">
          <Link href="/" className="event-back-link">
            <ArrowLeft size={17} />
            Retour accueil
          </Link>
          <span className="event-status-pill">Espace sécurisé</span>
        </div>

        <div className="secure-hero-grid">
          <div>
            <p className="kicker">Compte utilisateur futur</p>
            <h1>Mon espace</h1>
            <p>
              Cette zone prépare l’architecture d’un futur espace utilisateur ou organisateur,
              sans exposer de données privées et sans activer de paiement.
            </p>
          </div>

          <aside className="secure-status-card">
            <LockKeyhole size={26} />
            <strong>Accès volontairement fermé</strong>
            <span>
              Les fonctionnalités sensibles ne seront ouvertes qu’après validation complète :
              authentification, RLS, rôles, logs et parcours de sécurité.
            </span>
          </aside>
        </div>

        <div className="secure-feature-grid">
          {futureBlocks.map((block) => {
            const Icon = block.icon;

            return (
              <div className="secure-feature-card" key={block.title}>
                <div className="secure-feature-icon">
                  <Icon size={20} />
                </div>
                <span>{block.status}</span>
                <strong>{block.title}</strong>
                <p>{block.description}</p>
              </div>
            );
          })}
        </div>

        <section className="security-rules-panel">
          <div className="security-rules-header">
            <ShieldCheck size={20} />
            <div>
              <span className="event-module-label">Règles de sécurité</span>
              <h2>Préparer sans exposer</h2>
            </div>
          </div>

          <div className="security-rules-grid">
            <div>
              <strong>Frontend public</strong>
              <p>Uniquement les clés publishable/anon. Jamais de service_role ni secret Cloudflare.</p>
            </div>
            <div>
              <strong>RLS obligatoire</strong>
              <p>Les données privées doivent rester invisibles sans rôle explicite.</p>
            </div>
            <div>
              <strong>Rôles futurs</strong>
              <p>Public, utilisateur, organisateur, admin. Rien n’est activé avant validation.</p>
            </div>
            <div>
              <strong>Payant plus tard</strong>
              <p>Les abonnements devront passer par des fonctions serveur, pas par le client.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
