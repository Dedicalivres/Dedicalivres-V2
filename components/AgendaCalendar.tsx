"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { countryName, eventCountryCode } from "@/lib/francophone";

type AgendaEvent = {
  id?: string;
  slug?: string;
  title: string;
  city: string;
  region: string;
  countryCode: string;
  country: string;
  type: string;
  date: string;
  endDate?: string;
};

type EventRow = Record<string, unknown>;

const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });
const compactFormatter = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
const legendItems = [
  { label: "Salon", className: "is-salon" },
  { label: "Festival", className: "is-festival" },
  { label: "Dédicace", className: "is-dedicace" },
];

function pickString(row: EventRow, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return fallback;
}

function isPublicEvent(row: EventRow) {
  const marker = row.validated ?? row.is_validated ?? row.approved ?? row.is_approved ?? row.published ?? row.is_published;
  const rejected = row.rejected ?? row.is_rejected;
  if (rejected === true) return false;
  if (typeof rejected === "string" && ["true", "1", "yes", "rejected", "refuse", "refusé"].includes(rejected.toLowerCase())) return false;
  if (typeof marker === "boolean") return marker;
  if (typeof marker === "string") return ["true", "1", "yes", "validated", "approved", "published", "public"].includes(marker.toLowerCase());
  return true;
}

function toIsoDate(value: string) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function normalizeEvent(row: EventRow): AgendaEvent | null {
  if (!isPublicEvent(row)) return null;
  const date = toIsoDate(pickString(row, ["start_date", "date", "event_date", "starts_at", "date_start", "begin_date"]));
  if (!date) return null;
  const title = pickString(row, ["title", "name", "event_name", "nom"], "Rencontre littéraire");
  const city = pickString(row, ["city", "ville", "location", "lieu"], "Lieu à confirmer");
  return {
    id: pickString(row, ["id", "event_id"]) || undefined,
    slug: pickString(row, ["slug"]) || undefined,
    title,
    city,
    region: pickString(row, ["region_name", "region"], "Territoire à confirmer"),
    countryCode: eventCountryCode(row),
    country: countryName(eventCountryCode(row)),
    type: pickString(row, ["type", "category", "event_type"], "rencontre").toLowerCase(),
    date,
    endDate: toIsoDate(pickString(row, ["end_date", "date_end", "ends_at"])) || undefined,
  };
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function isoFromDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function eventHref(event: AgendaEvent) {
  const target = event.id || event.slug;
  return target ? `/evenements/${encodeURIComponent(target)}` : `/evenements?q=${encodeURIComponent(event.title)}`;
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date; inMonth: boolean }> = [];

  for (let i = leading; i > 0; i -= 1) {
    cells.push({ date: new Date(year, month, 1 - i), inMonth: false });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), inMonth: true });
  }

  while (cells.length % 7 !== 0 || cells.length < 35) {
    cells.push({ date: addDays(cells[cells.length - 1].date, 1), inMonth: false });
  }

  return cells;
}

function typeClass(type: string) {
  const normalized = type.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.includes("festival")) return "is-festival";
  if (normalized.includes("salon")) return "is-salon";
  if (normalized.includes("dedic")) return "is-dedicace";
  return "is-rencontre";
}

function hasVisibleTypeDot(type: string) {
  return typeClass(type) !== "is-rencontre";
}

