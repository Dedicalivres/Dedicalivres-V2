import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CalendarDays, MapPin, ArrowLeft } from "lucide-react";
import {
  FRANCOPHONE_COUNTRIES,
  FRANCOPHONE_TERRITORIES,
  countryLabel,
  countryName,
  countryFlag,
  countryTerritories,
  eventCountryCode,
  normalizeCountryCode,
} from "@/lib/francophone";

// Régénère la page au plus une fois par heure.
export const revalidate = 3600;

type PageProps = {
  params: Promise<{ code: string }>;
};

// Génère les routes statiques pour les 5 pays au build.
export function generateStaticParams() {
  return FRANCOPHONE_COUNTRIES.map((c) => ({ code: c.code.toLowerCase() }));
}

function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

function pick(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const v = row[key];
    if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
  }
  return fallback;
}

function formatDate(date: string) {
  if (!date) return "Date à confirmer";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(parsed);
}

function isEventEnded(row: Record<string, unknown>) {
  const raw = pick(row, ["end_date", "date_end", "ends_at"]) || pick(row, ["start_date", "date", "event_date", "starts_at"]);
  if (!raw) return false;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  parsed.setHours(23, 59, 59, 999);
  return parsed < today;
}

function eventType(row: Record<string, unknown>) {
  const raw = pick(row, ["type", "category", "source_label", "event_type"], "Événement").toLowerCase();
  if (raw.includes("festival")) return "Festival";
  if (raw.includes("salon")) return "Salon";
  if (raw.includes("dedic") || raw.includes("dédic")) return "Dédicace";
  if (raw.includes("rencontre")) return "Rencontre";
  if (raw.includes("conf") || raw.includes("lecture")) return "Conférence";
  if (raw.includes("atelier") || raw.includes("animation")) return "Animation";
  return "Événement";
}

