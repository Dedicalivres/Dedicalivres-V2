"use client";

import { useMemo, useState } from "react";

type RegionId =
  | "bretagne"
  | "normandie"
  | "hauts"
  | "idf"
  | "grand-est"
  | "pays-loire"
  | "centre"
  | "bourgogne"
  | "nouvelle-aquitaine"
  | "occitanie"
  | "aura"
  | "paca";

type Region = {
  id: RegionId;
  label: string;
  subtitle: string;
  events: number;
  authors: number;
  path: string;
};

const regions: Region[] = [
  {
    id: "bretagne",
    label: "Bretagne",
    subtitle: "Festivals, librairies et rencontres côtières",
    events: 18,
    authors: 11,
    path: "M 4.3 184.1 L 107.0 177.4 L 170.5 217.4 L 160.8 290.9 L 43.4 304.2 L 4.3 244.1 Z",
  },
  {
    id: "normandie",
    label: "Normandie",
    subtitle: "Salons et rendez-vous littéraires du nord-ouest",
    events: 14,
    authors: 9,
    path: "M 155.9 124.0 L 336.8 97.3 L 366.1 170.7 L 307.4 217.4 L 170.5 210.8 L 155.9 164.1 Z",
  },
  {
    id: "hauts",
    label: "Hauts-de-France",
    subtitle: "Rencontres, signatures et librairies actives",
    events: 16,
    authors: 13,
    path: "M 331.9 30.6 L 473.7 50.6 L 463.9 144.0 L 371.0 170.7 L 336.8 110.7 Z",
  },
  {
    id: "idf",
    label: "Île-de-France",
    subtitle: "La plus forte densité d’événements",
    events: 42,
    authors: 26,
    path: "M 322.1 164.1 L 424.8 170.7 L 429.7 230.8 L 341.7 244.1 L 312.3 204.1 Z",
  },
  {
    id: "grand-est",
    label: "Grand Est",
    subtitle: "Axes culturels vers l’est et grands salons",
    events: 19,
    authors: 12,
    path: "M 439.5 137.4 L 659.5 164.1 L 630.2 277.5 L 522.6 310.9 L 410.1 230.8 L 424.8 170.7 Z",
  },
  {
    id: "pays-loire",
    label: "Pays de la Loire",
    subtitle: "Rendez-vous littéraires de l’ouest",
    events: 11,
    authors: 7,
    path: "M 141.2 250.8 L 287.9 244.1 L 317.2 310.9 L 258.5 357.6 L 170.5 364.3 L 131.4 310.9 Z",
  },
  {
    id: "centre",
    label: "Centre-Val de Loire",
    subtitle: "Rencontres d’auteurs et lieux patrimoniaux",
    events: 12,
    authors: 8,
    path: "M 278.1 210.8 L 356.3 230.8 L 429.7 250.8 L 424.8 364.3 L 307.4 377.6 L 253.7 337.6 Z",
  },
  {
    id: "bourgogne",
    label: "Bourgogne-Franche-Comté",
    subtitle: "Patrimoine, librairies et grands axes de l’est",
    events: 13,
    authors: 8,
    path: "M 424.8 230.8 L 537.3 290.9 L 595.9 364.3 L 522.6 391.0 L 424.8 364.3 Z",
  },
  {
    id: "nouvelle-aquitaine",
    label: "Nouvelle-Aquitaine",
    subtitle: "Bordeaux, Angoulême, salons et festivals",
    events: 31,
    authors: 18,
    path: "M 170.5 357.6 L 307.4 377.6 L 331.9 471.1 L 287.9 551.2 L 185.2 564.5 L 195.0 404.3 Z",
  },
  {
    id: "occitanie",
    label: "Occitanie",
    subtitle: "Du livre jeunesse aux grands festivals du sud",
    events: 22,
    authors: 15,
    path: "M 287.9 551.2 L 331.9 471.1 L 429.7 464.4 L 483.5 544.5 L 385.7 617.9 L 273.2 604.6 Z",
  },
  {
    id: "aura",
    label: "Auvergne-Rhône-Alpes",
    subtitle: "Lyon, Alpes et rencontres denses toute l’année",
    events: 27,
    authors: 21,
    path: "M 424.8 364.3 L 527.5 391.0 L 595.9 364.3 L 600.8 471.1 L 512.8 511.1 L 429.7 464.4 Z",
  },
  {
    id: "paca",
    label: "Provence-Alpes-Côte d’Azur",
    subtitle: "Marseille, Nice et rendez-vous méditerranéens",
    events: 17,
    authors: 10,
    path: "M 512.8 511.1 L 630.2 504.5 L 625.3 551.2 L 576.4 577.9 L 493.3 571.2 L 483.5 544.5 Z",
  },
];

const eventPins = [
  { city: "Rennes", region: "Bretagne", x: 176.5, y: 236.3, count: 5 },
  { city: "Paris", region: "Île-de-France", x: 373.6, y: 187.0, count: 42 },
  { city: "Lille", region: "Hauts-de-France", x: 408.0, y: 68.7, count: 7 },
  { city: "Bordeaux", region: "Nouvelle-Aquitaine", x: 230.2, y: 455.2, count: 12 },
  { city: "Lyon", region: "Auvergne-Rhône-Alpes", x: 495.0, y: 393.4, count: 16 },
  { city: "Toulouse", region: "Occitanie", x: 329.2, y: 537.5, count: 9 },
  { city: "Marseille", region: "Provence-Alpes-Côte d’Azur", x: 521.1, y: 558.1, count: 8 },
  { city: "Nantes", region: "Pays de la Loire", x: 182.6, y: 296.3, count: 4 },
  { city: "Strasbourg", region: "Grand Est", x: 637.6, y: 205.9, count: 8 },
];

