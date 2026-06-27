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
    const { data, error } = await supabase
      .from("events")
      .select("id, slug, updated_at, created_at")
      .eq("validated", true)
      .eq("rejected", false)
      .limit(5000);

    if (error || !data) return staticRoutes;

    const eventRoutes: MetadataRoute.Sitemap = (data as Record<string, unknown>[])
      .map((row) => {
        const identifier = String(row.id ?? row.slug ?? "").trim();
        if (!identifier) return null;
        const last = row.updated_at ?? row.created_at;
        return {
          url: `${BASE_URL}/evenements/${encodeURIComponent(identifier)}`,
          lastModified: last ? new Date(String(last)) : new Date(),
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