function eventRoute(row: Record<string, unknown>) {
  const id = pick(row, ["id", "event_id", "uuid"]);
  return id ? `/evenements/${encodeURIComponent(id)}` : "/evenements";
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code } = await params;
  const countryCode = normalizeCountryCode(code.toUpperCase());
  const country = FRANCOPHONE_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return { title: "Pays introuvable", robots: { index: false, follow: true } };

  const name = countryName(countryCode);
  const flag = countryFlag(countryCode);
  const title = `${flag} Événements littéraires en ${name}`;
  const description = `Salons du livre, festivals, dédicaces et rencontres littéraires en ${name}. Agenda francophone Dédicalivres : toutes les dates, lieux et auteurs présents.`;
  const canonical = `/pays/${countryCode.toLowerCase()}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CountryPage({ params }: PageProps) {
  const { code } = await params;
  const countryCode = normalizeCountryCode(code.toUpperCase());
  const country = FRANCOPHONE_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) notFound();

  const supabase = createSupabaseServerClient();
  let events: Record<string, unknown>[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("validated", true)
      .eq("rejected", false)
      .eq("country_code", countryCode)
      .limit(200);
    events = (data || []) as Record<string, unknown>[];
  }

  // Trier : à venir d'abord, puis par date croissante.
  events.sort((a, b) => {
    const endedA = isEventEnded(a);
    const endedB = isEventEnded(b);
    if (endedA !== endedB) return endedA ? 1 : -1;
    const ta = new Date(pick(a, ["start_date", "date", "event_date", "starts_at"])).getTime();
    const tb = new Date(pick(b, ["start_date", "date", "event_date", "starts_at"])).getTime();
    return (Number.isNaN(ta) ? Infinity : ta) - (Number.isNaN(tb) ? Infinity : tb);
  });

  const territories = countryTerritories(countryCode);
  const name = countryName(countryCode);
  const flag = countryFlag(countryCode);

  // Stats
  const upcoming = events.filter((e) => !isEventEnded(e)).length;
  const territoryNames = new Set(events.map((e) => pick(e, ["region", "region_name"])).filter(Boolean));
  const cities = new Set(events.map((e) => pick(e, ["city", "ville", "location", "lieu"])).filter(Boolean));

  // Grouper par territoire pour l'affichage
  const byTerritory = new Map<string, Record<string, unknown>[]>();
  for (const territory of territories) {
    const evts = events.filter((e) => {
      const r = pick(e, ["region", "region_name"]).toLowerCase();
      return r === territory.name.toLowerCase() || (territory.aliases || []).some((a) => r === a.toLowerCase());
    });
    if (evts.length > 0) byTerritory.set(territory.name, evts);
  }
  // Événements sans territoire identifié
  const unclassified = events.filter((e) => {
    const r = pick(e, ["region", "region_name"]).toLowerCase();
    return !territories.some((t) => {
      const aliases = [t.name, ...(t.aliases || [])];
      return aliases.some((a) => a.toLowerCase() === r);
    });
  });
  if (unclassified.length > 0) byTerritory.set("Autres", unclassified);

  return (
    <main className="menu-page-shell">
      <div className="menu-page-ambient menu-page-ambient-one" />
      <div className="menu-page-ambient menu-page-ambient-two" />

      <section className="menu-page-card">
        {/* Topbar */}
        <div className="menu-page-topbar">
          <Link href="/evenements" className="event-back-link">
            <ArrowLeft size={17} />
            Tous les pays
          </Link>
          <span className="event-status-pill">Agenda {name}</span>
        </div>

        {/* Hero */}
        <div className="menu-page-hero">
          <p className="kicker">{flag} Espace francophone</p>
          <h1>Événements littéraires en {name}</h1>
          <p>
            Salons du livre, festivals, dédicaces et rencontres littéraires en {name} référencés
            par Dédicalivres.
          </p>
        </div>

        {/* Stats */}
        <div className="events-overview-grid">
          <div><span>Événements</span><strong>{events.length}</strong></div>
          <div><span>À venir</span><strong>{upcoming}</strong></div>
          <div><span>Territoires</span><strong>{territoryNames.size || territories.length}</strong></div>
          <div><span>Villes</span><strong>{cities.size}</strong></div>
        </div>

        {/* Navigation par territoire */}
        {territories.length > 1 && (
          <nav className="menu-feature-grid" aria-label={`Territoires de ${name}`}>
            {territories.map((territory) => {
              const count = byTerritory.get(territory.name)?.length || 0;
              return (
                <Link
                  key={territory.code}
                  href={`/pays/${countryCode.toLowerCase()}/${encodeURIComponent(
                    territory.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
                  )}`}
                  className="menu-feature-card"
                >
                  <span>{count}</span>
                  <strong>{territory.name}</strong>
                  <p>{count} événement{count > 1 ? "s" : ""} référencé{count > 1 ? "s" : ""}</p>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Liste des événements */}
        {events.length === 0 ? (
          <div className="events-empty-state">
            <h2>Aucun événement référencé en {name} pour le moment.</h2>
            <p>Les événements sont ajoutés régulièrement par l'équipe Dédicalivres.</p>
            <Link href="/evenements" className="event-main-action">Voir tous les événements</Link>
          </div>
        ) : (
          <>
            {Array.from(byTerritory.entries()).map(([territoryName, tevents]) => (
              <section key={territoryName} className="related-events-module">
                <div className="related-events-header">
                  <span className="event-module-label">{name}</span>
                  <h2>{territoryName}</h2>
                </div>
                <div className="events-premium-grid">
                  {tevents.slice(0, 8).map((event) => {
                    const title = pick(event, ["title", "name", "event_title", "titre"], "Événement littéraire");
                    const city = pick(event, ["city", "ville", "location", "lieu"], "");
                    const date = pick(event, ["start_date", "date", "event_date", "starts_at"], "");
                    const imageUrl = pick(event, ["image_url", "image", "cover_url", "photo_url"], "");
                    const description = pick(event, ["description", "details", "summary", "content"], "");
                    const type = eventType(event);
                    const ended = isEventEnded(event);
                    return (
                      <Link
                        href={eventRoute(event)}
                        className={`event-vitrine-card ${ended ? "is-ended" : ""}`}
                        key={eventRoute(event)}
                      >
                        <div className="event-vitrine-image">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
                              alt={title}
                              fill
                              sizes="(max-width: 768px) 100vw, 400px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="event-vitrine-placeholder">
                              <span>{type}</span>
                              <strong>{city}</strong>
                            </div>
                          )}
                        </div>
                        <div className="event-vitrine-content">
                          <div className="event-vitrine-topline">
                            <span className="event-type-badge">{type}</span>
                            <span><CalendarDays size={14} /> {formatDate(date)}{ended ? " · terminé" : ""}</span>
                          </div>
                          <h2>{title}</h2>
                          <p>{description || "Découvrez les informations de cet événement dans sa fiche dédiée."}</p>
                          <div className="event-vitrine-footer">
                            <span><MapPin size={14} /> {city} · {countryLabel(countryCode)}</span>
                            <strong>Voir la fiche →</strong>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                {tevents.length > 8 && (
                  <div style={{ textAlign: "center", marginTop: "1rem" }}>
                    <Link
                      href={`/evenements?country=${countryCode}&region=${encodeURIComponent(territoryName)}`}
                      className="event-secondary-action"
                    >
                      Voir les {tevents.length} événements de {territoryName}
                    </Link>
                  </div>
                )}
              </section>
            ))}
          </>
        )}

        {/* Actions */}
        <div className="menu-page-actions">
          <Link href={`/evenements?country=${countryCode}`} className="event-main-action">
            Tous les événements {name}
          </Link>
          <Link href="/#carte" className="event-secondary-action">
            Explorer la carte
          </Link>
        </div>
      </section>
    </main>
  );
}
