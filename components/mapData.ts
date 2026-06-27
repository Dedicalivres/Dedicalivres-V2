// mapData.ts — version allégée
// REGIONS et DEPARTMENTS sont désormais chargés à la demande via useMapData.ts
// depuis /data/france-regions.json et /data/france-departments.json

export type MapEvent = {
  id?: string;
  slug?: string;
  website?: string;
  imageUrl?: string;
  description?: string;
  price?: string;
  title: string;
  city: string;
  region: string;
  department: string;
  date: string;
  authors: number;
  lon: number;
  lat: number;
  x: number;
  y: number;
  type?: "salon" | "dedicace" | "festival" | "conference" | "atelier" | "jeunesse" | "autre";
  source?: "supabase";
};

export type MapRegion = {
  code: string;
  name: string;
  path: string;
};

export type MapDepartment = {
  code: string;
  name: string;
  region: string;
  path: string;
};

export const MAP_VIEWBOX = "0 0 860 760";
