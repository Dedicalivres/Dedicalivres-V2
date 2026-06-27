"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type WheelEvent } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type AuthorRow = Record<string, unknown>;

type GalleryAuthor = {
  id: string;
  name: string;
  photoUrl: string;
  meta: string;
  eventCount?: number;
  award?: AuthorAward;
};

type AuthorAward = {
  level: "bronze" | "silver" | "gold" | "emerald";
  events: number;
};

type EventAuthorSignal = {
  haystack: string;
};

const AWARD_MODELS = [
  {
    key: "bronze",
    level: "Cuivre",
    threshold: "10 événements ajoutés",
    title: "Bandeau cuivre",
    text: "Première reconnaissance visible : l’auteur entre dans le cercle des contributeurs actifs.",
  },
  {
    key: "silver",
    level: "Argent",
    threshold: "20 événements ajoutés",
    title: "Bandeau argent",
    text: "20 rencontres : une présence régulière, reconnue comme un engagement durable.",
  },
  {
    key: "gold",
    level: "Or",
    threshold: "50 événements ajoutés",
    title: "Bandeau or",
    text: "50 rencontres : distinction majeure, pensée comme un objectif public désirable.",
  },
  {
    key: "emerald",
    level: "Émeraude",
    threshold: "100 événements ajoutés et plus",
    title: "Bandeau Dédicalivres",
    text: "Grade le plus haut : un bandeau vert lumineux, rare, lié à l’identité du site.",
  },
];

const TEMP_AUTHOR_FIXTURES: GalleryAuthor[] = [
  { id: "demo-camille-aubrac", name: "Camille Aubrac", photoUrl: "https://i.pravatar.cc/720?img=12", meta: "Paris · Roman contemporain", eventCount: 214 },
  { id: "demo-noemie-valcourt", name: "Noémie Valcourt", photoUrl: "https://i.pravatar.cc/720?img=47", meta: "Lyon · Polar", eventCount: 64 },
  { id: "demo-eliott-mareuil", name: "Éliott Mareuil", photoUrl: "https://i.pravatar.cc/720?img=11", meta: "Nantes · Littérature blanche", eventCount: 18 },
  { id: "demo-sarah-belmont", name: "Sarah Belmont", photoUrl: "https://i.pravatar.cc/720?img=32", meta: "Bordeaux · Romance", eventCount: 6 },
  { id: "demo-adrien-sorel", name: "Adrien Sorel", photoUrl: "https://i.pravatar.cc/720?img=59", meta: "Toulouse · Imaginaire", eventCount: 104 },
  { id: "demo-juliette-kerlan", name: "Juliette Kerlan", photoUrl: "https://i.pravatar.cc/720?img=5", meta: "Rennes · Jeunesse", eventCount: 24 },
  { id: "demo-mathis-lenoir", name: "Mathis Lenoir", photoUrl: "https://i.pravatar.cc/720?img=15", meta: "Lille · Thriller", eventCount: 72 },
  { id: "demo-claire-monfort", name: "Claire Monfort", photoUrl: "https://i.pravatar.cc/720?img=49", meta: "Marseille · Essai", eventCount: 8 },
  { id: "demo-victor-aurange", name: "Victor Aurange", photoUrl: "https://i.pravatar.cc/720?img=53", meta: "Strasbourg · Historique", eventCount: 138 },
  { id: "demo-ines-roussel", name: "Inès Roussel", photoUrl: "https://i.pravatar.cc/720?img=25", meta: "Nice · Poésie", eventCount: 162 },
];

const validationAttempts = [
  (query: any) => query.eq("validated", true),
  (query: any) => query.eq("is_validated", true),
  (query: any) => query.eq("approved", true),
  (query: any) => query.eq("is_approved", true),
  (query: any) => query.eq("published", true),
  (query: any) => query.in("status", ["validated", "approved", "published", "public"]),
];

function value(row: AuthorRow, keys: string[]) {
  for (const key of keys) {
    const current = row[key];
    if (current !== null && current !== undefined && String(current).trim()) return String(current);
  }
  return "";
}

function normalizeAuthor(row: AuthorRow, index: number): GalleryAuthor | null {
  const photoUrl = value(row, ["avatar_url", "photo_url", "image_url", "author_portrait_url"]);
  if (!photoUrl) return null;

  const name = value(row, ["name", "full_name", "display_name", "nom", "author_name", "auteur"]);
  if (!name) return null;

  const city = value(row, ["city", "ville", "location"]);
  const nextEvent = value(row, ["next_event", "upcoming_event", "prochain_evenement", "event_title"]);
  const meta = nextEvent || city || "Auteur validé";
  const id = value(row, ["id", "uuid", "slug"]) || `${name}-${index}`;
  const eventCount = toAuthorEventCount(row);

  return { id, name, photoUrl, meta, eventCount, award: getAwardForEventCount(eventCount) };
}

