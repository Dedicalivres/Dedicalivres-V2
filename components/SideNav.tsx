"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Feather, Home, Mail, MapPinned, Search, UserRound } from "lucide-react";

const items = [
  { label: "Accueil", icon: Home, href: "#accueil", active: true },
  { label: "Carte", icon: MapPinned, href: "#carte" },
  { label: "Agenda", icon: CalendarDays, href: "#agenda" },
  { label: "Recherche", icon: Search, href: "#recherche" },
  { label: "Auteurs", icon: UserRound, href: "#auteurs" },
  { label: "Contact", icon: Mail, href: "#contact" },
];

function getActiveHash() {
  if (typeof window === "undefined") return "#accueil";
  return items.some((item) => item.href === window.location.hash) ? window.location.hash : "#accueil";
}

export function SideNav() {
  const [activeHash, setActiveHash] = useState("#accueil");

  useEffect(() => {
    const sync = () => setActiveHash(getActiveHash());
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <aside className="side-nav">
      <div>
        <div className="brand-mark">
          <Feather size={42} strokeWidth={1.45} color="#D4B16A" />
        </div>
        <div className="logo-line">DÉDICALIVRES</div>
      </div>
      <nav className="nav-list" aria-label="Navigation principale">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <a className={`nav-item ${activeHash === item.href ? "active" : ""}`} href={item.href} key={item.label}>
              <Icon size={17} strokeWidth={1.55} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
      <div className="nav-footer-actions" aria-label="Actions rapides">
        <a href="#recherche" aria-label="Recherche"><Search size={16} /></a>
        <a href="#agenda" aria-label="Agenda"><CalendarDays size={16} /></a>
        <a href="#auteurs" aria-label="Auteurs"><UserRound size={16} /></a>
      </div>
    </aside>
  );
}
