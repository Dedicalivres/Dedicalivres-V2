import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { CalendarDays, Filter, MapPin, Search, Sparkles } from "lucide-react";

type EventRow = Record<string, unknown>;
type AuthorPresenceRow = Record<string, unknown>;
type PresenceMap = Map<string, string[]>;

function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

function value(row: EventRow | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;

  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) {
      return String(current);
    }
  }

  return fallback;
}

function slugifyDedicalivres(valueToSlug: unknown) {
  return String(valueToSlug ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSearchText(valueToNormalize: unknown) {
  return String(valueToNormalize ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function eventRoute(event: EventRow) {
  const id = value(event, ["id", "event_id", "uuid"]);
  if (id) return `/evenements/${encodeURIComponent(id)}`;

  const title = value(event, ["title", "name", "event_title", "titre"]);
  return `/evenements/${encodeURIComponent(slugifyDedicalivres(title))}`;
}

function formatDate(date: string) {
  if (!date) return "Date à confirmer";

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function eventTimestamp(event: EventRow) {
  const raw = value(event, ["start_date", "date", "event_date", "starts_at"]);
  const timestamp = new Date(raw).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

function isEventEnded(event: EventRow) {
  const rawEnd = value(event, ["end_date", "date_end", "ends_at"]);
  const rawStart = value(event, ["start_date", "date", "event_date", "starts_at"]);
  const raw = rawEnd || rawStart;
  if (!raw) return false;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return false;

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  parsed.setHours(23, 59, 59, 999);

  return parsed < today;
}

function eventType(event: EventRow) {
  const raw = value(event, ["type", "category", "source_label", "event_type"], "Événement");
  const normalized = raw.toLowerCase();

  if (normalized.includes("festival")) return "Festival";
  if (normalized.includes("salon")) return "Salon";
  if (normalized.includes("dedic") || normalized.includes("dédic")) return "Dédicace";
  if (normalized.includes("rencontre")) return "Rencontre";
  if (normalized.includes("conf") || normalized.includes("lecture")) return "Conférence";
  if (normalized.includes("atelier") || normalized.includes("animation")) return "Animation";
  if (normalized.includes("jeunesse")) return "Jeunesse";

  return raw;
}

function typeKey(type: string) {
  return slugifyDedicalivres(type || "evenement");
}

function uniqueValues(events: EventRow[], keys: string[]) {
  return Array.from(
    new Set(
      events
        .map((event) => value(event, keys))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

function stats(events: EventRow[]) {
  const upcoming = events.length;
  const regions = uniqueValues(events, ["region", "region_name"]).length;
  const cities = uniqueValues(events, ["city", "ville", "location", "lieu"]).length;
  const salons = events.filter((event) => eventType(event).toLowerCase().includes("salon")).length;

  return { upcoming, regions, cities, salons };
}

function eventId(event: EventRow) {
  return value(event, ["id", "event_id", "uuid"]);
}

function authorPresenceName(row: AuthorPresenceRow) {
  return value(row, ["pseudo"]);
}

async function fetchAuthorPresencesByEvent(supabase: NonNullable<ReturnType<typeof createSupabaseServerClient>>) {
  const baseSelect = "event_id,pseudo";

  let response = await supabase
    .from("event_authors_presence")
    .select(baseSelect)
    .eq("validated", true)
    .or("rejected.is.null,rejected.eq.false")
    .limit(1000);

  if (response.error) {
    response = await supabase
      .from("event_authors_presence")
      .select(baseSelect)
      .eq("validated", true)
      .limit(1000);
  }

  if (response.error || !response.data) {
    return new Map<string, string[]>();
  }

  const map: PresenceMap = new Map();

  ((response.data || []) as AuthorPresenceRow[]).forEach((row) => {
    const id = value(row, ["event_id"]);
    const name = authorPresenceName(row);
    if (!id || !name) return;

    const current = map.get(id) || [];
    if (!current.some((existing) => slugifyDedicalivres(existing) === slugifyDedicalivres(name))) {
      current.push(name);
      map.set(id, current);
    }
  });

  return map;
}

async function fetchEvents() {
  const supabase = createSupabaseServerClient();

  if (!supabase) {
    return {
      events: [] as EventRow[],
      authorPresencesByEvent: new Map<string, string[]>(),
      error: "Connexion Supabase non configurée.",
    };
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("validated", true)
    .eq("rejected", false)
    .limit(300);

  if (error) {
    return {
      events: [] as EventRow[],
      authorPresencesByEvent: new Map<string, string[]>(),
      error: error.message,
    };
  }

  const authorPresencesByEvent = await fetchAuthorPresencesByEvent(supabase);

  const events = ((data || []) as EventRow[]).sort((a, b) => {
    const endedA = isEventEnded(a);
    const endedB = isEventEnded(b);

    if (endedA !== endedB) return endedA ? 1 : -1;
    return eventTimestamp(a) - eventTimestamp(b);
  });

  return { events, authorPresencesByEvent, error: "" };
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { events, authorPresencesByEvent, error } = await fetchEvents();

  const query = normalizeSearchText(params.q || "");
  const regionFilter = String(params.region || "");
  const cityFilter = String(params.city || "");
  const typeFilter = String(params.type || "");

  const filteredEvents = events.filter((event) => {
    const title = value(event, ["title", "name", "event_title", "titre"]);
    const city = value(event, ["city", "ville", "location", "lieu"]);
    const region = value(event, ["region", "region_name"]);
    const description = value(event, ["description", "details", "summary", "content"]);
    const type = eventType(event);
    const declaredAuthors = authorPresencesByEvent.get(eventId(event)) || [];

    const haystack = normalizeSearchText(`${title} ${city} ${region} ${description} ${type} ${declaredAuthors.join(" ")}`);

    if (query && !haystack.includes(query)) return false;
    if (regionFilter && region !== regionFilter) return false;
    if (cityFilter && city !== cityFilter) return false;
    if (typeFilter && typeKey(type) !== typeFilter) return false;

    return true;
  });

  const regions = uniqueValues(events, ["region", "region_name"]);
  const cities = uniqueValues(events, ["city", "ville", "location", "lieu"]);
  const searchSuggestions = Array.from(
    new Set([
      ...uniqueValues(events, ["title", "name", "event_title", "titre"]),
      ...cities,
      ...Array.from(authorPresencesByEvent.values()).flat(),
    ]),
  ).slice(0, 140);
  const types = Array.from(new Set(events.map((event) => eventType(event)).filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
  const overview = stats(events);

  return (
    <main className="events-page-shell">
      <div className="menu-page-ambient menu-page-ambient-one" />
      <div className="menu-page-ambient menu-page-ambient-two" />

      <section className="events-page-card">
        <div className="events-page-hero">
          <p className="kicker">Agenda premium</p>
          <h1>Événements littéraires</h1>
          <p>
            Retrouvez les rencontres, salons, festivals et dédicaces référencés dans Dédicalivres.
            Cette page devient le complément naturel de la carte interactive.
          </p>
        </div>

        <div className="events-overview-grid">
          <div>
            <span>Événements</span>
            <strong>{overview.upcoming}</strong>
          </div>
          <div>
            <span>Régions</span>
            <strong>{overview.regions}</strong>
          </div>
          <div>
            <span>Villes</span>
            <strong>{overview.cities}</strong>
          </div>
          <div>
            <span>Salons</span>
            <strong>{overview.salons}</strong>
          </div>
        </div>

        <form className="events-filter-panel">
          <div className="events-search-field">
            <Search size={18} />
            <input
              name="q"
              list="events-search-suggestions"
              placeholder="Rechercher un événement, une ville, un auteur..."
              defaultValue={String(params.q || "")}
            />
            <datalist id="events-search-suggestions">
              {searchSuggestions.map((suggestion) => (
                <option key={suggestion} value={suggestion} />
              ))}
            </datalist>
          </div>

          <label>
            <Filter size={16} />
            <select name="type" defaultValue={typeFilter}>
              <option value="">Tous les types</option>
              {types.map((type) => (
                <option key={type} value={typeKey(type)}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            <MapPin size={16} />
            <select name="region" defaultValue={regionFilter}>
              <option value="">Toutes les régions</option>
              {regions.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>
          </label>

          <label>
            <MapPin size={16} />
            <select name="city" defaultValue={cityFilter}>
              <option value="">Toutes les villes</option>
              {cities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </label>

          <button type="submit" className="event-main-action">
            Filtrer
            <Sparkles size={16} />
          </button>

          <Link href="/evenements" className="event-secondary-action">
            Réinitialiser
          </Link>
        </form>

        <div className="events-result-line">
          <span>{filteredEvents.length} résultat{filteredEvents.length > 1 ? "s" : ""}</span>
          {error && <strong>{error}</strong>}
        </div>

        <section className="events-premium-grid">
          {filteredEvents.length === 0 ? (
            <div className="events-empty-state">
              <h2>Aucun événement trouvé.</h2>
              <p>Essayez une autre ville, région, catégorie ou recherche.</p>
              <Link href="/#carte" className="event-main-action">Explorer la carte</Link>
            </div>
          ) : (
            filteredEvents.map((event) => {
              const title = value(event, ["title", "name", "event_title", "titre"], "Événement littéraire");
              const city = value(event, ["city", "ville", "location", "lieu"], "Ville à préciser");
              const region = value(event, ["region", "region_name"], "");
              const date = value(event, ["start_date", "date", "event_date", "starts_at"], "");
              const imageUrl = value(event, ["image_url", "image", "cover_url", "photo_url"], "");
              const description = value(event, ["description", "details", "summary", "content"], "");
              const type = eventType(event);
              const ended = isEventEnded(event);

              return (
                <Link href={eventRoute(event)} className={`event-vitrine-card ${ended ? "is-ended" : ""}`} key={eventRoute(event)}>
                  <div className="event-vitrine-image">
                    {imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageUrl} alt={title} />
                    ) : (
                      <div className="event-vitrine-placeholder">
                        <span>{type}</span>
                        <strong>{city}</strong>
                      </div>
                    )}
                  </div>

                  <div className="event-vitrine-content">
                    <div className="event-vitrine-topline">
                      <span className={`event-type-badge type-${typeKey(type)}`}>{type}</span>
                      <span><CalendarDays size={14} /> {formatDate(date)}{ended ? " · terminé" : ""}</span>
                    </div>

                    <h2>{title}</h2>
                    <p>{description || "Découvrez les informations de cet événement dans sa fiche dédiée."}</p>

                    <div className="event-vitrine-footer">
                      <span><MapPin size={14} /> {city}{region ? ` · ${region}` : ""}</span>
                      <strong>Voir la fiche →</strong>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </section>
      </section>
    </main>
  );
}