function normalizePresenceAuthor(row: AuthorRow, index: number): GalleryAuthor | null {
  const photoUrl = value(row, ["author_portrait_url", "avatar_url", "photo_url"]);
  const name = value(row, ["pseudo", "name", "author_name"]);
  if (!photoUrl || !name) return null;

  const id = value(row, ["author_identity_key", "author_id", "id"]) || `presence-${name}-${index}`;
  const publisher = value(row, ["publisher_name"]);
  const publicationMode = value(row, ["publication_mode"]);
  const meta = publisher || (publicationMode && publicationMode !== "unknown" ? publicationMode : "Auteur déclaré présent");

  return {
    id,
    name,
    photoUrl,
    meta,
    eventCount: 0,
  };
}

function dedupeGalleryAuthors(authors: GalleryAuthor[]) {
  const seen = new Set<string>();

  return authors.filter((author) => {
    const key = normalizeText(author.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchPresencePortraitAuthors() {
  if (!supabase) return [] as GalleryAuthor[];

  const extendedResponse = await supabase
    .from("event_authors_presence")
    .select("id,author_id,author_identity_key,pseudo,author_portrait_url,publisher_name,publication_mode,event_id")
    .eq("validated", true)
    .or("rejected.is.null,rejected.eq.false")
    .not("author_portrait_url", "is", null)
    .limit(300);

  let rows = extendedResponse.data as AuthorRow[] | null;
  let error = extendedResponse.error;

  if (error) {
    const legacyResponse = await supabase
      .from("event_authors_presence")
      .select("id,pseudo,author_portrait_url,event_id")
      .eq("validated", true)
      .not("author_portrait_url", "is", null)
      .limit(300);

    rows = legacyResponse.data as AuthorRow[] | null;
    error = legacyResponse.error;
  }

  if (error || !rows) return [];

  const normalized = rows
    .map((row, index) => normalizePresenceAuthor(row, index))
    .filter(Boolean) as GalleryAuthor[];

  return dedupeGalleryAuthors(normalized);
}

function toAuthorEventCount(row: AuthorRow) {
  const raw = value(row, [
    "events_count",
    "event_count",
    "rencontres_count",
    "meetings_count",
    "dedicalivres_events_count",
    "author_events_count",
  ]);
  const count = Number(raw);
  return Number.isFinite(count) && count > 0 ? Math.round(count) : 0;
}

function normalizeText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function eventAuthorSignal(row: AuthorRow): EventAuthorSignal {
  const fields = [
    "author",
    "authors",
    "auteur",
    "auteurs",
    "author_name",
    "authors_names",
    "organizer",
    "organisateur",
    "host",
    "structure",
  ];

  return {
    haystack: fields.map((field) => normalizeText(row[field])).filter(Boolean).join(" "),
  };
}

function applyEventCountersFromSignals(authors: GalleryAuthor[], rows: AuthorRow[]) {
  if (!authors.length || !rows.length) return authors;

  const signals = rows.map(eventAuthorSignal).filter((signal) => signal.haystack);
  if (!signals.length) return authors;

  return authors.map((author) => {
    const authorKey = normalizeText(author.name);
    if (!authorKey) return author;

    const linkedCount = signals.filter((signal) => signal.haystack.includes(authorKey)).length;
    const eventCount = Math.max(author.eventCount || 0, linkedCount);

    return {
      ...author,
      eventCount,
      award: getAwardForEventCount(eventCount),
    };
  });
}

function applyPresenceCounters(authors: GalleryAuthor[], rows: AuthorRow[]) {
  if (!authors.length || !rows.length) return authors;

  const counters = new Map<string, Set<string>>();

  rows.forEach((row) => {
    const name = normalizeText(value(row, ["pseudo"]));
    const eventId = value(row, ["event_id"]);
    if (!name) return;
    const key = eventId || `${name}-${counters.get(name)?.size || 0}`;
    if (!counters.has(name)) counters.set(name, new Set());
    counters.get(name)?.add(key);
  });

  if (!counters.size) return authors;

  return authors.map((author) => {
    const authorKey = normalizeText(author.name);
    const presenceCount = counters.get(authorKey)?.size || 0;
    const eventCount = Math.max(author.eventCount || 0, presenceCount);

    return {
      ...author,
      eventCount,
      award: getAwardForEventCount(eventCount),
    };
  });
}

async function enrichAuthorsWithEventCounters(authors: GalleryAuthor[]) {
  if (!supabase || !authors.length) return authors;

  const { data, error } = await supabase
    .from("events")
    .select("author,authors,auteur,auteurs,author_name,authors_names,organizer,organisateur,host,structure")
    .eq("validated", true)
    .eq("rejected", false)
    .limit(500);

  const withEventFields = error ? authors : applyEventCountersFromSignals(authors, (data || []) as AuthorRow[]);

  let presenceResponse = await supabase
    .from("event_authors_presence")
    .select("event_id,pseudo")
    .eq("validated", true)
    .or("rejected.is.null,rejected.eq.false")
    .limit(1000);

  if (presenceResponse.error) {
    presenceResponse = await supabase
      .from("event_authors_presence")
      .select("event_id,pseudo")
      .eq("validated", true)
      .limit(1000);
  }

  if (presenceResponse.error) return withEventFields;

  return applyPresenceCounters(withEventFields, (presenceResponse.data || []) as AuthorRow[]);
}

function getAwardForEventCount(events: number): AuthorAward | undefined {
  if (events >= 100) return { level: "emerald", events };
  if (events >= 50) return { level: "gold", events };
  if (events >= 20) return { level: "silver", events };
  if (events >= 10) return { level: "bronze", events };
  return undefined;
}

function getAwardLabel(award?: AuthorAward) {
  if (!award) return null;
  if (award.level === "emerald") return "Émeraude";
  if (award.level === "gold") return "Or";
  if (award.level === "silver") return "Argent";
  return "Cuivre";
}

export function AuthorsFloatingGallery() {
  const railRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef({ active: false, startX: 0, scrollLeft: 0, lastX: 0, lastTime: 0, velocity: 0 });
  const rafRef = useRef<number | null>(null);
  const [authors, setAuthors] = useState<GalleryAuthor[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAuthors() {
      if (!supabase) {
        setAuthors(TEMP_AUTHOR_FIXTURES);
        setStatus("ready");
        return;
      }

      let foundReadableValidation = false;

      for (const applyValidation of validationAttempts) {
        const query = applyValidation(supabase.from("authors").select("*").limit(80));
        const { data, error } = await query;
        if (cancelled) return;
        if (error) continue;
        foundReadableValidation = true;

        const normalized = ((data || []) as AuthorRow[])
          .map((row, index) => normalizeAuthor(row, index))
          .filter(Boolean) as GalleryAuthor[];

        if (normalized.length) {
          const presencePortraits = await fetchPresencePortraitAuthors();
          const enriched = await enrichAuthorsWithEventCounters(
            dedupeGalleryAuthors([...normalized, ...presencePortraits]),
          );
          if (cancelled) return;
          setAuthors(enriched);
          setStatus("ready");
          return;
        }
      }

      const presencePortraits = await fetchPresencePortraitAuthors();
      if (cancelled) return;

      if (presencePortraits.length) {
        const enriched = await enrichAuthorsWithEventCounters(presencePortraits);
        if (cancelled) return;
        setAuthors(enriched);
        setStatus("ready");
        return;
      }

      setAuthors(TEMP_AUTHOR_FIXTURES);
      setStatus("ready");
    }

    loadAuthors();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const canScroll = useMemo(() => authors.length > 3, [authors.length]);

  function scrollByCard(direction: 1 | -1) {
    railRef.current?.scrollBy({ left: direction * 320, behavior: "smooth" });
  }

  function syncActiveIndex() {
    const rail = railRef.current;
    if (!rail) return;
    const card = rail.querySelector<HTMLElement>(".floating-author-card");
    const step = card ? card.offsetWidth + 26 : 320;
    setActiveIndex(Math.max(0, Math.min(authors.length - 1, Math.round(rail.scrollLeft / step))));
  }

  function handleWheel(event: WheelEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail) return;
    const delta = Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!delta) return;
    event.preventDefault();
    rail.scrollLeft += delta;
    syncActiveIndex();
  }

  function stopInertia() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }

  function applyInertia() {
    const rail = railRef.current;
    if (!rail) return;

    dragRef.current.velocity *= 0.92;
    rail.scrollLeft -= dragRef.current.velocity * 18;

    if (Math.abs(dragRef.current.velocity) > 0.12) {
      rafRef.current = requestAnimationFrame(applyInertia);
    } else {
      rafRef.current = null;
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail) return;
    stopInertia();
    dragRef.current = {
      active: true,
      startX: event.clientX,
      scrollLeft: rail.scrollLeft,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
    };
    rail.setPointerCapture(event.pointerId);
    rail.classList.add("is-dragging");
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || !dragRef.current.active) return;

    const now = performance.now();
    const delta = event.clientX - dragRef.current.startX;
    rail.scrollLeft = dragRef.current.scrollLeft - delta;

    const elapsed = Math.max(16, now - dragRef.current.lastTime);
    dragRef.current.velocity = (event.clientX - dragRef.current.lastX) / elapsed;
    dragRef.current.lastX = event.clientX;
    dragRef.current.lastTime = now;
  }

  function handlePointerEnd(event: PointerEvent<HTMLDivElement>) {
    const rail = railRef.current;
    if (!rail || !dragRef.current.active) return;
    dragRef.current.active = false;
    rail.releasePointerCapture(event.pointerId);
    rail.classList.remove("is-dragging");
    applyInertia();
  }

  return (
    <section className="authors-floating-gallery" aria-label="Auteurs à découvrir">
      <div className="authors-floating-heading">
        <p className="eyebrow">Auteurs Dédicalivres à découvrir</p>
        <h2>Auteurs et contributeurs à Dédicalivres.</h2>
        <p>Les paliers de médaille reconnaissent l’investissement des auteurs qui multiplient les rencontres avec leurs lecteurs.</p>
      </div>

      <div className="authors-floating-shell">
        {canScroll && (
          <div className="authors-floating-controls" aria-label="Navigation galerie auteurs">
            <button type="button" onClick={() => scrollByCard(-1)} aria-label="Auteurs précédents">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={() => scrollByCard(1)} aria-label="Auteurs suivants">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        <div
          ref={railRef}
          className="authors-floating-rail"
          onScroll={syncActiveIndex}
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={(event) => {
            if (dragRef.current.active) handlePointerEnd(event);
          }}
        >
          {status === "ready" && authors.map((author, index) => {
            const offset = Math.max(-4, Math.min(4, index - activeIndex));
            const award = author.award || getAwardForEventCount(author.eventCount || 0);
            const awardLabel = getAwardLabel(award);
            return (
            <article
              className={`floating-author-card ${award ? `author-award-${award.level}` : "author-award-none"} ${index === activeIndex ? "is-center" : ""}`}
              key={author.id}
              style={{
                "--author-offset": offset,
                "--author-depth": Math.abs(offset),
              } as CSSProperties}
            >
              <div className="floating-author-portrait">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={author.photoUrl} alt={author.name} draggable={false} />
                {award && (
                  <div className="portrait-award" aria-label={`${awardLabel}, ${award.events} événements référencés`}>
                    <span className="portrait-award-ribbon" />
                    <small>{award.events} événement{award.events > 1 ? "s" : ""} ajouté{award.events > 1 ? "s" : ""}</small>
                  </div>
                )}
              </div>
              <div className="floating-author-caption">
                <h3>{author.name}</h3>
                <p>{author.meta}</p>
              </div>
            </article>
          )})}

          {status !== "ready" && (
            <div className="authors-gallery-empty">
              <ImageOff size={22} />
              <strong>{status === "loading" ? "Recherche des portraits validés..." : "Aucun portrait auteur validé pour le moment."}</strong>
              <span>La vitrine affichera uniquement les auteurs publics avec photo.</span>
            </div>
          )}
        </div>
      </div>

      <div className="author-award-showcase" aria-label="Modèles de récompenses auteurs">
        <div className="author-award-intro">
          <p className="eyebrow">Récompenses auteurs</p>
          <h3>Reconnaissance d’engagement.</h3>
          <p>Les paliers valorisent l’investissement de chaque auteur à rencontrer ses lecteurs.</p>
        </div>
        <div className="author-award-models">
          {AWARD_MODELS.map((model) => (
            <article className={`author-award-card model-ribbon-${model.key}`} key={model.key}>
              <div className="award-preview-frame">
                <span className="award-photo-ghost" />
                <span className="award-ribbon">{model.level}</span>
              </div>
              <div>
                <span>{model.threshold}</span>
                <strong>{model.title}</strong>
                <p>{model.text}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
