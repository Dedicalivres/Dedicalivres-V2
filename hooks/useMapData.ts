// hooks/useMapData.ts
// Charge les données SVG de la carte France (régions + départements)
// uniquement quand le composant ImmersiveMap est monté.
// Évite d'envoyer 370 Ko au navigateur sur toutes les pages.

import { useEffect, useState } from "react";
import type { MapRegion, MapDepartment } from "@/components/mapData";

type MapDataState = {
  regions: MapRegion[];
  departments: MapDepartment[];
  loading: boolean;
  error: string | null;
};

let cachedRegions: MapRegion[] | null = null;
let cachedDepartments: MapDepartment[] | null = null;

export function useMapData(): MapDataState {
  const [state, setState] = useState<MapDataState>({
    regions: cachedRegions ?? [],
    departments: cachedDepartments ?? [],
    loading: cachedRegions === null || cachedDepartments === null,
    error: null,
  });

  useEffect(() => {
    // Si déjà en cache (navigation SPA), pas de fetch
    if (cachedRegions !== null && cachedDepartments !== null) {
      setState({ regions: cachedRegions, departments: cachedDepartments, loading: false, error: null });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [regionsRes, departmentsRes] = await Promise.all([
          fetch("/data/france-regions.json"),
          fetch("/data/france-departments.json"),
        ]);

        if (!regionsRes.ok || !departmentsRes.ok) {
          throw new Error("Impossible de charger les données cartographiques.");
        }

        const [regions, departments] = await Promise.all([
          regionsRes.json() as Promise<MapRegion[]>,
          departmentsRes.json() as Promise<MapDepartment[]>,
        ]);

        // Mise en cache module-level pour les navigations SPA suivantes
        cachedRegions = regions;
        cachedDepartments = departments;

        if (!cancelled) {
          setState({ regions, departments, loading: false, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            loading: false,
            error: err instanceof Error ? err.message : "Erreur de chargement de la carte.",
          }));
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