export function AgendaCalendar() {
  const today = useMemo(() => new Date(), []);
  const todayIso = isoFromDate(today);
  const tomorrowIso = isoFromDate(addDays(today, 1));
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [pinnedDate, setPinnedDate] = useState("");
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [source, setSource] = useState<"loading" | "live" | "empty">("loading");

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      if (!supabase) {
        setEvents([]);
        setSource("empty");
        return;
      }

      const { data, error } = await supabase.from("events").select("*").eq("validated", true).eq("rejected", false).limit(500);
      if (cancelled) return;

      if (error) {
        console.warn("[Dédicalivres V2] Agenda Supabase indisponible.", error);
        setEvents([]);
        setSource("empty");
        return;
      }

      const normalized = ((data || []) as EventRow[])
        .map(normalizeEvent)
        .filter(Boolean) as AgendaEvent[];

      if (normalized.length) {
        setEvents(normalized.sort((a, b) => a.date.localeCompare(b.date)));
        setSource("live");
      } else {
        setEvents([]);
        setSource("empty");
      }
    }

    loadEvents();
    return () => {
      cancelled = true;
    };
  }, []);

  const monthCells = useMemo(() => getMonthDays(monthDate), [monthDate]);
  const eventsByDate = useMemo(() => {
    const groups = new Map<string, AgendaEvent[]>();
    events.forEach((event) => {
      const dates = [event.date];
      if (event.endDate && event.endDate !== event.date) {
        let cursor = new Date(event.date);
        const end = new Date(event.endDate);
        while (cursor < end) {
          cursor = addDays(cursor, 1);
          dates.push(isoFromDate(cursor));
        }
      }
      dates.forEach((date) => groups.set(date, [...(groups.get(date) || []), event]));
    });
    return groups;
  }, [events]);

  const selectedEvents = eventsByDate.get(selectedDate) || [];
  const monthEvents = monthCells.reduce((total, cell) => total + (cell.inMonth ? eventsByDate.get(isoFromDate(cell.date))?.length || 0 : 0), 0);

  function moveMonth(amount: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  function jumpTo(date: Date) {
    setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDate(isoFromDate(date));
    setPinnedDate("");
  }

  function selectDate(iso: string, hasEvents: boolean) {
    setSelectedDate(iso);
    setPinnedDate((current) => (hasEvents ? (current === iso ? "" : iso) : ""));
  }

  return (
    <section className="agenda-calendar" aria-label="Calendrier de vos rencontres">
      <div className="agenda-calendar-header">
        <div>
          <p className="eyebrow">Agenda</p>
          <h2>Calendrier de vos rencontres</h2>
        </div>
        <div className="agenda-month-control">
          <button type="button" onClick={() => moveMonth(-1)} aria-label="Mois précédent">
            <ChevronLeft size={22} />
          </button>
          <strong>{monthFormatter.format(monthDate)}</strong>
          <button type="button" onClick={() => moveMonth(1)} aria-label="Mois suivant">
            <ChevronRight size={22} />
          </button>
        </div>
      </div>

      <div className="agenda-quick-actions" aria-label="Raccourcis calendrier">
        <button type="button" onClick={() => jumpTo(today)}>Aujourd’hui</button>
        <button type="button" onClick={() => jumpTo(addDays(today, 1))}>Demain</button>
        <button type="button" onClick={() => setMonthDate(new Date(today.getFullYear(), today.getMonth(), 1))}>Ce mois-ci</button>
        <a className="agenda-full-link" href="/evenements">
          Ouvrir l’agenda complet <CalendarDays size={15} />
        </a>
      </div>

      <div className="agenda-legend" aria-label="Légende des types d’événements">
        {legendItems.map((item) => (
          <span key={item.label}>
            <i className={item.className} />
            {item.label}
          </span>
        ))}
      </div>

      <div className="agenda-calendar-layout">
        <div className="agenda-grid-panel">
          <div className="agenda-weekdays">
            {dayLabels.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="agenda-month-grid">
            {monthCells.map((cell) => {
              const iso = isoFromDate(cell.date);
              const dayEvents = eventsByDate.get(iso) || [];
              const isSelected = selectedDate === iso;
              const isPinned = pinnedDate === iso;
              const isToday = todayIso === iso;
              const dayOfWeek = (cell.date.getDay() + 6) % 7;
              if (!cell.inMonth) {
                return <div className="agenda-day-shell is-empty" aria-hidden="true" key={iso} />;
              }
              return (
                <div
                  className={`agenda-day-shell ${dayEvents.length ? "has-events has-count-badge" : ""} ${isSelected ? "is-selected" : ""} ${isPinned ? "is-pinned" : ""} ${isToday ? "is-today" : ""} ${dayOfWeek > 4 ? "tooltip-left" : ""}`}
                  key={iso}
                >
                <div
                  role="button"
                  tabIndex={0}
                  className="agenda-day"
                  onClick={() => selectDate(iso, dayEvents.length > 0)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      selectDate(iso, dayEvents.length > 0);
                    }
                  }}
                  key={iso}
                >
                  <span className="agenda-day-number">{cell.date.getDate()}</span>
                  {dayEvents.length > 0 && <span className="agenda-day-count">{dayEvents.length}</span>}
                  <span className="agenda-day-dots">
                    {dayEvents.filter((event) => hasVisibleTypeDot(event.type)).slice(0, 3).map((event, index) => (
                      <i className={typeClass(event.type)} key={`${event.title}-${index}`} />
                    ))}
                  </span>
                </div>
                  {dayEvents.length > 0 && (
                    <span className="agenda-hover-card" aria-hidden={!isPinned}>
                      <span className="agenda-hover-date">{compactFormatter.format(cell.date)}</span>
                      {dayEvents.map((event) => (
                        <a className="agenda-hover-event" href={eventHref(event)} key={`${event.title}-${event.city}`}>
                          {hasVisibleTypeDot(event.type) ? <i className={typeClass(event.type)} /> : <i className="is-neutral" />}
                          <strong>{event.title}</strong>
                          <small>{event.city} · {event.country}</small>
                        </a>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <aside className="agenda-day-panel">
          <div className="agenda-day-panel-head">
            <span>{compactFormatter.format(new Date(selectedDate))}</span>
            <strong>{selectedEvents.length || "Aucun"} événement{selectedEvents.length > 1 ? "s" : ""}</strong>
          </div>
          <div className="agenda-day-events">
            {selectedEvents.length ? selectedEvents.map((event) => (
              <a className="agenda-event-row" href={eventHref(event)} key={`${event.title}-${event.city}-${event.date}`}>
                <span className={`agenda-type-dot ${typeClass(event.type)}`} />
                <strong>{event.title}</strong>
                <small><MapPin size={13} /> {event.city} · {event.country}</small>
              </a>
            )) : (
              <div className="agenda-empty">
                <Sparkles size={18} />
                <span>Sélectionnez une date marquée pour explorer les rencontres.</span>
              </div>
            )}
          </div>
          <div className="agenda-status">
            <CalendarDays size={15} />
            <span>{monthEvents} rencontre{monthEvents > 1 ? "s" : ""} ce mois</span>
          </div>
        </aside>
      </div>
    </section>
  );
}
