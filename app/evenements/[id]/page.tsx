import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { countryLabel, countryName, eventCountryCode } from "@/lib/francophone";

type PageProps = {
  params: Promise<{ id: string }>;
};

function createSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey);
}

type SupabaseEventClient = NonNullable<ReturnType<typeof createSupabaseServerClient>>;

type AuthorPresence = {
  id: string;
  pseudo: string;
  website: string;
  authorProfileUrl: string;
  authorProfileUrlType: string;
  publicationMode: string;
  bookOrPublisherUrl: string;
  bookOrPublisherUrlType: string;
  publisherName: string;
  portraitUrl: string;
  createdAt: string;
};

function value(row: Record<string, unknown> | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;

  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) {
      return String(current);
    }
  }

  return fallback;
}

function slugifyDedicalivres(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
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


function getImageRatioClass(event: Record<string, unknown> | null) {
  const width = Number(value(event, ["image_width", "width", "photo_width"], "0"));
  const height = Number(value(event, ["image_height", "height", "photo_height"], "0"));

  if (width > 0 && height > 0) {
    const ratio = width / height;
    if (ratio >= 1.28) return "event-layout-landscape";
    if (ratio <= 0.82) return "event-layout-portrait";
    return "event-layout-square";
  }

  return "event-layout-adaptive";
}


function splitListField(valueToSplit: string) {
  if (!valueToSplit) return [];
  return valueToSplit
    .split(/[,;|\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getAuthors(event: Record<string, unknown> | null) {
  const direct = value(event, ["author", "authors", "auteur", "auteurs", "author_name", "authors_names"], "");
  return splitListField(direct);
}

function normalizePresenceRow(row: Record<string, unknown>): AuthorPresence | null {
  const pseudo = value(row, ["pseudo", "name", "author_name", "auteur"]);
  if (!pseudo) return null;

  return {
    id: value(row, ["id"]),
    pseudo,
    website: value(row, ["website"]),
    authorProfileUrl: value(row, ["author_profile_url", "author_url", "profile_url"]),
    authorProfileUrlType: value(row, ["author_profile_url_type"]),
    publicationMode: value(row, ["publication_mode"]),
    bookOrPublisherUrl: value(row, ["book_or_publisher_url"]),
    bookOrPublisherUrlType: value(row, ["book_or_publisher_url_type"]),
    publisherName: value(row, ["publisher_name"]),
    portraitUrl: value(row, ["author_portrait_url", "avatar_url", "photo_url"]),
    createdAt: value(row, ["created_at"]),
  };
}

function dedupeAuthorPresences(authors: AuthorPresence[]) {
  const seen = new Set<string>();

  return authors.filter((author) => {
    const key = slugifyDedicalivres(author.pseudo);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function legacyAuthorsToPresence(authors: string[]) {
  return authors.map((author, index) => ({
    id: `legacy-${index}-${slugifyDedicalivres(author)}`,
    pseudo: author,
    website: "",
    authorProfileUrl: "",
    authorProfileUrlType: "",
    publicationMode: "",
    bookOrPublisherUrl: "",
    bookOrPublisherUrlType: "",
    publisherName: "",
    portraitUrl: "",
    createdAt: "",
  }));
}

function getSourceLink(event: Record<string, unknown> | null) {
  return value(event, ["website", "url", "link", "event_url", "source_url"], "");
}


function getAuthorInitials(author: string) {
  return author
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getAuthorHref(author: AuthorPresence) {
  const slug = slugifyDedicalivres(author.pseudo);
  return slug ? `/#auteurs` : "/#auteurs";
}

function getPublicationModeLabel(mode: string) {
  const normalized = mode.toLowerCase();

  if (normalized.includes("dedic") || normalized.includes("dédic")) return "Dédicace annoncée";
  if (normalized.includes("conference") || normalized.includes("conférence")) return "Conférence";
  if (normalized.includes("atelier")) return "Atelier";
  if (normalized.includes("stand")) return "Stand auteur";
  if (normalized.includes("self")) return "Autoédition";
  if (normalized.includes("publisher") || normalized.includes("éditeur") || normalized.includes("editeur")) return "Présence éditeur";
  if (normalized && normalized !== "unknown") return mode;

  return "Auteur présent";
}

function getAuthorRole(author: AuthorPresence) {
  const publisher = author.publisherName.trim();
  const mode = getPublicationModeLabel(author.publicationMode);
  return publisher ? `${mode} · ${publisher}` : mode;
}


function getMapReturnHref(event: Record<string, unknown> | null) {
  const countryCode = eventCountryCode(event);
  if (countryCode !== "FR") {
    return `/evenements?country=${encodeURIComponent(countryCode)}`;
  }

  const city = value(event, ["city", "ville", "location", "lieu"]);
  const region = value(event, ["region", "region_name"]);
  const department = value(event, ["department", "departement", "department_code", "code_departement"]);

  const params = new URLSearchParams();
  if (region) params.set("region", region);
  if (department) params.set("department", department);
  if (city) params.set("city", city);

  const query = params.toString();
  return query ? `/?${query}#carte` : "/#carte";
}

function eventTypeLabel(type: string) {
  const normalized = type.toLowerCase();

  if (normalized.includes("festival")) return "Festival littéraire";
  if (normalized.includes("salon")) return "Salon du livre";
  if (normalized.includes("dedic") || normalized.includes("dédic")) return "Dédicace";
  if (normalized.includes("rencontre")) return "Rencontre auteur";
  if (normalized.includes("conf") || normalized.includes("lecture")) return "Conférence";
  if (normalized.includes("atelier") || normalized.includes("animation")) return "Atelier";
  if (normalized.includes("jeunesse")) return "Jeunesse";

  return "Événement littéraire";
}

function isSalonOrFestival(type: string) {
  const normalized = type.toLowerCase();
  return normalized.includes("salon") || normalized.includes("festival");
}

async function fetchEventByIdOrSlug(supabase: SupabaseEventClient, rawParam: string) {
  const decoded = decodeURIComponent(rawParam);

  if (isUuid(decoded)) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("id", decoded)
      .eq("validated", true)
      .eq("rejected", false)
      .maybeSingle();

    if (error) return { event: null, errorMessage: error.message };
    if (data) return { event: data as Record<string, unknown>, errorMessage: "" };
  }

  // Fallback slug : on ne fait jamais eq("id", slug), car id est UUID.
  // On récupère les événements publics visibles puis on compare le slug localement.
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("validated", true)
    .eq("rejected", false)
    .limit(500);

  if (error) return { event: null, errorMessage: error.message };

  const rows = (data || []) as Record<string, unknown>[];
  const matching = rows.find((row) => {
    const id = value(row, ["id", "event_id", "uuid"]);
    const slug = value(row, ["slug"]);
    const title = value(row, ["title", "name", "event_title", "titre"]);
    return (
      decoded === id ||
      decoded === slug ||
      decoded === slugifyDedicalivres(slug) ||
      decoded === slugifyDedicalivres(title)
    );
  });

  return {
    event: matching || null,
    errorMessage: matching ? "" : `Aucun événement ne correspond à “${decoded}”.`,
  };
}


async function fetchRelatedEvents(
  supabase: SupabaseEventClient,
  event: Record<string, unknown> | null
) {
  if (!event) return [];

  const currentId = value(event, ["id", "event_id", "uuid"]);
  const city = value(event, ["city", "ville", "location", "lieu"]);
  const region = value(event, ["region", "region_name"]);
  const countryCode = eventCountryCode(event);
  const eventDate = value(event, ["start_date", "date", "event_date", "starts_at"]);

  let query = supabase
    .from("events")
    .select("*")
    .eq("validated", true)
    .eq("rejected", false)
    .limit(8);

  if (city) {
    query = query.eq("city", city);
  } else if (region) {
    query = query.eq("region", region);
  }
  query = query.eq("country_code", countryCode);

  const { data, error } = await query;

  if (error || !data) return [];

  return (data as Record<string, unknown>[])
    .filter((row) => {
      const id = value(row, ["id", "event_id", "uuid"]);
      return !currentId || id !== currentId;
    })
    .sort((a, b) => {
      const dateA = new Date(value(a, ["start_date", "date", "event_date", "starts_at"], eventDate)).getTime();
      const dateB = new Date(value(b, ["start_date", "date", "event_date", "starts_at"], eventDate)).getTime();
      return (Number.isNaN(dateA) ? 0 : dateA) - (Number.isNaN(dateB) ? 0 : dateB);
    })
    .slice(0, 4);
}

async function fetchAuthorPresences(supabase: SupabaseEventClient, eventId: string) {
  if (!eventId) return [];

  const selectExtended = [
    "id",
    "pseudo",
    "website",
    "author_profile_url",
    "author_profile_url_type",
    "publication_mode",
    "book_or_publisher_url",
    "book_or_publisher_url_type",
    "publisher_name",
    "author_portrait_url",
    "created_at",
  ].join(",");

  const extendedResponse = await supabase
    .from("event_authors_presence")
    .select(selectExtended)
    .eq("event_id", eventId)
    .eq("validated", true)
    .or("rejected.is.null,rejected.eq.false")
    .order("created_at", { ascending: true });

  let rows = extendedResponse.data as Record<string, unknown>[] | null;
  let error = extendedResponse.error;

  if (error) {
    const legacyResponse = await supabase
      .from("event_authors_presence")
      .select("id,pseudo,website,created_at")
      .eq("event_id", eventId)
      .eq("validated", true)
      .order("created_at", { ascending: true });

    rows = legacyResponse.data as Record<string, unknown>[] | null;
    error = legacyResponse.error;
  }

  if (error || !rows) return [];

  return dedupeAuthorPresences(
    rows
      .map(normalizePresenceRow)
      .filter((author): author is AuthorPresence => Boolean(author))
  );
}

function getEventRoute(event: Record<string, unknown>) {
  const id = value(event, ["id", "event_id", "uuid"]);
  if (id) return `/evenements/${encodeURIComponent(id)}`;

  const slug = value(event, ["slug"]) || slugifyDedicalivres(value(event, ["title", "name", "event_title", "titre"]));
  return slug ? `/evenements/${encodeURIComponent(slug)}` : "/#carte";
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createSupabaseServerClient();
  const event = supabase ? (await fetchEventByIdOrSlug(supabase, id)).event : null;

  if (!event) {
    return {
      title: "Événement introuvable",
      description: "Cette fiche événement n’est pas disponible depuis les données publiques actuelles.",
      robots: { index: false, follow: true },
    };
  }

  const title = value(event, ["title", "name", "event_title", "titre"], "Événement littéraire");
  const city = value(event, ["city", "ville", "location", "lieu"], "");
  const region = value(event, ["region", "region_name"], "");
  const countryCode = eventCountryCode(event);
  const country = countryName(countryCode);
  const startDate = value(event, ["start_date", "date", "event_date", "starts_at"], "");
  const rawDescription = value(event, ["description", "details", "summary", "content"], "");
  const imageUrl = value(event, ["image_url", "image", "cover_url", "photo_url"], "");
  const type = value(event, ["type", "category", "source_label"], "Rencontre littéraire");

  const place = [city, region, country].filter(Boolean).join(", ");
  const dateLabel = formatDate(startDate);
  const metaTitle = `${title}${city || region ? ` — ${city || region}` : ""}`;
  const metaDescription = (
    rawDescription
      ? rawDescription.replace(/\s+/g, " ").trim()
      : `${type}${place ? ` à ${place}` : ""}${dateLabel ? ` le ${dateLabel}` : ""}. Lieu, dates et auteurs présents sur Dédicalivres.`
  ).slice(0, 160);

  const canonical = `/evenements/${encodeURIComponent(value(event, ["id", "event_id", "uuid"], id))}`;

  return {
    title: metaTitle,
    description: metaDescription,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: metaTitle,
      description: metaDescription,
      url: canonical,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title: metaTitle,
      description: metaDescription,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createSupabaseServerClient();

  let event: Record<string, unknown> | null = null;
  let errorMessage = "";

  if (!supabase) {
    errorMessage = "Connexion Supabase non configurée.";
  } else {
    const result = await fetchEventByIdOrSlug(supabase, id);
    event = result.event;
    errorMessage = result.errorMessage;
  }

  const relatedEvents = supabase && event ? await fetchRelatedEvents(supabase, event) : [];
  const eventId = value(event, ["id", "event_id", "uuid"]);
  const authorPresences = supabase && event ? await fetchAuthorPresences(supabase, eventId) : [];

  const title = value(event, ["title", "name", "event_title", "titre"], "Événement introuvable");
  const city = value(event, ["city", "ville", "location", "lieu"], "Ville à préciser");
  const region = value(event, ["region", "region_name"], "");
  const countryCode = eventCountryCode(event);
  const startDate = value(event, ["start_date", "date", "event_date", "starts_at"], "");
  const endDate = value(event, ["end_date", "date_end", "ends_at"], "");
  const description = value(event, ["description", "details", "summary", "content"], "");
  const imageUrl = value(event, ["image_url", "image", "cover_url", "photo_url"], "");
  const website = getSourceLink(event);
  const fallbackAuthors = legacyAuthorsToPresence(getAuthors(event));
  const authors = authorPresences.length > 0 ? authorPresences : fallbackAuthors;
  const mapReturnHref = getMapReturnHref(event);
  const price = value(event, ["price", "tarif"], "");
  const type = eventTypeLabel(value(event, ["type", "category", "source_label"], ""));
  const imageRatioClass = getImageRatioClass(event);
  const showDeclaredAuthors = authors.length > 0 && isSalonOrFestival(type);
  const locationLabel = `${region ? `${city} · ${region}` : city} · ${countryLabel(countryCode)}`;
  const formattedStartDate = formatDate(startDate);
  const formattedEndDate = formatDate(endDate);
  const dateLabel = endDate && formattedEndDate !== formattedStartDate
    ? `${formattedStartDate} - ${formattedEndDate}`
    : formattedStartDate;

  return (
    <main className="event-page-shell">
      <div className="event-page-ambient event-page-ambient-one" />
      <div className="event-page-ambient event-page-ambient-two" />

      <section className="event-premium-card">
        <div className="event-premium-topbar">
          <Link href={mapReturnHref} className="event-back-link">
            <ArrowLeft size={17} />
            Retour à la carte
          </Link>
          <span className="event-status-pill">Événement référencé</span>
        </div>

        {!event ? (
          <div className="event-empty-state">
            <p className="kicker">Fiche événement</p>
            <h1>Événement introuvable.</h1>
            <p>{errorMessage || "La fiche n’est pas disponible depuis les données publiques actuelles."}</p>
            <Link href={mapReturnHref} className="event-main-action">Revenir à la carte</Link>
          </div>
        ) : (
          <div className={`event-premium-grid event-detail-flow ${imageRatioClass} ${showDeclaredAuthors ? "" : "event-detail-flow-wide"}`}>
            <div className="event-premium-content">
              <p className="kicker">{type}</p>
              <h1>{title}</h1>

              <div className="event-hero-summary">
                <span>{dateLabel}</span>
                <strong>{locationLabel}</strong>
                <em>{type}</em>
              </div>

              <div className="event-premium-visual event-primary-poster">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl} alt={title} />
                ) : (
                  <div className="event-visual-placeholder">
                    <span>Événement</span>
                    <strong>{city}</strong>
                  </div>
                )}
              </div>

              <p className="event-description">
                {description || "Les informations détaillées de cet événement seront enrichies progressivement depuis Dédicalivres."}
              </p>

              <div className="event-info-grid event-practical-summary">
                <div>
                  <span>Format</span>
                  <strong>{type}</strong>
                </div>
                <div>
                  <span>Territoire</span>
                  <strong>{region || "À préciser"}</strong>
                </div>
                <div>
                  <span>Pays</span>
                  <strong>{countryLabel(countryCode)}</strong>
                </div>
                <div>
                  <span>Tarif</span>
                  <strong>{price || "À confirmer"}</strong>
                </div>
              </div>

              <div className="event-action-row">
                {website && (
                  <a href={website} target="_blank" rel="noreferrer" className="event-main-action">
                    Site officiel
                    <ExternalLink size={16} />
                  </a>
                )}
                <Link href={mapReturnHref} className="event-secondary-action">
                  Explorer la carte
                </Link>
              </div>

              {relatedEvents.length > 0 && (
                <section className="related-events-module">
                  <div className="related-events-header">
                    <span className="event-module-label">À proximité</span>
                    <h2>Autres rencontres à découvrir</h2>
                  </div>

                  <div className="related-events-grid">
                    {relatedEvents.map((related) => {
                      const relatedTitle = value(related, ["title", "name", "event_title", "titre"], "Événement littéraire");
                      const relatedCity = value(related, ["city", "ville", "location", "lieu"], city);
                      const relatedDate = value(related, ["start_date", "date", "event_date", "starts_at"], "");
                      const relatedType = eventTypeLabel(value(related, ["type", "category", "source_label"], ""));

                      return (
                        <Link className="related-event-card" href={getEventRoute(related)} key={getEventRoute(related)}>
                          <span>{relatedType}</span>
                          <strong>{relatedTitle}</strong>
                          <p>{relatedCity} · {formatDate(relatedDate)}</p>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>

            {showDeclaredAuthors && (
              <aside className="event-side-column">
                <section className="event-authors-module event-authors-featured event-side-authors">
                  <div className="event-authors-heading">
                    <div>
                      <span className="event-module-label">Auteurs déclarés présents</span>
                      <h2>Auteurs invités</h2>
                    </div>
                    <span className="event-authors-count">{authors.length}</span>
                  </div>

                  <div className="event-author-cards">
                    {authors.map((author) => (
                      <Link className="event-author-card" href={getAuthorHref(author)} key={author.id || author.pseudo}>
                        <span className="event-author-avatar">
                          {author.portraitUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={author.portraitUrl} alt="" loading="lazy" decoding="async" />
                          ) : (
                            getAuthorInitials(author.pseudo)
                          )}
                        </span>
                        <span className="event-author-info">
                          <strong>{author.pseudo}</strong>
                          <em>{getAuthorRole(author)}</em>
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              </aside>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
