import type { NextConfig } from "next";

const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot,
  },
  // Hôtes distants autorisés pour l'optimisation d'images (next/image).
  // Prépare la migration des <img> vers <Image> : R2 (images événements) et
  // Supabase Storage (anciennes images / portraits).
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "pub-45a59368068e48578d3b1a1bb519c543.r2.dev" },
      { protocol: "https", hostname: "pwyetrqyiaxpzjrafpvb.supabase.co" },
    ],
  },
};

export default nextConfig;
