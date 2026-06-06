import Link from "next/link";
import { ArrowLeft, Database, FileWarning, LockKeyhole, ShieldCheck, UserCog } from "lucide-react";

const adminBlocks = [
  {
    icon: LockKeyhole,
    title: "Admin V1 intact",
    description: "L’administration actuelle validée reste la référence. Cette page ne remplace rien.",
  },
  {
    icon: UserCog,
    title: "Rôles à préparer",
    description: "Admin, organisateur, contributeur et utilisateur devront être séparés strictement.",
  },
  {
    icon: Database,
    title: "Actions sensibles",
    description: "Validation, suppression, statistiques et données privées devront passer par RLS/RPC sécurisées.",
  },
  {
    icon: FileWarning,
    title: "Non public",
    description: "Aucun module admin réel ne doit être exposé ici avant authentification et vérification serveur.",
  },
];

export default function AdminV2Page() {
  return (
    <main className="secure-page-shell">
      <div className="menu-page-ambient menu-page-ambient-one" />
      <div className="menu-page-ambient menu-page-ambient-two" />

      <section className="secure-page-card secure-admin-card">
        <div className="menu-page-topbar">
          <Link href="/" className="event-back-link">
            <ArrowLeft size={17} />
            Retour accueil
          </Link>
          <span className="event-status-pill">Admin V2 sécurisé</span>
        </div>

        <div className="secure-hero-grid">
          <div>
            <p className="kicker">Administration séparée</p>
            <h1>Admin V2</h1>
            <p>
              Cette page est un jalon d’architecture. Elle prépare la future administration V2,
              mais ne donne accès à aucune action sensible.
            </p>
          </div>

          <aside className="secure-status-card danger">
            <ShieldCheck size={26} />
            <strong>Accès sécurisé</strong>
            <span>
              Toute future action admin devra vérifier le rôle côté Supabase/RPC.
              Aucun secret ne doit transiter par le navigateur.
            </span>
          </aside>
        </div>

        <div className="secure-feature-grid">
          {adminBlocks.map((block) => {
            const Icon = block.icon;

            return (
              <div className="secure-feature-card" key={block.title}>
                <div className="secure-feature-icon">
                  <Icon size={20} />
                </div>
                <span>Architecture</span>
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
              <span className="event-module-label">À respecter</span>
              <h2>Admin V2 ne remplace pas Admin V1</h2>
            </div>
          </div>

          <div className="security-rules-grid">
            <div>
              <strong>Pas d’accès direct</strong>
              <p>Pas de dashboard réel sans authentification et contrôle de rôle.</p>
            </div>
            <div>
              <strong>Pas de secrets</strong>
              <p>Pas de service_role, pas de clés Cloudflare/R2, pas de token privé côté client.</p>
            </div>
            <div>
              <strong>RPC recommandées</strong>
              <p>Les actions sensibles doivent passer par des fonctions contrôlées.</p>
            </div>
            <div>
              <strong>Logs plus tard</strong>
              <p>Prévoir audit des validations, suppressions, exports et modifications.</p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
