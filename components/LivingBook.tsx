"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { LivingBookFallback } from "./LivingBookFallback";

const LivingBook3D = dynamic(() => import("./LivingBook3D").then((mod) => mod.LivingBook3D), {
  ssr: false,
  loading: () => <LivingBookFallback />,
});

export function LivingBook() {
  return (
    <Suspense fallback={<LivingBookFallback />}>
      <LivingBook3D fallback={<LivingBookFallback />} />
    </Suspense>
  );
}
