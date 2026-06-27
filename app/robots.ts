import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin-v2", "/espace"],
    },
    sitemap: "https://v2.dedicalivres.fr/sitemap.xml",
    host: "https://v2.dedicalivres.fr",
  };
}
