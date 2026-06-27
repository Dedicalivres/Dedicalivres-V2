import Link from "next/link";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";

export default function Page() {
  return (
    <main className="menu-page-shell">
      <div className="menu-page-ambient menu-page-ambient-one" />
      <div className="menu-page-ambient menu-page-ambient-two" />
      <section className="menu-page-card">
        <div className="menu-page-topbar">
          <Link href="/" className="event-back-link"><ArrowLeft size={17} />Retour accueil</Link>
          <span className="event-status-pill">Préparation éditoriale</span>
        </div>
        <div className="menu-page-hero">
          <p className="kicker">Grands rendez-vous</p>
          <h1>Salons & Festivals</h1>
          <p>Une entrée éditoriale dédiée aux salons, festivals et grands rendez-vous littéraires.</p>
        </div>
        <div className="menu-feature-grid">
          <div className="menu-feature-card">
            <span>01</span>
            <strong>Sélection éditoriale</strong>
            <p>Mettre en avant les rendez-vous majeurs.</p>
          </div>
          <div className="menu-feature-card">
            <span>02</span>
            <strong>Événements récurrents</strong>
            <p>Préparer une logique de calendrier annuel.</p>
          </div>
          <div className="menu-feature-card">
            <span>03</span>
            <strong>Territoires actifs</strong>
            <p>Relier les grands rendez-vous aux pays, régions, cantons et provinces.</p>
          </div>
          <div className="menu-feature-card">
            <span>04</span>
            <strong>Pages SEO dédiées</strong>
            <p>Préparer la visibilité future des salons et festivals.</p>
          </div>
        </div>
        <div className="menu-page-security-note">
          <ShieldCheck size={18} />
          <span>Architecture pensée pour Supabase RLS, R2, rôles et future monétisation sans exposer de secrets côté frontend.</span>
        </div>
        <div className="menu-page-actions">
          <Link href="/#carte" className="event-main-action">Explorer la carte <Sparkles size={16} /></Link>
          <Link href="/evenements" className="event-secondary-action">Voir les événements</Link>
        </div>
      </section>
    </main>
  );
}
