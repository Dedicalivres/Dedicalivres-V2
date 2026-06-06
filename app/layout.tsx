import type { Metadata } from "next";
import "./globals.css";
import MainNavigation from "@/components/MainNavigation";

export const metadata: Metadata = {
  title: "Dédicalivres Immersive V2 — Émeraude Prestige",
  description: "Hero premium, Livre Vivant V1 et teaser France immersive pour Dédicalivres V2.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body><MainNavigation />{children}</body>
    </html>
  );
}
