"use client";

import { useEffect, useState } from "react";
import { ArrowRight, AtSign, CalendarDays, Filter, Globe2, Mail, MapPin, MessageSquare, Search, Send } from "lucide-react";
import dynamic from "next/dynamic";
import { AgendaCalendar } from "@/components/AgendaCalendar";
import { AuthorsFloatingGallery } from "@/components/AuthorsFloatingGallery";
import { LivingBook } from "@/components/LivingBook";
import { supabase } from "@/lib/supabaseClient";
import { FRANCOPHONE_COUNTRIES } from "@/lib/francophone";

const ImmersiveMap = dynamic(
  () => import("@/components/ImmersiveMap").then((mod) => ({ default: mod.ImmersiveMap })),
  {
    ssr: false,
    loading: () => (
      <div className="immersive-map-loading">
        <span>Chargement de la carte…</span>
      </div>
    ),
  }
);

const tabIds = ["accueil", "recherche", "agenda", "auteurs", "carte", "contact"] as const;
type TabId = typeof tabIds[number];

type SearchSuggestionState = {
  terms: string[];
  cities: string[];
  regions: string[];
};

function getHashTab(): TabId {
  if (typeof window === "undefined") return "accueil";
  const hash = window.location.hash.replace("#", "");
  return tabIds.includes(hash as TabId) ? (hash as TabId) : "accueil";
}

function SearchTab() {
  const [suggestions, setSuggestions] = useState<SearchSuggestionState>({ terms: [], cities: [], regions: [] });

  useEffect(() => {
    let cancelled = false;

    async function loadSuggestions() {
      if (!supabase) return;

      const { data, error } = await supabase
        .from("events")
        .select("title,name,event_title,titre,city,ville,location,lieu,region,region_name,country_code")
        .eq("validated", true)
        .eq("rejected", false)
        .limit(300);

      if (cancelled || error || !data) return;

      const rows = data as Record<string, unknown>[];
      const { data: presenceData } = await supabase
        .from("event_authors_presence")
        .select("pseudo")
        .eq("validated", true)
        .limit(1000);

      if (cancelled) return;

      const presenceRows = (presenceData || []) as Record<string, unknown>[];
      const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean))).sort((a, b) => a.localeCompare(b, "fr"));
      const pick = (row: Record<string, unknown>, keys: string[]) => {
        for (const key of keys) {
          const current = row[key];
          if (current !== null && current !== undefined && String(current).trim()) return String(current);
        }
        return "";
      };

      setSuggestions({
        terms: unique([
          ...rows.map((row) => pick(row, ["title", "name", "event_title", "titre"])),
          ...presenceRows.map((row) => pick(row, ["pseudo"])),
        ]).slice(0, 100),
        cities: unique(rows.map((row) => pick(row, ["city", "ville", "location", "lieu"]))).slice(0, 80),
        regions: unique(rows.map((row) => pick(row, ["region", "region_name"]))).slice(0, 40),
      });
    }

    loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="app-tab-panel search-tab" id="recherche" aria-labelledby="tab-recherche-title">
      <div className="tab-heading">
        <p className="eyebrow">Recherche</p>
        <h2 id="tab-recherche-title">Trouver une rencontre littéraire.</h2>
        <p>Recherchez par mot-clé, type, pays, territoire ou ville dans l'agenda francophone partagé.</p>
      </div>

      <form className="tab-search-form" action="/evenements" method="get">
        <div className="tab-search-main">
          <Search size={20} />
          <input name="q" list="home-search-suggestions" placeholder="Auteur, ville, salon, festival..." />
          <datalist id="home-search-suggestions">
            {[...suggestions.terms, ...suggestions.cities].map((suggestion) => (
              <option key={suggestion} value={suggestion} />
            ))}
          </datalist>
        </div>
        <label>
          <Filter size={17} />
          <select name="type" defaultValue="">
            <option value="">Tous les types</option>
            <option value="salon">Salon</option>
            <option value="festival">Festival</option>
            <option value="dedicace">Dédicace</option>
            <option value="rencontre">Rencontre</option>
          </select>
        </label>
        <label>
          <Globe2 size={17} />
          <select name="country" defaultValue="">
            <option value="">Tous les pays</option>
            {FRANCOPHONE_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>{country.flag} {country.name}</option>
            ))}
          </select>
        </label>
        <label>
          <MapPin size={17} />
          <input name="region" list="home-region-suggestions" placeholder="Région / canton" />
          <datalist id="home-region-suggestions">
            {suggestions.regions.map((region) => (
              <option key={region} value={region} />
            ))}
          </datalist>
        </label>
        <label>
          <MapPin size={17} />
          <input name="city" list="home-city-suggestions" placeholder="Ville" />
          <datalist id="home-city-suggestions">
            {suggestions.cities.map((city) => (
              <option key={city} value={city} />
            ))}
          </datalist>
        </label>
        <button type="submit" className="primary-cta">
          Rechercher <ArrowRight size={17} />
        </button>
      </form>

      <div className="search-shortcuts" aria-label="Raccourcis de recherche">
        {[
          { label: "🇫🇷 France", href: "/evenements?country=FR" },
          { label: "🇧🇪 Belgique", href: "/evenements?country=BE" },
          { label: "🇱🇺 Luxembourg", href: "/evenements?country=LU" },
          { label: "🇨🇭 Suisse", href: "/evenements?country=CH" },
          { label: "Dédicaces", href: "/evenements?type=dedicace" },
        ].map((shortcut) => (
          <a href={shortcut.href} key={shortcut.href}>{shortcut.label}</a>
        ))}
      </div>
    </section>
  );
}

