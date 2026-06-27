import type { Metadata } from "next";
import "./globals.css";
import MainNavigation from "@/components/MainNavigation";

export const metadata: Metadata = {
  metadataBase: new URL("https://v2.dedicalivres.fr"),
  title: {
    default: "Dédicalivres — Agenda littéraire francophone",
    template: "%s | Dédicalivres",
  },
  description:
    "Salons du livre, festivals, dédicaces et rencontres littéraires en France, Belgique, Suisse, Luxembourg et Monaco.",
  keywords: [
    "salon du livre",
    "festival littéraire",
    "dédicace",
    "agenda littéraire",
    "francophonie",
    "France",
    "Belgique",
    "Suisse",
    "Luxembourg",
    "Monaco",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Dédicalivres",
    locale: "fr_FR",
    title: "Dédicalivres — Agenda littéraire francophone",
    description:
      "Salons du livre, festivals, dédicaces et rencontres littéraires dans tout l’espace francophone.",
    url: "https://v2.dedicalivres.fr",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dédicalivres — Agenda littéraire francophone",
    description:
      "Salons du livre, festivals, dédicaces et rencontres littéraires dans tout l’espace francophone.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body><MainNavigation />{children}</body>
    </html>
  );
}