const mainlandPath = "M 434.0 85.4 L 468.1 116.8 L 493.2 111.6 L 536.0 142.1 L 546.9 147.9 L 561.0 146.4 L 584.1 163.9 L 654.6 176.2 L 629.9 221.9 L 623.6 269.5 L 610.2 280.9 L 587.9 274.7 L 589.5 291.7 L 553.8 329.2 L 553.0 359.4 L 576.4 349.0 L 593.2 378.2 L 591.2 397.1 L 605.6 422.2 L 588.6 442.5 L 601.2 494.1 L 627.7 502.6 L 622.1 531.6 L 577.8 569.3 L 481.4 551.2 L 410.1 572.9 L 404.6 613.0 L 347.9 621.7 L 292.9 591.5 L 275.1 605.9 L 185.1 575.6 L 165.6 549.7 L 190.9 509.6 L 200.2 376.6 L 149.7 306.6 L 113.7 272.8 L 38.9 247.2 L 34.0 198.5 L 97.4 184.0 L 179.5 201.1 L 164.0 125.6 L 210.2 154.2 L 324.0 102.2 L 338.7 47.5 L 381.5 34.0 L 388.5 57.5 L 411.3 58.6 L 434.0 85.4 Z";
const corsicaPath = "M 726.0 634.4 L 709.9 686.0 L 687.7 672.4 L 676.3 627.5 L 686.2 602.7 L 717.7 577.2 L 726.0 634.4 Z";

export function ImmersiveMap() {
  const [selectedRegion, setSelectedRegion] = useState<RegionId>("nouvelle-aquitaine");
  const [hoveredRegion, setHoveredRegion] = useState<RegionId | null>(null);

  const activeRegion = useMemo(
    () => regions.find((region) => region.id === (hoveredRegion ?? selectedRegion)) ?? regions[0],
    [hoveredRegion, selectedRegion]
  );

  return (
    <section className="section map-section france-real-section" id="carte">
      <div className="section-header map-heading">
        <div>
          <p className="eyebrow">France littéraire vivante</p>
          <h2>Une carte claire, réelle et interactive.</h2>
        </div>
        <p className="section-note">Contours issus d’une base GeoJSON France réelle, habillés en Émeraude Prestige.</p>
      </div>

      <div className="real-map-panel" aria-label="Carte réelle de France interactive par régions">
        <div className="real-map-layout">
          <div className="real-map-stage">
            <div className="real-map-grid" />
            <div className="real-map-light" />
            <svg className="real-france-svg" viewBox="0 0 760 720" role="img" aria-label="Carte réelle de France avec régions littéraires">
              <defs>
                <clipPath id="franceMainClip">
                  <path d={mainlandPath} />
                </clipPath>
                <filter id="realMapGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#d4b16a" floodOpacity=".28" />
                  <feDropShadow dx="0" dy="0" stdDeviation="10" floodColor="#1aa37a" floodOpacity=".20" />
                </filter>
                <linearGradient id="realRegionFill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#0b241d" />
                  <stop offset=".55" stopColor="#0f6b5a" />
                  <stop offset="1" stopColor="#06100d" />
                </linearGradient>
                <linearGradient id="realRegionActiveFill" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#44d6a9" />
                  <stop offset=".5" stopColor="#1aa37a" />
                  <stop offset="1" stopColor="#0f6b5a" />
                </linearGradient>
              </defs>

              <path d={mainlandPath} className="real-france-shadow" />
              <path d={mainlandPath} className="real-france-base" />

              <g clipPath="url(#franceMainClip)" filter="url(#realMapGlow)">
                {regions.map((region) => (
                  <path
                    key={region.id}
                    d={region.path}
                    className={`real-region ${activeRegion.id === region.id ? "active" : ""}`}
                    onPointerEnter={() => setHoveredRegion(region.id)}
                    onPointerLeave={() => setHoveredRegion(null)}
                    onClick={() => setSelectedRegion(region.id)}
                  />
                ))}
              </g>

              <path d={mainlandPath} className="real-france-outline" />
              <path d={corsicaPath} className="real-corsica" />

              {eventPins.map((pin) => (
                <g key={pin.city} className={`real-event-pin ${pin.region === activeRegion.label ? "active" : ""}`} transform={`translate(${pin.x} ${pin.y})`}>
                  <circle r="16" className="real-pin-halo" />
                  <circle r="5" className="real-pin-dot" />
                  <text x="14" y="5">{pin.city}</text>
                </g>
              ))}
            </svg>
          </div>

          <aside className="real-region-panel">
            <span>Région active</span>
            <h3>{activeRegion.label}</h3>
            <p>{activeRegion.subtitle}</p>
            <div className="real-region-stats">
              <strong>{activeRegion.events}<small>rencontres</small></strong>
              <strong>{activeRegion.authors}<small>auteurs</small></strong>
              <strong>{Math.max(3, Math.round(activeRegion.events / 4))}<small>salons</small></strong>
            </div>
            <button type="button">Explorer cette région →</button>
          </aside>
        </div>
      </div>
    </section>
  );
}