function AgendaTab() {
  return (
    <section className="app-tab-panel agenda-tab" id="agenda" aria-labelledby="tab-agenda-title">
      <AgendaCalendar />
    </section>
  );
}

function ContactTab() {
  return (
    <section className="app-tab-panel contact-tab" id="contact" aria-labelledby="tab-contact-title">
      <div className="tab-heading">
        <p className="eyebrow">Contact & livre d'or</p>
        <h2 id="tab-contact-title">Restons en lien avec les lecteurs.</h2>
        <p>Les coordonnées passent avant la prise de parole : contact direct, Instagram, puis retour d'expérience.</p>
      </div>

      <div className="contact-tab-grid">
        <div className="contact-card main-contact-card">
          <a href="mailto:dedicalivres@gmail.com">
            <Mail size={19} />
            dedicalivres@gmail.com
          </a>
          <a href="https://www.instagram.com/dedicalivres/" target="_blank" rel="noreferrer">
            <AtSign size={19} />
            @dedicalivres
          </a>
        </div>

        <form className="contact-card survey-card">
          <h3>Sondage rapide</h3>
          <label>
            <span>Ce que vous cherchez en priorité</span>
            <select defaultValue="">
              <option value="" disabled>Choisir</option>
              <option>Des dédicaces proches de moi</option>
              <option>Des salons et festivals</option>
              <option>Des auteurs à suivre</option>
              <option>Une carte très précise</option>
            </select>
          </label>
          <label>
            <span>Votre territoire</span>
            <input placeholder="Ex. Bretagne, Liège, canton de Vaud..." />
          </label>
          <button type="button">
            <Send size={16} />
            Prévisualiser l'envoi
          </button>
        </form>

        <form className="contact-card guestbook-card">
          <h3>Livre d'or</h3>
          <label>
            <span>Votre message</span>
            <textarea rows={5} placeholder="Une suggestion, une ville à ajouter, un retour..." />
          </label>
          <button type="button">
            <MessageSquare size={16} />
            Laisser un mot
          </button>
        </form>
      </div>
    </section>
  );
}

export function HomeTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("accueil");

  useEffect(() => {
    const sync = () => setActiveTab(getHashTab());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  }, [activeTab]);

  return (
    <div className="tab-dashboard" data-active-tab={activeTab}>
      {activeTab === "accueil" && (
        <section className="hero dashboard-panel app-tab-panel is-hero-tab" id="accueil">
          <div className="hero-frame" />
          <div className="hero-copy">
            <h1>
              Découvrez les
              <br />
              <span className="emerald-word">rencontres</span>
              <br />
              qui donnent vie
              <br />
              aux livres.
            </h1>
            <p className="lead">Salons, dédicaces, auteurs et festivals dans l'espace francophone.</p>
            <div className="cta-row">
              <a className="primary-cta" href="#recherche">
                Rechercher <Search size={18} />
              </a>
              <a className="secondary-link" href="#agenda">
                <CalendarDays size={15} />Voir l'agenda
              </a>
            </div>
          </div>
          <LivingBook />
        </section>
      )}

      {activeTab === "recherche" && <SearchTab />}
      {activeTab === "agenda" && <AgendaTab />}
      {activeTab === "auteurs" && (
        <section className="app-tab-panel authors-tab">
          <AuthorsFloatingGallery />
        </section>
      )}
      {activeTab === "carte" && (
        <section className="app-tab-panel map-tab">
          <ImmersiveMap />
        </section>
      )}
      {activeTab === "contact" && <ContactTab />}
    </div>
  );
}
