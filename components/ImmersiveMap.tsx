"use client";

function getEventHref(event: any) {
  const id = event?.id || event?.event_id || event?.uuid;
  if (id) return `/evenements/${encodeURIComponent(String(id))}`;

  const slug = String(event?.slug || event?.title || event?.name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug ? `/evenements/${encodeURIComponent(slug)}` : null;
}

function openEventPage(event: any) {
  const href = getEventHref(event);
  if (href && typeof window !== "undefined") {
    window.location.href = href;
  }
}



import { type CSSProperties, type PointerEvent, useEffect, useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import { DEPARTMENTS, MAP_VIEWBOX, REGIONS, type MapEvent } from "./mapData";
import { supabase } from "@/lib/supabaseClient";

type Level = "france" | "region" | "department" | "city";

type MapFlowLink = {
  key: string;
  d: string;
  strength: number;
  delay: number;
};

type CityLandmark = {
  key: string;
  label: string;
  x: number;
  y: number;
  hasEvents: boolean;
  events: MapEvent[];
};

type RegionalCityLandmark = CityLandmark & {
  department: string;
  region: string;
  events: MapEvent[];
};

type TerrainProfile = {
  relief: string;
  signature: string;
  details: string[];
};

type RegionCode = (typeof REGIONS)[number]["code"];
type DepartmentCode = (typeof DEPARTMENTS)[number]["code"];

const regionByCode = new Map(REGIONS.map((region) => [region.code, region]));
const departmentByCode = new Map(DEPARTMENTS.map((department) => [department.code, department]));

const DEFAULT_TERRAIN_PROFILE: TerrainProfile = {
  relief: "Territoire équilibré",
  signature: "Lecture régionale",
  details: ["Villes repères", "Réseau d'événements", "Départements actifs"],
};

const REGION_TERRAIN_PROFILES: Record<string, TerrainProfile> = {
  "11": { relief: "Bassin urbain", signature: "Centralité métropolitaine", details: ["Paris", "Couronne dense", "Réseau très concentré"] },
  "24": { relief: "Vallée et plateaux", signature: "Loire structurante", details: ["Val de Loire", "Plateaux doux", "Axes patrimoniaux"] },
  "27": { relief: "Plateaux et Jura", signature: "Relief oriental", details: ["Morvan", "Doubs", "Contreforts jurassiens"] },
  "28": { relief: "Littoral et bocage", signature: "Façade Manche", details: ["Côte", "Pays d'Auge", "Vallée de Seine"] },
  "32": { relief: "Plaines du nord", signature: "Réseau frontalier", details: ["Lille", "Littoral", "Bassin minier"] },
  "44": { relief: "Vosges et plaine rhénane", signature: "Relief d'est", details: ["Vosges", "Alsace", "Champagne"] },
  "52": { relief: "Atlantique et vallées", signature: "Façade ouest", details: ["Loire", "Nantes", "Vendée"] },
  "53": { relief: "Péninsule armoricaine", signature: "Littoral dense", details: ["Bretagne nord", "Morbihan", "Rennes"] },
  "75": { relief: "Atlantique et Massif central", signature: "Grande région contrastée", details: ["Bordeaux", "Limousin", "Pyrénées nord"] },
  "76": { relief: "Pyrénées et Méditerranée", signature: "Arc sud", details: ["Toulouse", "Littoral", "Pyrénées"] },
  "84": { relief: "Alpes et Massif central", signature: "Puissance alpine", details: ["Lyon", "Grenoble", "Auvergne"] },
  "93": { relief: "Alpes du Sud et Méditerranée", signature: "Relief lumineux", details: ["Marseille", "Nice", "Préalpes"] },
  "94": { relief: "Relief insulaire", signature: "Montagne corse", details: ["Ajaccio", "Littoral", "Chaîne centrale"] },
};

const REGION_OVERLAY_OFFSETS: Record<string, { x: number; y: number }> = {
  "11": { x: -3.2, y: -2.2 },
  "24": { x: -4.4, y: 3.8 },
  "27": { x: 7.6, y: -1.8 },
  "28": { x: -7.8, y: -6.1 },
  "32": { x: 4.8, y: -7.6 },
  "44": { x: 8.8, y: 0.8 },
  "52": { x: -10.8, y: 4.5 },
  "53": { x: -12.4, y: -0.6 },
  "75": { x: -8.6, y: 9.1 },
  "76": { x: 2.2, y: 11.2 },
  "84": { x: 8.4, y: 6.2 },
  "93": { x: 10.2, y: 10.3 },
  "94": { x: 8.6, y: 3.8 },
};

const departmentNameToCode = new Map(
  DEPARTMENTS.map((department) => [
    department.name.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(),
    department.code,
  ]),
);

function normalizeDepartmentCode(value: string): DepartmentCode | "" {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (DEPARTMENTS.some((department) => department.code === upper)) return upper as DepartmentCode;
  if (/^\d$/.test(raw)) return `0${raw}` as DepartmentCode;
  if (/^\d{2}$/.test(raw) && DEPARTMENTS.some((department) => department.code === raw)) return raw as DepartmentCode;
  return departmentNameToCode.get(raw.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()) as DepartmentCode | undefined || "";
}

function getPathCenter(path?: string) {
  if (!path) return null;
  const bounds = getPathBounds(path);
  return { x: bounds.cx, y: bounds.cy };
}

function getEventCenter(eventList: MapEvent[]) {
  if (!eventList.length) return null;

  return {
    x: eventList.reduce((total, event) => total + event.x, 0) / eventList.length,
    y: eventList.reduce((total, event) => total + event.y, 0) / eventList.length,
  };
}

function getBalancedEventCenter(eventList: MapEvent[], path?: string) {
  const eventCenter = getEventCenter(eventList);
  const territoryCenter = getPathCenter(path);

  if (!eventCenter) return territoryCenter;
  if (!territoryCenter) return eventCenter;

  return {
    x: eventCenter.x * 0.56 + territoryCenter.x * 0.44,
    y: eventCenter.y * 0.56 + territoryCenter.y * 0.44,
  };
}

function getPathBounds(path: string) {
  const values = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  const xs: number[] = [];
  const ys: number[] = [];

  for (let index = 0; index < values.length - 1; index += 2) {
    xs.push(values[index]);
    ys.push(values[index + 1]);
  }

  if (!xs.length || !ys.length) {
    return { minX: 0, minY: 0, maxX: 860, maxY: 760, width: 860, height: 760, cx: 430, cy: 380 };
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    cx: minX + (maxX - minX) / 2,
    cy: minY + (maxY - minY) / 2,
  };
}

function getCameraView(path?: string, intensity: "france" | "region" | "department" = "france") {
  if (!path || intensity === "france") {
    return { transform: "translate(0px, 0px) scale(1)", scale: 1, tx: 0, ty: 0 };
  }

  const bounds = getPathBounds(path);
  const padding = intensity === "department" ? 46 : 68;
  const maxScale = intensity === "department" ? 5.25 : 3.05;
  const scale = Math.min(maxScale, Math.max(1, Math.min(860 / (bounds.width + padding), 760 / (bounds.height + padding))));
  const tx = 430 - bounds.cx * scale;
  const ty = 380 - bounds.cy * scale;

  return { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, scale, tx, ty };
}

function getPointCameraView(point?: { x: number; y: number } | null) {
  if (!point) return { transform: "translate(0px, 0px) scale(1)", scale: 1, tx: 0, ty: 0 };
  const scale = 5.4;
  const tx = 430 - point.x * scale;
  const ty = 380 - point.y * scale;
  return { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, scale, tx, ty };
}



function getMarkerVisualScale(level: Level) {
  if (level === "france") return 1;
  if (level === "region") return 2.2;
  if (level === "department") return 3.35;
  return 4.15;
}

function getRegionStats(eventList: MapEvent[], regionCode?: string) {
  const events = regionCode ? eventList.filter((event) => event.region === regionCode) : eventList;
  const departments = regionCode ? DEPARTMENTS.filter((department) => department.region === regionCode) : DEPARTMENTS;
  const authors = events.reduce((total, event) => total + event.authors, 0);
  const salons = Math.max(2, Math.round(events.length / 2));

  return {
    events: events.length,
    authors,
    salons,
    departments: departments.length,
  };
}

function getDepartmentStats(eventList: MapEvent[], departmentCode?: string) {
  const events = departmentCode ? eventList.filter((event) => event.department === departmentCode) : [];
  const authors = events.reduce((total, event) => total + event.authors, 0);

  return {
    events: events.length,
    authors,
    salons: Math.max(1, Math.round(events.length / 2)),
  };
}

function getCityStats(eventList: MapEvent[], city?: string) {
  const events = city ? eventList.filter((event) => toKey(event.city) === toKey(city)) : [];
  const authors = events.reduce((total, event) => total + event.authors, 0);
  const salons = events.filter((event) => event.type === "salon" || event.type === "festival").length;

  return {
    events: events.length,
    authors,
    salons,
  };
}

const CITY_FALLBACKS: Record<string, { lat: number; lon: number; department: DepartmentCode; region: RegionCode }> = {
  "paris": { lat: 48.8566, lon: 2.3522, department: "75", region: "11" },
  "rennes": { lat: 48.1173, lon: -1.6778, department: "35", region: "53" },
  "saint-malo": { lat: 48.6493, lon: -2.0257, department: "35", region: "53" },
  "nantes": { lat: 47.2184, lon: -1.5536, department: "44", region: "52" },
  "bordeaux": { lat: 44.8378, lon: -0.5792, department: "33", region: "75" },
  "lille": { lat: 50.6292, lon: 3.0573, department: "59", region: "32" },
  "lyon": { lat: 45.764, lon: 4.8357, department: "69", region: "84" },
  "marseille": { lat: 43.2965, lon: 5.3698, department: "13", region: "93" },
  "nice": { lat: 43.7102, lon: 7.262, department: "06", region: "93" },
  "toulouse": { lat: 43.6047, lon: 1.4442, department: "31", region: "76" },
  "strasbourg": { lat: 48.5734, lon: 7.7521, department: "67", region: "44" },
  "grenoble": { lat: 45.1885, lon: 5.7245, department: "38", region: "84" },
  "ajaccio": { lat: 41.9192, lon: 8.7386, department: "2A", region: "94" },
  "vannes": { lat: 47.6582, lon: -2.7608, department: "56", region: "53" },
  "brest": { lat: 48.3904, lon: -4.4861, department: "29", region: "53" },
  "quimper": { lat: 47.996, lon: -4.102, department: "29", region: "53" },
  "lorient": { lat: 47.748, lon: -3.370, department: "56", region: "53" },
  "saint-brieuc": { lat: 48.514, lon: -2.765, department: "22", region: "53" },
  "fougeres": { lat: 48.351, lon: -1.199, department: "35", region: "53" },
  "fougères": { lat: 48.351, lon: -1.199, department: "35", region: "53" },
  "dinard": { lat: 48.632, lon: -2.062, department: "35", region: "53" },
  "angers": { lat: 47.4784, lon: -0.5632, department: "49", region: "52" },
  "le mans": { lat: 48.0061, lon: 0.1996, department: "72", region: "52" },
  "la roche-sur-yon": { lat: 46.6705, lon: -1.4260, department: "85", region: "52" },
  "caen": { lat: 49.1829, lon: -0.3707, department: "14", region: "28" },
  "rouen": { lat: 49.4431, lon: 1.0993, department: "76", region: "28" },
  "reims": { lat: 49.2583, lon: 4.0317, department: "51", region: "44" },
  "nancy": { lat: 48.6921, lon: 6.1844, department: "54", region: "44" },
  "metz": { lat: 49.1193, lon: 6.1757, department: "57", region: "44" },
  "dijon": { lat: 47.322, lon: 5.0415, department: "21", region: "27" },
  "besancon": { lat: 47.2378, lon: 6.0241, department: "25", region: "27" },
  "besançon": { lat: 47.2378, lon: 6.0241, department: "25", region: "27" },
  "orleans": { lat: 47.9029, lon: 1.9093, department: "45", region: "24" },
  "orléans": { lat: 47.9029, lon: 1.9093, department: "45", region: "24" },
  "poitiers": { lat: 46.5802, lon: 0.3404, department: "86", region: "75" },
  "limoges": { lat: 45.8336, lon: 1.2611, department: "87", region: "75" },
  "clermont-ferrand": { lat: 45.7772, lon: 3.0870, department: "63", region: "84" },
  "montpellier": { lat: 43.6108, lon: 3.8767, department: "34", region: "76" },
  "nimes": { lat: 43.8367, lon: 4.3601, department: "30", region: "76" },
  "nîmes": { lat: 43.8367, lon: 4.3601, department: "30", region: "76" },
  "perpignan": { lat: 42.6887, lon: 2.8948, department: "66", region: "76" },
  "aix-en-provence": { lat: 43.5297, lon: 5.4474, department: "13", region: "93" },
  "toulon": { lat: 43.1242, lon: 5.928, department: "83", region: "93" },
};

const REGION_NAME_TO_CODE = new Map(
  REGIONS.map((region) => [
    region.name
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase(),
    region.code,
  ]),
);

function toKey(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function pickString(row: Record<string, unknown>, keys: string[], fallback = "") {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

function toFiniteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const cleaned = value.trim().replace(",", ".");
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function pickNumber(row: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const parsed = toFiniteNumber(row[key]);
    if (parsed !== null) return parsed;
  }
  return null;
}

function isProbablyVisible(row: Record<string, unknown>) {
  const status = toKey(pickString(row, ["status", "etat", "state", "publication_status"]));
  const validated = row["validated"] ?? row["is_validated"] ?? row["approved"] ?? row["is_approved"] ?? row["published"] ?? row["is_published"];
  const rejected = row["rejected"] ?? row["is_rejected"];

  if (rejected === true) return false;
  if (typeof rejected === "string" && ["true", "1", "yes", "oui", "rejected", "refuse", "refusé"].includes(toKey(rejected))) return false;

  if (typeof validated === "boolean") return validated;
  if (typeof validated === "string") {
    const value = toKey(validated);
    if (["true", "1", "yes", "oui", "valide", "validé", "approved", "publie", "publié", "published"].includes(value)) return true;
    if (["false", "0", "no", "non", "draft", "brouillon", "pending", "attente", "refuse", "refusé"].includes(value)) return false;
  }

  if (status) {
    return ["valide", "validé", "approved", "publie", "publié", "published", "active", "online"].includes(status);
  }

  return true;
}

function lonLatToMapPoint(lon: number, lat: number) {
  // Projection légère alignée sur la carte SVG actuelle.
  return {
    x: 45.55 * lon + 329.35,
    y: -65.88 * lat + 3427.5,
  };
}

function isCoordinateInSupportedBounds(lat: number | null, lon: number | null) {
  return lat !== null && lon !== null && lat >= 41 && lat <= 52 && lon >= -6 && lon <= 10.5;
}

function findDepartmentFromPoint(point: { x: number; y: number }) {
  // Priorité aux coordonnées : si un événement possède lat/lng, il doit être placé.
  // On déduit ensuite le département par inclusion approximative dans les bounds SVG.
  // Les contours exacts servent à l'affichage ; ce calcul sert seulement au rattachement UX.
  const candidates = DEPARTMENTS
    .map((department) => ({ department, bounds: getPathBounds(department.path) }))
    .filter(({ bounds }) =>
      point.x >= bounds.minX - 3 &&
      point.x <= bounds.maxX + 3 &&
      point.y >= bounds.minY - 3 &&
      point.y <= bounds.maxY + 3,
    )
    .sort((a, b) => (a.bounds.width * a.bounds.height) - (b.bounds.width * b.bounds.height));

  if (candidates[0]) return candidates[0].department;

  // Fallback : département dont le centre est le plus proche du point.
  return DEPARTMENTS
    .map((department) => {
      const bounds = getPathBounds(department.path);
      const distance = Math.hypot(bounds.cx - point.x, bounds.cy - point.y);
      return { department, distance };
    })
    .sort((a, b) => a.distance - b.distance)[0]?.department || null;
}

function normalizeRegionCode(value: string): RegionCode | "" {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (REGIONS.some((region) => region.code === raw)) return raw as RegionCode;

  const key = toKey(raw)
    .replace(/[’']/g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ');

  const aliases: Record<string, RegionCode> = {
    'ile de france': '11',
    'centre val de loire': '24',
    'bourgogne franche comte': '27',
    'normandie': '28',
    'hauts de france': '32',
    'grand est': '44',
    'pays de la loire': '52',
    'bretagne': '53',
    'nouvelle aquitaine': '75',
    'occitanie': '76',
    'auvergne rhone alpes': '84',
    'provence alpes cote dazur': '93',
    'paca': '93',
    'corse': '94',
  };

  return aliases[key] || REGION_NAME_TO_CODE.get(toKey(raw)) as RegionCode | undefined || '';
}

function getEventType(row: Record<string, unknown>): MapEvent["type"] {
  const raw = toKey(pickString(row, ["type", "event_type", "category", "categorie", "event_category"], "autre"));
  if (raw.includes("salon")) return "salon";
  if (raw.includes("festival")) return "festival";
  if (raw.includes("dedic") || raw.includes("rencontre")) return "dedicace";
  if (raw.includes("conference") || raw.includes("conférence")) return "conference";
  if (raw.includes("atelier") || raw.includes("animation")) return "atelier";
  if (raw.includes("jeunesse") || raw.includes("enfant")) return "jeunesse";
  return "autre";
}


function getEventTypeLabel(type?: MapEvent["type"]) {
  switch (type) {
    case "salon": return "Salon du livre";
    case "dedicace": return "Rencontre / dédicace";
    case "festival": return "Festival littéraire";
    case "conference": return "Conférence / lecture";
    case "atelier": return "Atelier / animation";
    case "jeunesse": return "Jeunesse";
    default: return "Autre événement";
  }
}

function getEventTypeSummary(eventList: MapEvent[]) {
  const counts = eventList.reduce<Record<string, number>>((acc, event) => {
    const label = getEventTypeLabel(event.type);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => `${count} ${label.toLowerCase()}`)
    .join(" • ");
}

function getEventTypeCounts(eventList: MapEvent[]) {
  const order = ["salon", "festival", "dedicace", "conference", "atelier", "jeunesse", "autre"];
  const counts = eventList.reduce<Map<string, { type: string; label: string; count: number }>>((acc, event) => {
    const type = event.type || "autre";
    const current = acc.get(type) || { type, label: getEventTypeLabel(type), count: 0 };
    current.count += 1;
    acc.set(type, current);
    return acc;
  }, new Map());

  return Array.from(counts.values()).sort((a, b) => {
    const typeRank = order.indexOf(a.type) - order.indexOf(b.type);
    return b.count - a.count || typeRank;
  });
}

function eventPlural(count: number) {
  return `${count} événement${count > 1 ? "s" : ""}`;
}

function clampOverlayPosition(value: number, min = 4, max = 96) {
  return Math.min(max, Math.max(min, value));
}

function getOverlayFootprint(label: { kind: string; name: string; events: MapEvent[] }) {
  if (label.kind === "region") return { width: Math.min(17, Math.max(10, label.name.length * 0.72 + 4.8)), height: 3.9 };
  if (label.kind === "department") return { width: Math.min(15, Math.max(8.8, label.name.length * 0.58 + 4.5)), height: 3.4 };
  return { width: Math.min(20, Math.max(11, label.name.length * 0.82 + (label.events.length > 1 ? 5.2 : 3.8))), height: 6.5 };
}

function resolveOverlayCollisions<T extends { kind: string; code: string; name: string; x: number; y: number; events: MapEvent[] }>(labels: T[]) {
  const placed: Array<T & { boxWidth: number; boxHeight: number }> = [];

  return labels
    .map((label) => ({ ...label }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((label, index) => {
      const footprint = getOverlayFootprint(label);
      let x = label.x;
      let y = label.y;

      for (let attempt = 0; attempt < 10; attempt += 1) {
        const overlaps = placed.some((other) => (
          Math.abs(x - other.x) < (footprint.width + other.boxWidth) / 2 &&
          Math.abs(y - other.y) < (footprint.height + other.boxHeight) / 2
        ));

        if (!overlaps) break;

        const direction = index % 2 === 0 ? 1 : -1;
        y = clampOverlayPosition(y + direction * (footprint.height + 0.65), 4.5, 95.5);
        x = clampOverlayPosition(x + direction * 1.2, 4.5, 95.5);
      }

      const resolved = { ...label, x, y };
      placed.push({ ...resolved, boxWidth: footprint.width, boxHeight: footprint.height });
      return resolved;
    })
    .sort((a, b) => labels.findIndex((label) => label.kind === a.kind && label.code === a.code) - labels.findIndex((label) => label.kind === b.kind && label.code === b.code));
}

function parseFrenchEventDate(dateText: string) {
  const raw = String(dateText || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : { start: parsed, end: parsed };
  }

  const normalized = toKey(raw).replace(/[–—]/g, "-");
  if (normalized.includes("venir")) return { start: null, end: null, upcomingFallback: true };

  const monthMap: Record<string, number> = {
    janvier: 0,
    fevrier: 1,
    mars: 2,
    avril: 3,
    mai: 4,
    juin: 5,
    juillet: 6,
    aout: 7,
    septembre: 8,
    octobre: 9,
    novembre: 10,
    decembre: 11,
  };

  const monthKey = Object.keys(monthMap).find((month) => normalized.includes(month));
  const month = monthKey ? monthMap[monthKey] : null;
  const days = normalized.match(/\d{1,2}/g)?.map(Number).filter((day) => day >= 1 && day <= 31) || [];
  const year = Number(normalized.match(/\b20\d{2}\b/)?.[0]) || new Date().getFullYear();

  if (month === null || !days.length) return null;

  const start = new Date(year, month, days[0], 0, 0, 0, 0);
  const end = new Date(year, month, days[days.length > 1 ? 1 : 0], 23, 59, 59, 999);
  return { start, end };
}

function formatEventDateLabel(dateText: string) {
  const raw = String(dateText || "").trim();
  if (!raw || raw.toLowerCase().includes("venir")) return "À venir";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function getEventTimingCounts(eventList: MapEvent[]) {
  const today = getTodayNoon();

  return eventList.reduce(
    (acc, event) => {
      const range = parseFrenchEventDate(event.date);
      if (!range || "upcomingFallback" in range) {
        acc.upcoming += 1;
        return acc;
      }
      if (range.end < today) {
        acc.ended += 1;
        return acc;
      }
      if (range.start <= today && range.end >= today) {
        acc.ongoing += 1;
        return acc;
      }
      acc.upcoming += 1;
      return acc;
    },
    { ongoing: 0, upcoming: 0, ended: 0 },
  );
}

function isEventEnded(event: MapEvent) {
  const range = parseFrenchEventDate(event.date);
  if (!range || "upcomingFallback" in range) return false;
  return range.end < getTodayNoon();
}

function getTodayNoon() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

function getFlowPath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const curve = Math.min(48, Math.max(16, distance * 0.16));
  const direction = from.x < to.x ? -1 : 1;

  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${(midX + direction * curve).toFixed(1)} ${(midY - curve).toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

function normalizeSupabaseEvent(row: Record<string, unknown>): MapEvent | null {
  if (!isProbablyVisible(row)) return null;

  const eventId = pickString(row, ["id", "event_id", "uuid"]);
  const eventSlug = pickString(row, ["slug"]);
  const website = pickString(row, ["website", "url", "link", "event_url"]);
  const imageUrl = pickString(row, ["image_url", "image", "cover_url", "photo_url"]);
  const description = pickString(row, ["description", "details", "summary", "content"]);
  const price = pickString(row, ["price", "tarif"]);
  const title = pickString(row, ["title", "name", "event_title", "nom", "titre", "event_name", "event_nom"], "Événement Dédicalivres");
  const city = pickString(row, ["city", "ville", "event_city", "location_city", "commune", "town", "locality", "place_city", "address_city", "city_name", "lieu_ville", "location", "lieu", "place", "venue_city", "venue"], "Ville à préciser");
  const cityFallback = CITY_FALLBACKS[toKey(city)];

  const regionRaw = pickString(row, ["region_code", "region", "region_name", "region_nom"]);
  const departmentRaw = pickString(row, ["department_code", "departement_code", "department", "departement", "dept", "dept_code", "code_departement", "departement_nom"]);

  let lat = pickNumber(row, ["latitude", "lat", "geo_lat", "location_latitude"]);
  let lon = pickNumber(row, ["longitude", "lng", "lon", "geo_lng", "location_longitude"]);

  // Sécurité : si les colonnes ont été inversées dans une source, on les remet dans le bon ordre.
  if (lat !== null && lon !== null) {
    const looksSwapped = lat >= -6 && lat <= 10.5 && lon >= 41 && lon <= 52;
    if (looksSwapped) {
      const previousLat = lat;
      lat = lon;
      lon = previousLat;
    }
  }

  const hasSupportedCoordinates = isCoordinateInSupportedBounds(lat, lon);

  if (!hasSupportedCoordinates && cityFallback) {
    lat = cityFallback.lat;
    lon = cityFallback.lon;
  } else if (!hasSupportedCoordinates) {
    lat = null;
    lon = null;
  }

  let point: { x: number; y: number } | null = null;
  const hasRealCoordinates = lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon);

  if (hasRealCoordinates) {
    // Règle B.10.6 : lat/lng valides = événement plaçable, sans dépendre du matching région/département.
    point = lonLatToMapPoint(lon as number, lat as number);
  }

  let department: string = normalizeDepartmentCode(departmentRaw) || cityFallback?.department || "";
  let region: string = normalizeRegionCode(regionRaw) || cityFallback?.region || "";

  // Si les coordonnées existent, on ne rejette pas l'événement. On rattache ensuite au territoire le plus probable.
  if (point) {
    const inferredDepartment = findDepartmentFromPoint(point);
    if (inferredDepartment) {
      department = department || inferredDepartment.code;
      region = region || inferredDepartment.region;
    }
  }

  if (!point && department) {
    point = getPathCenter(departmentByCode.get(department as DepartmentCode)?.path);
  }

  if (!point && region) {
    point = getPathCenter(regionByCode.get(region as RegionCode)?.path);
  }

  if (!point) return null;

  if (!department) {
    const inferredDepartment = findDepartmentFromPoint(point);
    department = inferredDepartment?.code || "00";
    region = region || inferredDepartment?.region || "00";
  }

  if (!region && departmentByCode.has(department as DepartmentCode)) {
    region = departmentByCode.get(department as DepartmentCode)?.region || "00";
  }

  if (!region) {
    const inferredDepartment = findDepartmentFromPoint(point);
    region = inferredDepartment?.region || "00";
  }

  const date = formatEventDateLabel(pickString(row, ["date", "event_date", "start_date", "date_start", "begin_date", "starts_at"], "À venir"));
  const authors =
    pickNumber(row, ["authors_count", "author_count", "auteurs_count", "authors", "auteurs"]) ??
    1;

  return {
    id: eventId || undefined,
    slug: eventSlug || undefined,
    website: website || undefined,
    imageUrl: imageUrl || undefined,
    description: description || undefined,
    price: price || undefined,
    title,
    city,
    region,
    department,
    date,
    authors,
    lat: lat ?? 0,
    lon: lon ?? 0,
    x: point.x,
    y: point.y,
    type: getEventType(row),
    source: "supabase",
  };
}


function readMapReturnParams() {
  if (typeof window === "undefined") {
    return { region: "", department: "", city: "" };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    region: params.get("region") || "",
    department: params.get("department") || "",
    city: params.get("city") || "",
  };
}

function clearMapReturnParams() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("region");
  url.searchParams.delete("department");
  url.searchParams.delete("city");
  window.history.replaceState({}, "", `${url.pathname}${url.search}#carte`);
}

export function ImmersiveMap() {
  const [level, setLevel] = useState<Level>("france");
  const [selectedRegion, setSelectedRegion] = useState<RegionCode | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<DepartmentCode | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MapEvent | null>(null);

  const [hoveredRegion, setHoveredRegion] = useState<RegionCode | null>(null);
  const [hoveredDepartment, setHoveredDepartment] = useState<DepartmentCode | null>(null);
  const [isCompactMap, setIsCompactMap] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const syncCompactMode = () => setIsCompactMap(media.matches);

    syncCompactMode();
    media.addEventListener("change", syncCompactMode);

    return () => media.removeEventListener("change", syncCompactMode);
  }, []);

  useEffect(() => {
    const desired = readMapReturnParams();

    if (!desired.region && !desired.department && !desired.city) return;

    const timer = window.setTimeout(() => {
      const desiredRegion = normalizeRegionCode(desired.region);
      const desiredDepartment = normalizeDepartmentCode(desired.department);

      if (desiredRegion) {
        setLevel("region");
        setSelectedRegion(desiredRegion);
      }

      if (desiredDepartment) {
        setLevel("department");
        setSelectedDepartment(desiredDepartment);
      }

      if (desired.city) {
        setSelectedCity(desired.city);
        setLevel("city");
      }

      const mapElement = document.getElementById("carte");
      mapElement?.scrollIntoView({ behavior: "smooth", block: "start" });

      clearMapReturnParams();
    }, 360);

    return () => window.clearTimeout(timer);
  }, []);

  const [zoomMotion, setZoomMotion] = useState<"zoom-in" | "zoom-out">("zoom-out");
  const [events, setEvents] = useState<MapEvent[]>([]);
  const mapEvents = useMemo(() => events.filter((event) => !isEventEnded(event)), [events]);

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      if (!supabase) {
        setEvents([]);
        return;
      }

      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("validated", true)
        .eq("rejected", false)
        .limit(500);

      if (cancelled) return;

      if (error) {
        console.warn("[Dédicalivres V2] Lecture Supabase impossible.", error);
        setEvents([]);
        return;
      }

      const rows = (data || []) as Record<string, unknown>[];
      const normalized = rows
        .map((row) => normalizeSupabaseEvent(row))
        .filter(Boolean) as MapEvent[];

      if (normalized.length) {
        setEvents(normalized);
      } else {
        setEvents([]);
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeRegionCode = hoveredRegion || selectedRegion;
  const activeDepartmentCode = hoveredDepartment || selectedDepartment;
  const activeRegion = activeRegionCode ? regionByCode.get(activeRegionCode) : null;
  const activeDepartment = activeDepartmentCode ? departmentByCode.get(activeDepartmentCode) : null;

  const visibleDepartments = useMemo(() => {
    if (!selectedRegion) return [];
    return DEPARTMENTS.filter((department) => department.region === selectedRegion);
  }, [selectedRegion]);

  const visibleEvents = useMemo(() => {
    if (selectedCity) {
      return mapEvents.filter((event) => toKey(event.city) === toKey(selectedCity));
    }
    if ((level === "department" || level === "city") && selectedDepartment) {
      return mapEvents.filter((event) => event.department === selectedDepartment);
    }
    if (selectedRegion) {
      return mapEvents.filter((event) => event.region === selectedRegion);
    }
    return mapEvents;
  }, [mapEvents, level, selectedDepartment, selectedRegion, selectedCity]);

  const cityClusters = useMemo(() => {
    const groups = new Map<string, { city: string; department: string; region: string; x: number; y: number; events: MapEvent[]; type: MapEvent["type"] }>();
    for (const event of visibleEvents) {
      const key = `${toKey(event.city)}-${event.department}`;
      const existing = groups.get(key);
      if (existing) {
        existing.events.push(event);
        existing.x = (existing.x * (existing.events.length - 1) + event.x) / existing.events.length;
        existing.y = (existing.y * (existing.events.length - 1) + event.y) / existing.events.length;
      } else {
        groups.set(key, { city: event.city, department: event.department, region: event.region, x: event.x, y: event.y, events: [event], type: event.type });
      }
    }
    return Array.from(groups.values());
  }, [visibleEvents]);

  const selectedCityCluster = useMemo(() => {
    if (!selectedCity) return null;
    return cityClusters.find(
      (cluster) => toKey(cluster.city) === toKey(selectedCity) && (!selectedDepartment || cluster.department === selectedDepartment),
    ) || null;
  }, [cityClusters, selectedCity, selectedDepartment]);

  const displayClusters = useMemo(() => {
    if (level === "france") {
      return REGIONS.map((region) => {
        const regionEvents = mapEvents.filter((event) => event.region === region.code);
        const center = getBalancedEventCenter(regionEvents, region.path);
        return center && regionEvents.length
          ? {
              kind: "region" as const,
              code: region.code,
              label: region.name,
              x: center.x,
              y: center.y,
              events: regionEvents,
              type: regionEvents[0]?.type || "autre",
            }
          : null;
      }).filter(Boolean);
    }

    if (level === "region" && selectedRegion) {
      return DEPARTMENTS.filter((department) => department.region === selectedRegion).map((department) => {
        const departmentEvents = mapEvents.filter((event) => event.department === department.code);
        const center = getPathCenter(department.path);
        return center && departmentEvents.length
          ? {
              kind: "department" as const,
              code: department.code,
              label: department.name,
              x: center.x,
              y: center.y,
              events: departmentEvents,
              type: departmentEvents[0]?.type || "autre",
            }
          : null;
      }).filter(Boolean);
    }

    return cityClusters.map((cluster) => ({
      kind: "city" as const,
      code: cluster.city,
      label: cluster.city,
      x: cluster.x,
      y: cluster.y,
      events: cluster.events,
      type: cluster.type,
      city: cluster.city,
      department: cluster.department,
      region: cluster.region,
    }));
  }, [cityClusters, mapEvents, level, selectedRegion]);

  const flowLinks = useMemo<MapFlowLink[]>(() => {
    const clusters = displayClusters
      .filter((cluster): cluster is NonNullable<typeof cluster> => Boolean(cluster))
      .filter((cluster) => cluster.events.length > 0);

    if (clusters.length < 2) return [];

    const maxLinks = level === "france" ? 13 : level === "region" ? 16 : 18;
    const pairs: Array<{ from: typeof clusters[number]; to: typeof clusters[number]; distance: number; strength: number }> = [];

    clusters.forEach((from, fromIndex) => {
      const nearest = clusters
        .map((to, toIndex) => ({
          to,
          toIndex,
          distance: fromIndex === toIndex ? Infinity : Math.hypot(to.x - from.x, to.y - from.y),
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, level === "france" ? 1 : 2);

      nearest.forEach(({ to, toIndex, distance }) => {
        const key = [fromIndex, toIndex].sort((a, b) => a - b).join("-");
        if (pairs.some((pair) => pair.from === clusters[Number(key.split("-")[0])] && pair.to === clusters[Number(key.split("-")[1])])) return;
        pairs.push({
          from: clusters[Number(key.split("-")[0])],
          to: clusters[Number(key.split("-")[1])],
          distance,
          strength: Math.min(1, Math.max(0.22, (from.events.length + to.events.length) / Math.max(mapEvents.length, 1))),
        });
      });
    });

    return pairs
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxLinks)
      .map((pair, index) => ({
        key: `${pair.from.kind}-${pair.from.code}-${pair.to.kind}-${pair.to.code}-${index}`,
        d: getFlowPath(pair.from, pair.to),
        strength: pair.strength,
        delay: index * 130,
      }));
  }, [displayClusters, mapEvents.length, level]);

  const regionalEventHints = useMemo(() => {
    if (level !== "region" || !selectedRegion) return [];
    return cityClusters
      .filter((cluster) => cluster.region === selectedRegion && cluster.events.length > 0)
      .slice(0, 36);
  }, [cityClusters, level, selectedRegion]);

  const regionalCityLandmarks = useMemo<RegionalCityLandmark[]>(() => {
    if (level !== "region" || !selectedRegion) return [];

    return cityClusters
      .filter((cluster) => cluster.region === selectedRegion && cluster.events.length > 0)
      .map((cluster) => ({
        key: `${toKey(cluster.city)}-${cluster.department}`,
        label: cluster.city,
        x: cluster.x,
        y: cluster.y,
        department: cluster.department,
        region: cluster.region,
        hasEvents: true,
        events: cluster.events,
      }))
      .sort((a, b) => b.events.length - a.events.length || a.label.localeCompare(b.label, "fr"))
      .slice(0, 10);
  }, [cityClusters, level, selectedRegion]);

  const cityLandmarks = useMemo<CityLandmark[]>(() => {
    if (level !== "department" || !selectedDepartment) return [];

    return cityClusters
      .filter((cluster) => cluster.department === selectedDepartment && cluster.events.length > 0)
      .map((cluster) => ({
        key: `${toKey(cluster.city)}-${cluster.department}`,
        label: cluster.city,
        x: cluster.x,
        y: cluster.y,
        hasEvents: true,
        events: cluster.events,
      }))
      .sort((a, b) => b.events.length - a.events.length || a.label.localeCompare(b.label, "fr"))
      .slice(0, 9);
  }, [cityClusters, level, selectedDepartment]);

  const cameraView = useMemo(() => {
    if (level === "city" && selectedCityCluster) {
      return getPointCameraView(selectedCityCluster);
    }
    if ((level === "department" || level === "city") && selectedDepartment) {
      return getCameraView(departmentByCode.get(selectedDepartment)?.path, "department");
    }
    if (selectedRegion) {
      return getCameraView(regionByCode.get(selectedRegion)?.path, "region");
    }
    return getCameraView(undefined, "france");
  }, [level, selectedDepartment, selectedRegion, selectedCityCluster]);

  const cameraTransform = cameraView.transform;
  const mapOverlayLabels = useMemo(() => {
    const toViewport = (point: { x: number; y: number }) => ({
      x: ((point.x * cameraView.scale + cameraView.tx) / 860) * 100,
      y: ((point.y * cameraView.scale + cameraView.ty) / 760) * 100,
    });

    if (level === "france") {
      const regionOverlays = REGIONS.map((region) => {
        const regionEvents = mapEvents.filter((event) => event.region === region.code);
        const center = getBalancedEventCenter(regionEvents, region.path);
        if (!center || !regionEvents.length) return null;
        const offset = isCompactMap ? { x: 0, y: 0 } : REGION_OVERLAY_OFFSETS[region.code] || { x: 0, y: 0 };
        const position = toViewport(center);
        return {
          kind: "region" as const,
          code: region.code,
          name: region.name,
          x: clampOverlayPosition(position.x + offset.x, 5, 95),
          y: clampOverlayPosition(position.y + offset.y, 5, 95),
          events: regionEvents,
          isFocus: false,
        };
      });

      const labels = regionOverlays.filter((label): label is NonNullable<(typeof regionOverlays)[number]> => Boolean(label));
      return isCompactMap ? labels : resolveOverlayCollisions(labels);
    }

    const overlays: Array<{
      kind: "department" | "city";
      code: string;
      name: string;
      x: number;
      y: number;
      events: MapEvent[];
      isFocus: boolean;
      city?: string;
      department?: string;
      region?: string;
    }> = [];

    if (level === "region" && selectedRegion) {
      for (const department of DEPARTMENTS.filter((item) => item.region === selectedRegion)) {
        const departmentEvents = mapEvents.filter((event) => event.department === department.code);
        const center = getPathCenter(department.path);
        if (!center || !departmentEvents.length) continue;
        overlays.push({
          kind: "department",
          code: department.code,
          name: department.name,
          ...toViewport(center),
          events: departmentEvents,
          isFocus: false,
          department: department.code,
          region: department.region,
        });
      }
    }

    if ((level === "department" || level === "city") && selectedDepartment) {
      const department = departmentByCode.get(selectedDepartment);
      const departmentEvents = mapEvents.filter((event) => event.department === selectedDepartment);
      const center = department ? getPathCenter(department.path) : null;

      if (department && center && departmentEvents.length) {
        overlays.push({
          kind: "department",
          code: department.code,
          name: department.name,
          ...toViewport(center),
          events: departmentEvents,
          isFocus: true,
          department: department.code,
          region: department.region,
        });
      }

      for (const cluster of cityClusters.filter((item) => item.department === selectedDepartment && item.events.length > 0)) {
        if (selectedCity && toKey(cluster.city) !== toKey(selectedCity)) continue;
        overlays.push({
          kind: "city",
          code: `${toKey(cluster.city)}-${cluster.department}`,
          name: cluster.city,
          ...toViewport(cluster),
          events: cluster.events,
          isFocus: level === "city" && toKey(selectedCity) === toKey(cluster.city),
          city: cluster.city,
          department: cluster.department,
          region: cluster.region,
        });
      }
    }

    return resolveOverlayCollisions(overlays);
  }, [cameraView.scale, cameraView.tx, cameraView.ty, cityClusters, isCompactMap, mapEvents, level, selectedCity, selectedDepartment, selectedRegion]);


  const panelTitle = selectedEvent?.title || selectedCity || activeDepartment?.name || activeRegion?.name || "France littéraire";
  const regionStats = getRegionStats(mapEvents, activeRegionCode || undefined);
  const departmentStats = getDepartmentStats(mapEvents, activeDepartmentCode || undefined);
  const cityStats = getCityStats(mapEvents, selectedCity || undefined);
  const panelStats = selectedEvent ? { events: 1, authors: selectedEvent.authors || 1, salons: selectedEvent.type === "salon" ? 1 : 0, departments: 1 } : selectedCity ? cityStats : activeDepartment ? departmentStats : regionStats;
  const panelEvents = selectedCity
    ? mapEvents.filter((event) => toKey(event.city) === toKey(selectedCity))
    : activeDepartmentCode
      ? mapEvents.filter((event) => event.department === activeDepartmentCode)
      : activeRegionCode
        ? mapEvents.filter((event) => event.region === activeRegionCode)
        : mapEvents;
  const panelTimingEvents = selectedCity
    ? events.filter((event) => toKey(event.city) === toKey(selectedCity))
    : activeDepartmentCode
      ? events.filter((event) => event.department === activeDepartmentCode)
      : activeRegionCode
        ? events.filter((event) => event.region === activeRegionCode)
        : events;
  const temporalStats = getEventTimingCounts(panelTimingEvents);
  const nationalInsights = useMemo(() => {
    const activeRegions = REGIONS
      .map((region) => ({
        region,
        events: events.filter((event) => event.region === region.code),
      }))
      .sort((a, b) => b.events.length - a.events.length);
    const topRegion = activeRegions.find((item) => item.events.length > 0);
    const typeCounts = getEventTypeCounts(events).slice(0, 3);
    const timing = getEventTimingCounts(events);

    return { topRegion, typeCounts, timing };
  }, [events]);

  function selectRegion(code: RegionCode) {
    setSelectedEvent(null);
    setZoomMotion("zoom-in");
    setSelectedRegion(code);
    setSelectedDepartment(null);
    setSelectedCity(null);
    setLevel("region");
  }

  function selectDepartment(code: DepartmentCode) {
    setSelectedEvent(null);
    setZoomMotion("zoom-in");
    setSelectedDepartment(code);
    setSelectedCity(null);
    setLevel("department");
  }

  function selectCity(cluster: { city: string; department: string; region: string; x: number; y: number; events: MapEvent[] }) {
    setSelectedEvent(null);
    setZoomMotion("zoom-in");
    if (REGIONS.some((region) => region.code === cluster.region)) {
      setSelectedRegion(cluster.region as RegionCode);
    }
    if (DEPARTMENTS.some((department) => department.code === cluster.department)) {
      setSelectedDepartment(cluster.department as DepartmentCode);
    }
    setSelectedCity(cluster.city);
    setLevel("city");
  }

  function selectCluster(cluster: NonNullable<(typeof displayClusters)[number]>) {
    if (cluster.kind === "region" && REGIONS.some((region) => region.code === cluster.code)) {
      selectRegion(cluster.code as RegionCode);
      return;
    }

    if (cluster.kind === "department" && DEPARTMENTS.some((department) => department.code === cluster.code)) {
      selectDepartment(cluster.code as DepartmentCode);
      return;
    }

    if (cluster.kind === "city" && "city" in cluster && cluster.city) {
      const cityCluster = cluster as { city: string; department: string; region: string; x: number; y: number; events: MapEvent[] };
      selectCity(cityCluster);
      if (cityCluster.events.length === 1) {
        setSelectedEvent(cityCluster.events[0]);
      }
    }
  }

  function resetFrance() {
    setSelectedEvent(null);
    setZoomMotion("zoom-out");
    setLevel("france");
    setSelectedRegion(null);
    setSelectedDepartment(null);
    setSelectedCity(null);
    setHoveredRegion(null);
    setHoveredDepartment(null);
  }

  function handleMapBackgroundClick() {
    if (level === "city") {
      setSelectedEvent(null);
      setZoomMotion("zoom-out");
      setLevel("department");
      setSelectedCity(null);
      return;
    }

    if (level === "department") {
      setSelectedEvent(null);
      setZoomMotion("zoom-out");
      setLevel("region");
      setSelectedDepartment(null);
      setHoveredDepartment(null);
      setSelectedCity(null);
      return;
    }

    if (level === "region") {
      resetFrance();
    }
  }

  function handleMapStagePointerMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
    const y = ((event.clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    event.currentTarget.style.setProperty("--map-pointer-x", x.toFixed(3));
    event.currentTarget.style.setProperty("--map-pointer-y", y.toFixed(3));
  }

  function handleMapStagePointerLeave(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--map-pointer-x", "0");
    event.currentTarget.style.setProperty("--map-pointer-y", "0");
  }

  return (
    <section className="section map-section real-france-section" id="carte">
      <div className="section-header map-heading">
        <p className="eyebrow">France littéraire interactive</p>
        <h2>Explorez la vie littéraire française.</h2>
        <p className="map-intro">France → régions → départements → événements. La carte devient l’entrée naturelle vers les rencontres.</p>
      </div>

      <div className="real-map-shell">
        <div className="real-map-card">
          <div className="map-breadcrumb" aria-label="Navigation carte">
            <button type="button" onClick={resetFrance}>France</button>
            {selectedRegion && (
              <>
                <span>/</span>
                <button type="button" onClick={() => { setZoomMotion("zoom-out"); setLevel("region"); setSelectedDepartment(null); }}>
                  {regionByCode.get(selectedRegion)?.name}
                </button>
              </>
            )}
            {selectedDepartment && (
              <>
                <span>/</span>
                <button type="button" onClick={() => { setZoomMotion("zoom-out"); setLevel("department"); setSelectedCity(null); }}>
                  {departmentByCode.get(selectedDepartment)?.name}
                </button>
              </>
            )}
            {selectedCity && (
              <>
                <span>/</span>
                <strong>{selectedCity}</strong>
              </>
            )}
          </div>

          <div className="map-stage" onPointerMove={handleMapStagePointerMove} onPointerLeave={handleMapStagePointerLeave}>
            <div className="map-canvas">
            <svg className="france-real-svg" viewBox={MAP_VIEWBOX} role="img" aria-label="Carte interactive de France par régions et départements" onClick={handleMapBackgroundClick}>
              <defs>
                <radialGradient id="regionFill" cx="45%" cy="40%" r="70%">
                  <stop offset="0%" stopColor="#1AA37A" stopOpacity="0.78" />
                  <stop offset="60%" stopColor="#0F6B5A" stopOpacity="0.58" />
                  <stop offset="100%" stopColor="#07110E" stopOpacity="0.45" />
                </radialGradient>
                <radialGradient id="activeFill" cx="45%" cy="40%" r="70%">
                  <stop offset="0%" stopColor="#40E5AC" stopOpacity="0.92" />
                  <stop offset="60%" stopColor="#1AA37A" stopOpacity="0.78" />
                  <stop offset="100%" stopColor="#D4B16A" stopOpacity="0.38" />
                </radialGradient>

                <radialGradient id="markerSalon" cx="36%" cy="28%" r="78%">
                  <stop offset="0%" stopColor="#FFF8D8" stopOpacity="1" />
                  <stop offset="33%" stopColor="#D4B16A" stopOpacity="0.98" />
                  <stop offset="72%" stopColor="#6B4A16" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#231806" stopOpacity="0.95" />
                </radialGradient>
                <radialGradient id="markerDedicace" cx="36%" cy="28%" r="78%">
                  <stop offset="0%" stopColor="#E9FFF7" stopOpacity="1" />
                  <stop offset="34%" stopColor="#38C99B" stopOpacity="0.98" />
                  <stop offset="76%" stopColor="#0F6B5A" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#06231D" stopOpacity="0.95" />
                </radialGradient>
                <radialGradient id="markerFestival" cx="36%" cy="28%" r="78%">
                  <stop offset="0%" stopColor="#EEE7FF" stopOpacity="1" />
                  <stop offset="34%" stopColor="#6C55D8" stopOpacity="0.96" />
                  <stop offset="74%" stopColor="#2D245D" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#0D0A1C" stopOpacity="0.95" />
                </radialGradient>
                <radialGradient id="markerConference" cx="36%" cy="28%" r="78%">
                  <stop offset="0%" stopColor="#EAF5FF" stopOpacity="1" />
                  <stop offset="34%" stopColor="#4E95D8" stopOpacity="0.96" />
                  <stop offset="74%" stopColor="#173D66" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#071726" stopOpacity="0.95" />
                </radialGradient>
                <radialGradient id="markerAtelier" cx="36%" cy="28%" r="78%">
                  <stop offset="0%" stopColor="#FFF1DF" stopOpacity="1" />
                  <stop offset="34%" stopColor="#D88A42" stopOpacity="0.96" />
                  <stop offset="74%" stopColor="#653915" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#1D0F05" stopOpacity="0.95" />
                </radialGradient>
                <radialGradient id="markerJeunesse" cx="36%" cy="28%" r="78%">
                  <stop offset="0%" stopColor="#E9FFFF" stopOpacity="1" />
                  <stop offset="34%" stopColor="#38D7D0" stopOpacity="0.96" />
                  <stop offset="74%" stopColor="#0E5B58" stopOpacity="0.94" />
                  <stop offset="100%" stopColor="#062422" stopOpacity="0.95" />
                </radialGradient>
                <filter id="markerDrop" x="-120%" y="-120%" width="340%" height="340%">
                  <feDropShadow dx="0" dy="1.4" stdDeviation="1.8" floodColor="#000000" floodOpacity="0.46" />
                  <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor="#D4B16A" floodOpacity="0.16" />
                </filter>

                <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter id="deepMapGlow" x="-35%" y="-35%" width="170%" height="170%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feColorMatrix
                    in="blur"
                    type="matrix"
                    values="0 0 0 0 0.22 0 0 0 0 0.78 0 0 0 0 0.58 0 0 0 .72 0"
                    result="glow"
                  />
                  <feMerge>
                    <feMergeNode in="glow" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <linearGradient id="literaryFlow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#38C99B" stopOpacity="0" />
                  <stop offset="34%" stopColor="#38C99B" stopOpacity="0.72" />
                  <stop offset="66%" stopColor="#D4B16A" stopOpacity="0.86" />
                  <stop offset="100%" stopColor="#D4B16A" stopOpacity="0" />
                </linearGradient>

                <radialGradient id="reliefMassifFill" cx="38%" cy="30%" r="72%">
                  <stop offset="0%" stopColor="#EAF5D3" stopOpacity="0.34" />
                  <stop offset="42%" stopColor="#7BAE78" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#02100C" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="reliefValleyFill" cx="48%" cy="44%" r="72%">
                  <stop offset="0%" stopColor="#38C99B" stopOpacity="0.13" />
                  <stop offset="100%" stopColor="#06100D" stopOpacity="0" />
                </radialGradient>

                <clipPath id="franceHillshadeClip">
                  {REGIONS.map((region) => (
                    <path key={`hillshade-clip-${region.code}`} d={region.path} />
                  ))}
                </clipPath>
              </defs>

              <rect className="map-grid-bg" width="860" height="760" rx="34" />

              <g
                className={`map-viewport ${zoomMotion}`}
                style={{ transform: cameraTransform } as CSSProperties}
              >
              <g className="map-orographic-layer" aria-hidden="true">
                <ellipse className="relief-valley-zone relief-zone-loire" cx="390" cy="334" rx="158" ry="38" />
                <ellipse className="relief-valley-zone relief-zone-rhone" cx="566" cy="456" rx="46" ry="154" />
                <ellipse className="relief-massif-zone relief-zone-armorican" cx="235" cy="268" rx="92" ry="64" />
                <ellipse className="relief-massif-zone relief-zone-massif-central" cx="472" cy="456" rx="128" ry="112" />
                <ellipse className="relief-massif-zone relief-zone-pyrenees" cx="442" cy="612" rx="166" ry="48" />
                <ellipse className="relief-massif-zone relief-zone-alps" cx="626" cy="470" rx="68" ry="158" />
                <ellipse className="relief-massif-zone relief-zone-jura" cx="626" cy="330" rx="36" ry="82" />
                <ellipse className="relief-massif-zone relief-zone-vosges" cx="637" cy="247" rx="34" ry="54" />
                <ellipse className="relief-massif-zone relief-zone-corsica" cx="724" cy="655" rx="34" ry="62" />
              </g>

              <g className="map-relief-layer" aria-hidden="true">
                {level === "france" ? REGIONS.map((region) => (
                  <g key={`relief-region-${region.code}`} className="map-relief-stack">
                    <path d={region.path} className="map-relief-shape relief-base relief-region" />
                    <path d={region.path} className="map-relief-shape relief-mid relief-region" />
                    <path d={region.path} className="map-relief-shape relief-ridge relief-region" />
                  </g>
                )) : visibleDepartments.map((department) => (
                  <g key={`relief-department-${department.code}`} className="map-relief-stack">
                    <path d={department.path} className="map-relief-shape relief-base relief-department" />
                    <path d={department.path} className="map-relief-shape relief-mid relief-department" />
                    <path d={department.path} className="map-relief-shape relief-ridge relief-department" />
                  </g>
                ))}
              </g>

              {REGIONS.map((region) => {
                const isSelected = selectedRegion === region.code;
                const isActive = activeRegionCode === region.code;
                const isMuted = level !== "france" && selectedRegion !== region.code;
                return (
                  <path
                    key={region.code}
                    d={region.path}
                    className={`real-region ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""} ${isMuted ? "is-muted" : ""}`}
                    onMouseEnter={() => setHoveredRegion(region.code)}
                    onMouseLeave={() => setHoveredRegion(null)}
                    onClick={(event) => { event.stopPropagation(); selectRegion(region.code); }}
                  />
                );
              })}

              {level !== "france" && visibleDepartments.map((department) => {
                const isActive = activeDepartmentCode === department.code;
                const isSelected = selectedDepartment === department.code;
                return (
                  <path
                    key={department.code}
                    d={department.path}
                    className={`real-department ${isActive ? "is-active" : ""} ${isSelected ? "is-selected" : ""}`}
                    onMouseEnter={() => setHoveredDepartment(department.code)}
                    onMouseLeave={() => setHoveredDepartment(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      selectDepartment(department.code);
                    }}
                  />
                );
              })}

              <image
                className="ign-hillshade-raster"
                href="/assets/map/france-ign-hillshade-visible.png"
                x="0"
                y="0"
                width="860"
                height="760"
                preserveAspectRatio="none"
                clipPath="url(#franceHillshadeClip)"
              />

              <g className="map-territory-glows" aria-hidden="true">
                {displayClusters.map((cluster, index) => {
                  if (!cluster) return null;
                  const pulseRadius = cluster.kind === "city" ? 15 : cluster.kind === "department" ? 25 : 35;
                  const markerScale = getMarkerVisualScale(level);
                  return (
                    <circle
                      key={`aura-${cluster.kind}-${cluster.code}-${cluster.label}`}
                      className={`territory-aura aura-${cluster.kind}`}
                      cx={cluster.x}
                      cy={cluster.y}
                      r={pulseRadius / markerScale}
                      style={{ animationDelay: `${index * 110}ms` }}
                    />
                  );
                })}
              </g>

              <g className="map-flow-layer" aria-hidden="true">
                {flowLinks.map((link) => (
                  <path
                    key={link.key}
                    className="literary-flow-path"
                    d={link.d}
                    pathLength={1}
                    style={{
                      animationDelay: `${link.delay}ms`,
                      opacity: 0.24 + link.strength * 0.48,
                    }}
                  />
                ))}
              </g>

              {regionalEventHints.length > 0 && (
                <g className="regional-event-hints" aria-hidden="true">
                  {regionalEventHints.map((cluster, index) => {
                    const markerScale = getMarkerVisualScale(level);
                    return (
                      <g
                        key={`region-event-${cluster.department}-${cluster.city}`}
                        className={`regional-event-hint event-type-${cluster.type || "autre"}`}
                        style={{ animationDelay: `${index * 70}ms` }}
                      >
                        <circle className="regional-event-hint-halo" cx={cluster.x} cy={cluster.y} r={7 / markerScale} />
                        <circle className="regional-event-hint-dot" cx={cluster.x} cy={cluster.y} r={2.8 / markerScale} />
                      </g>
                    );
                  })}
                </g>
              )}

              {cityLandmarks.length > 0 && (
                <g className="city-landmark-layer" aria-hidden="true">
                  {cityLandmarks.map((city, index) => {
                    const markerScale = getMarkerVisualScale(level);
                    return (
                      <g
                        key={city.key}
                        className={`city-landmark-group ${city.hasEvents ? "has-events" : ""}`}
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <circle className="city-landmark-ring" cx={city.x} cy={city.y} r={7.6 / markerScale} />
                        <circle className="city-landmark-dot" cx={city.x} cy={city.y} r={2.2 / markerScale} />
                      </g>
                    );
                  })}
                </g>
              )}

              {level !== "france" && displayClusters.map((cluster, index) => {
                if (!cluster) return null;
                const isCitySelected = cluster.kind === "city" && selectedCity && toKey(selectedCity) === toKey(cluster.label);
                const markerScale = getMarkerVisualScale(level);
                const baseRadius = cluster.kind === "region" ? 11 : cluster.kind === "department" ? 9 : cluster.events.length > 1 ? 7 : 4.5;
                const baseHaloRadius = cluster.kind === "region" ? 19 : cluster.kind === "department" ? 15 : cluster.events.length > 1 ? 10 : 7;
                const radius = baseRadius / markerScale;
                const haloRadius = baseHaloRadius / markerScale;
                const labelOffset = (baseRadius + 10) / markerScale;
                const labelFontSize = Math.max(2.4, 7.5 / markerScale);
                const countFontSize = Math.max(2.6, 8 / markerScale);

                return (
                  <g
                    key={`${cluster.kind}-${cluster.code}-${cluster.label}`}
                    className={`event-pin-group progressive-cluster cluster-${cluster.kind} event-type-${cluster.type || "autre"} ${isCitySelected ? "is-city-selected" : ""}`}
                    style={{ animationDelay: `${index * 55}ms` }}
                    onClick={(event) => { event.stopPropagation(); selectCluster(cluster); }}
                  >
                    <title>{`${cluster.label} — ${cluster.events.length} événement${cluster.events.length > 1 ? "s" : ""}${cluster.events.length ? ` — ${getEventTypeSummary(cluster.events)}` : ""}`}</title>
                    <circle className="event-pin-halo" cx={cluster.x} cy={cluster.y} r={haloRadius} />
                    <circle className="event-pin-rim" cx={cluster.x} cy={cluster.y} r={radius + 1.8} />
                    <circle className="event-pin" cx={cluster.x} cy={cluster.y} r={radius} />
                    <circle className="event-pin-glint" cx={cluster.x - radius * 0.28} cy={cluster.y - radius * 0.32} r={Math.max(1.15, radius * 0.24)} />
                    {cluster.events.length > 1 && (
                      <text className="event-count-label" x={cluster.x} y={cluster.y + 3 / markerScale} style={{ fontSize: `${countFontSize}px` }}>{cluster.events.length}</text>
                    )}
                    {cluster.kind === "city" && isCitySelected && (
                      <text className="event-city-label city-selected-label" x={cluster.x + labelOffset} y={cluster.y - radius - 3 / markerScale} style={{ fontSize: `${labelFontSize}px` }}>{cluster.label}</text>
                    )}
                  </g>
                );
              })}

              {regionalCityLandmarks.length > 0 && (
                <g className="region-city-landmark-layer">
                  {regionalCityLandmarks.map((city, index) => {
                    const markerScale = getMarkerVisualScale(level);
                    return (
                      <g
                        key={city.key}
                        className={`region-city-landmark-group ${city.hasEvents ? "has-events" : ""}`}
                        style={{ animationDelay: `${index * 70}ms` }}
                        onClick={(event) => {
                          if (!city.hasEvents) return;
                          event.stopPropagation();
                          selectCity({
                            city: city.label,
                            department: city.department,
                            region: city.region,
                            x: city.x,
                            y: city.y,
                            events: city.events,
                          });
                        }}
                      >
                        {city.hasEvents && (
                          <circle className="region-city-landmark-hit" cx={city.x} cy={city.y} r={14 / markerScale} />
                        )}
                        <circle className="region-city-landmark-halo" cx={city.x} cy={city.y} r={(city.hasEvents ? 9 : 7) / markerScale} />
                        <circle className="region-city-landmark-dot" cx={city.x} cy={city.y} r={(city.hasEvents ? 2.8 : 2.1) / markerScale} />
                      </g>
                    );
                  })}
                </g>
              )}
              </g>
            </svg>

            {mapOverlayLabels.length > 0 && (
              <div className={`map-overlay-layer level-${level}`}>
                {mapOverlayLabels.map((label) => {
                  const typeCounts = getEventTypeCounts(label.events);
                  return (
                    <button
                      type="button"
                      className={`map-info-bubble overlay-${label.kind} ${label.events.length ? "has-events" : "is-empty"} ${label.isFocus ? "is-focus" : ""}`}
                      key={`overlay-${label.kind}-${label.code}`}
                      style={{ left: `${label.x}%`, top: `${label.y}%` } as CSSProperties}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (label.kind === "region") {
                          selectRegion(label.code as RegionCode);
                          return;
                        }
                        if (label.kind === "department" && label.department) {
                          selectDepartment(label.department as DepartmentCode);
                          return;
                        }
                        if (label.kind === "city" && label.city && label.department && label.region) {
                          selectCity({
                            city: label.city,
                            department: label.department,
                            region: label.region,
                            x: 0,
                            y: 0,
                            events: label.events,
                          });
                        }
                      }}
                    >
                      <strong>{label.name}</strong>
                      {!(label.kind === "city" && label.events.length <= 1) && (
                        <small className="map-info-count">{label.events.length}</small>
                      )}
                      <span className="map-info-types" aria-hidden="true">
                        {typeCounts.slice(0, 3).map((type) => (
                          <i className={`map-info-type event-type-${type.type}`} key={type.type}>
                            {type.count > 1 ? type.count : ""}
                          </i>
                        ))}
                      </span>
                      <span className="map-info-popover" aria-hidden="true">
                        <b>{label.events.length ? eventPlural(label.events.length) : "0 événement à venir"}</b>
                        {typeCounts.length > 0 ? (
                          typeCounts.slice(0, 4).map((type) => (
                            <span key={type.type}>
                              <i className={`map-info-type event-type-${type.type}`} />
                              {type.count} {type.label.toLowerCase()}
                            </span>
                          ))
                        ) : (
                          <span>Aucun événement actif sur la carte pour le moment.</span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {selectedCity && !selectedEvent && panelEvents.length > 0 && (
              <aside className="city-event-dock" aria-label={`Événements à ${selectedCity}`}>
                <div className="city-event-dock-header">
                  <span>Ville sélectionnée</span>
                  <strong>{selectedCity}</strong>
                  <small>{panelEvents.length} événement{panelEvents.length > 1 ? "s" : ""} · {getEventTypeSummary(panelEvents)}</small>
                </div>
                <div className="city-event-dock-list">
                  {panelEvents.slice(0, 5).map((event) => (
                    <button
                      key={`dock-${event.title}-${event.date}`}
                      type="button"
                      className={`city-event-dock-item event-type-${event.type || "autre"}`}
                      onClick={() => openEventPage(event)}
                    >
                      <span>{event.date}</span>
                      <strong>{event.title}</strong>
                      <small>{getEventTypeLabel(event.type)} · {event.city}</small>
                    </button>
                  ))}
                </div>
              </aside>
            )}
            </div>
          </div>
        </div>

        <aside className="real-map-panel">
          <p className="panel-kicker">{selectedCity ? "Ville active" : activeDepartment ? "Département actif" : activeRegion ? "Région active" : "France active"}</p>
          <h3>{panelTitle}</h3>
          <p className="panel-subtitle">
            {selectedEvent
              ? `${selectedEvent.city} — ${selectedEvent.date}`
              : selectedCity
                ? `Ville sélectionnée — ${panelEvents.length} événement${panelEvents.length > 1 ? "s" : ""} disponible${panelEvents.length > 1 ? "s" : ""}.`
                : activeDepartment
                  ? `Département ${activeDepartment.code} — exploration locale.`
                  : activeRegion
                    ? "Région sélectionnée — rencontres, salons et auteurs."
                    : "Vue nationale — prochaines rencontres littéraires."}
          </p>

          <div className="stat-grid refined-stats">
            <div><strong>{panelStats.events}</strong><span>rencontres actives</span></div>
            <div><strong>{panelStats.authors}</strong><span>auteurs</span></div>
            <div><strong>{panelStats.salons}</strong><span>salons</span></div>
            {!activeDepartment && <div><strong>{regionStats.departments}</strong><span>départements</span></div>}
          </div>

          {activeRegion && !selectedCity && !selectedEvent && (
            <div className="terrain-profile temporal-profile" aria-label="État des événements de la région">
              <div>
                <span>Signature territoriale</span>
                <strong>{eventPlural(panelEvents.length)}</strong>
                <small>état des rencontres régionales</small>
              </div>
              <ul className="temporal-status-list">
                <li>
                  <strong>{temporalStats.ongoing}</strong>
                  <span>en cours</span>
                </li>
                <li>
                  <strong>{temporalStats.upcoming}</strong>
                  <span>à venir</span>
                </li>
                <li>
                  <strong>{temporalStats.ended}</strong>
                  <span>terminés</span>
                </li>
              </ul>
            </div>
          )}

          <div className="panel-events">
            {selectedEvent ? (
              <article className="panel-event-card event-detail-card">
                <span>{selectedEvent.date}</span>
                <strong>{selectedEvent.title}</strong>
                <small><MapPin size={13} /> {selectedEvent.city}</small>
                <p className="event-detail-note">Événement sélectionné depuis la carte.</p>
                {getEventHref(selectedEvent) && (
                  <a className="event-detail-link premium-dark-action" href={getEventHref(selectedEvent)!}>
                    Voir la fiche événement →
                  </a>
                )}
                <button type="button" className="ghost-map-button small-action premium-dark-secondary" onClick={() => setSelectedEvent(null)}>
                  Revenir à la liste
                </button>
              </article>
            ) : level === "france" ? (
              <div className="national-insights" aria-label="Lecture nationale des événements">
                <article>
                  <span>Région la plus active</span>
                  <strong>{nationalInsights.topRegion?.region.name || "À consolider"}</strong>
                  <small>
                    {nationalInsights.topRegion
                      ? `${eventPlural(nationalInsights.topRegion.events.length)} référencé${nationalInsights.topRegion.events.length > 1 ? "s" : ""}`
                      : "Les événements validés alimenteront ce repère."}
                  </small>
                </article>
                <article>
                  <span>État national</span>
                  <strong>{nationalInsights.timing.upcoming} à venir</strong>
                  <small>{nationalInsights.timing.ongoing} en cours · {nationalInsights.timing.ended} terminés</small>
                </article>
                <article>
                  <span>Types dominants</span>
                  <strong>{nationalInsights.typeCounts[0]?.label || "À qualifier"}</strong>
                  <small>
                    {nationalInsights.typeCounts.length
                      ? nationalInsights.typeCounts.map((type) => `${type.count} ${type.label.toLowerCase()}`).join(" · ")
                      : "Salon, festival et dédicace seront priorisés."}
                  </small>
                </article>
              </div>
            ) : (
              panelEvents.slice(0, 6).map((event) => (
                <button
                  type="button"
                  key={`${event.title}-${event.city}-${event.date}`}
                  className="panel-event-card event-card-button premium-event-list-action"
                  onClick={() => openEventPage(event)}
                >
                  <span>{event.date}</span>
                  <strong>{event.title}</strong>
                  <small><MapPin size={13} /> {event.city}</small>
                </button>
              ))
            )}
            {!selectedEvent && level !== "france" && panelEvents.length === 0 && (
              <article className="panel-event-card muted-card">
                <span>Aucun événement actif</span>
                <strong>Aucun événement à venir n’est référencé ici pour le moment.</strong>
                <small>Les événements terminés restent disponibles depuis la recherche.</small>
              </article>
            )}
          </div>

          <div className="panel-actions">
            {level !== "france" && <button type="button" className="discover-region-button">Découvrir la région</button>}
          </div>
        </aside>
      </div>
    </section>
  );
}
