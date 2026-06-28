"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { LivingBookFallback } from "./LivingBookFallback";

const GrimoireVivant = dynamic(
  () => import("./GrimoireVivant").then((mod) => ({ default: mod.GrimoireVivant })),
  { ssr: false, loading: () => <LivingBookFallback /> }
);

export function LivingBook() {
  return (
    <div className="living-stage grimoire-stage" aria-hidden="false">
      <Suspense fallback={<LivingBookFallback />}>
        <GrimoireVivant />
      </Suspense>
    </div>
  );
}
