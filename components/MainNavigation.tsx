"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Mail, MapPinned, Search, Sparkles, UserRound } from "lucide-react";

const navItems = [
  { href: "/", label: "Accueil", icon: Home, exact: true },
  { href: "/#carte", label: "Carte", icon: MapPinned },
  { href: "/#agenda", label: "Agenda", icon: CalendarDays, activePaths: ["/evenements"] },
  { href: "/#recherche", label: "Recherche", icon: Search },
  { href: "/#auteurs", label: "Auteurs", icon: UserRound },
  { href: "/#contact", label: "Contact", icon: Mail },
];

function isActive(pathname: string, href: string, exact?: boolean, activePaths: string[] = []) {
  if (activePaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) return true;
  if (href.includes("#")) return false;
  if (exact) return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function MainNavigation() {
  const pathname = usePathname();

  return (
    <>
      <aside className="main-nav-desktop" aria-label="Navigation principale Dédicalivres V2">
        <Link href="/" className="main-nav-brand" aria-label="Retour accueil Dédicalivres">
          <span className="main-nav-brand-mark"><Sparkles size={18} /></span>
          <span><strong>Dédicalivres</strong></span>
        </Link>

        <nav className="main-nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href, item.exact, item.activePaths);
            return (
              <Link href={item.href} className={`main-nav-link${active ? " is-active" : ""}`} key={item.href}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="main-nav-footer" aria-hidden="true" />
      </aside>
    </>
  );
}
