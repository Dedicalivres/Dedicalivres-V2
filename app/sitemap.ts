import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://v2.dedicalivres.fr";

// Régénère le sitemap au plus une fois par heure.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/evenements`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/salons-festivals`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${BASE_URL}/soumettre`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return staticRoutes;

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    // select("*") pour ne dépendre d'aucune colonne précise (schéma tolérant).
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("validated", true)
      .eq("rejected", false)
      .limit(5000);

    if (error || !data) return staticRoutes;

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

    return [...staticRoutes, ...eventRoutes];
  } catch {
    return staticRoutes;
  }
}
