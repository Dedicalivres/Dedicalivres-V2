import type { Metadata } from "next";
import "./globals.css";
import MainNavigation from "@/components/MainNavigation";

export const metadata: Metadata = {
  title: "Dédicalivres Immersive V2 — Agenda littéraire francophone",
  description: "Salons, festivals, dédicaces et rencontres littéraires dans l’espace francophone.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body><MainNavigation />{children}</body>
    </html>
  );
}
