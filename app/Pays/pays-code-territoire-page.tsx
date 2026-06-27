import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CalendarDays, MapPin, ArrowLeft } from "lucide-react";
import {
  FRANCOPHONE_COUNTRIES,
  countryLabel,
  countryName,
  countryFlag,
  countryTerritories,
  eventCountryCode,
  normalizeCountryCode,
} from "@/lib/francophone";

export const revalidate = 3600;

type PageProps = {
  params: Promise<{ code: string; territoire: string }>;
};

// Génère les routes statiques pour tous les territoires de tous les pays.
export function generateStaticParams() {
  return FRANCOPHONE_COUNTRIES.flatMap((country) =>
    countryTerritories(country.code).map((territory) => ({
      code: country.code.toLowerCase(),
      territoire: territory.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    }))
  );
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

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Résout un slug de territoire vers l'objet territoire correspondant.
function resolveTerritoire(countryCode: string, territoireSlug: string) {
  const territories = countryTerritories(countryCode);
  return territories.find((t) => {
    const candidates = [t.name, ...(t.aliases || [])];
    return candidates.some((c) => slugify(c) === territoireSlug);
  }) || null;
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { code, territoire } = await params;
  const countryCode = normalizeCountryCode(code.toUpperCase());
  const country = FRANCOPHONE_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) return { title: "Pays introuvable", robots: { index: false, follow: true } };

  const resolved = resolveTerritoire(countryCode, territoire);
  if (!resolved) return { title: "Territoire introuvable", robots: { index: false, follow: true } };

  const name = countryName(countryCode);
  const flag = countryFlag(countryCode);
  const territoryName = resolved.name;
  const title = `${flag} Événements littéraires en ${territoryName} (${name})`;
  const description = `Salons du livre, festivals, dédicaces et rencontres littéraires en ${territoryName}, ${name}. Agenda Dédicalivres : toutes les dates, lieux et auteurs présents.`;
  const canonical = `/pays/${countryCode.toLowerCase()}/${territoire}`;

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

export default async function TerritoirePage({ params }: PageProps) {
  const { code, territoire } = await params;
  const countryCode = normalizeCountryCode(code.toUpperCase());
  const country = FRANCOPHONE_COUNTRIES.find((c) => c.code === countryCode);
  if (!country) notFound();

  const resolved = resolveTerritoire(countryCode, territoire);
  if (!resolved) notFound();

  const supabase = createSupabaseServerClient();
  let events: Record<string, unknown>[] = [];

  if (supabase) {
    const { data } = await supabase
      .from("events")
      .select("*")
      .eq("validated", true)
      .eq("rejected", false)
      .eq("country_code", countryCode)
      .limit(300);

    // Filtrer par territoire côté client (normalisation robuste via aliases).
    const allEvents = (data || []) as Record<string, unknown>[];
    const aliases = [resolved.name, ...(resolved.aliases || [])].map((a) => slugify(a));
    events = allEvents.filter((e) => {
      const r = slugify(pick(e, ["region", "region_name"]));
      return aliases.includes(r);
    });
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

  const name = countryName(countryCode);
  const flag = countryFlag(countryCode);
  const territoryName = resolved.name;
  const upcoming = events.filter((e) => !isEventEnded(e)).length;
  const cities = new Set(events.map((e) => pick(e, ["city", "ville", "location", "lieu"])).filter(Boolean));

  // Grouper par ville
  const byCity = new Map<string, Record<string, unknown>[]>();
  for (const event of events) {
    const city = pick(event, ["city", "ville", "location", "lieu"], "Ville à préciser");
    const current = byCity.get(city) || [];
    current.push(event);
    byCity.set(city, current);
  }

  return (
    <main className="menu-page-shell">
      <div className="menu-page-ambient menu-page-ambient-one" />
      <div className="menu-page-ambient menu-page-ambient-two" />

      <section className="menu-page-card">
        {/* Topbar */}
        <div className="menu-page-topbar">
          <Link href={`/pays/${countryCode.toLowerCase()}`} className="event-back-link">
            <ArrowLeft size={17} />
            {flag} {name}
          </Link>
          <span className="event-status-pill">{territoryName}</span>
        </div>

        {/* Hero */}
        <div className="menu-page-hero">
          <p className="kicker">{flag} {name}</p>
          <h1>Événements littéraires en {territoryName}</h1>
          <p>
            Salons du livre, festivals, dédicaces et rencontres littéraires en {territoryName},{" "}
            {name}, référencés par Dédicalivres.
          </p>
        </div>

        {/* Stats */}
        <div className="events-overview-grid">
          <div><span>Événements</span><strong>{events.length}</strong></div>
          <div><span>À venir</span><strong>{upcoming}</strong></div>
          <div><span>Villes</span><strong>{cities.size}</strong></div>
          <div><span>Territoire</span><strong>{territoryName}</strong></div>
        </div>

        {/* Liste par ville */}
        {events.length === 0 ? (
          <div className="events-empty-state">
            <h2>Aucun événement référencé en {territoryName} pour le moment.</h2>
            <p>Les événements sont ajoutés régulièrement par l'équipe Dédicalivres.</p>
            <Link href={`/pays/${countryCode.toLowerCase()}`} className="event-main-action">
              Voir tous les événements {name}
            </Link>
          </div>
        ) : (
          Array.from(byCity.entries()).map(([city, cityEvents]) => (
            <section key={city} className="related-events-module">
              <div className="related-events-header">
                <span className="event-module-label">{territoryName}</span>
                <h2>{city}</h2>
              </div>
              <div className="events-premium-grid">
                {cityEvents.map((event) => {
                  const title = pick(event, ["title", "name", "event_title", "titre"], "Événement littéraire");
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
            </section>
          ))
        )}

        {/* Actions */}
        <div className="menu-page-actions">
          <Link href={`/evenements?country=${countryCode}&region=${encodeURIComponent(territoryName)}`} className="event-main-action">
            Tous les événements {territoryName}
          </Link>
          <Link href={`/pays/${countryCode.toLowerCase()}`} className="event-secondary-action">
            {flag} Retour {name}
          </Link>
        </div>
      </section>
    </main>
  );
}
