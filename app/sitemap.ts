import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import {
  FRANCOPHONE_COUNTRIES,
  countryTerritories,
} from "@/lib/francophone";

const BASE_URL = "https://v2.dedicalivres.fr";

// Régénère le sitemap au plus une fois par heure.
export const revalidate = 3600;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/evenements`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/salons-festivals`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/soumettre`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  // Routes pays — une par pays francophone.
  const countryRoutes: MetadataRoute.Sitemap = FRANCOPHONE_COUNTRIES.map((country) => ({
    url: `${BASE_URL}/pays/${country.code.toLowerCase()}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: 0.85,
  }));

  // Routes territoire — une par subdivision de chaque pays.
  const territoryRoutes: MetadataRoute.Sitemap = FRANCOPHONE_COUNTRIES.flatMap((country) =>
    countryTerritories(country.code).map((territory) => ({
      url: `${BASE_URL}/pays/${country.code.toLowerCase()}/${slugify(territory.name)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.75,
    }))
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return [...staticRoutes, ...countryRoutes, ...territoryRoutes];
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("validated", true)
      .eq("rejected", false)
      .limit(5000);

    if (error || !data) {
      return [...staticRoutes, ...countryRoutes, ...territoryRoutes];
    }

    const pick = (row: Record<string, unknown>, keys: string[]) => {
      for (const key of keys) {
        const v = row[key];
        if (v !== null && v !== undefined && String(v).trim()) return String(v).trim();
      }
      return "";
    };

    const eventRoutes: MetadataRoute.Sitemap = (data as Record<string, unknown>[])
      .map((row) => {
        const identifier = pick(row, ["id", "event_id", "uuid", "slug"]);
        if (!identifier) return null;
        const last = pick(row, ["updated_at", "modified_at", "created_at", "start_date", "date"]);
        const lastModified = last && !Number.isNaN(new Date(last).getTime()) ? new Date(last) : new Date();
        return {
          url: `${BASE_URL}/evenements/${encodeURIComponent(identifier)}`,
          lastModified,
          changeFrequency: "weekly" as const,
          priority: 0.6,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    return [...staticRoutes, ...countryRoutes, ...territoryRoutes, ...eventRoutes];
  } catch {
    return [...staticRoutes, ...countryRoutes, ...territoryRoutes];
  }
}
