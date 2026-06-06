"use client";

import { useRef, type CSSProperties, type PointerEvent } from "react";

export function LivingBookFallback() {
  const stageRef = useRef<HTMLDivElement>(null);
  const letters = ["D", "É", "D", "I", "C", "A", "L", "I", "V", "R", "E", "S"];

  function handleMove(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--book-x", `${x.toFixed(3)}`);
    event.currentTarget.style.setProperty("--book-y", `${y.toFixed(3)}`);
  }

  function handleLeave(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--book-x", "0");
    event.currentTarget.style.setProperty("--book-y", "0");
  }

  return (
    <div
      ref={stageRef}
      className="living-stage living-stage-v3 living-type-fallback"
      aria-label="Signature typographique Dédicalivres"
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
    >
      <div className="book-aura aura-deep" />
      <div className="book-aura aura-gold" />
      <div className="book-orbit orbit-a" />
      <div className="book-orbit orbit-b" />
      <div className="book-orbit orbit-c" />
      <div className="constellation-ring" />
      <div className="type-fallback-core" aria-hidden="true">
        {letters.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            style={{
              "--letter-index": index,
              "--letter-angle": `${index * 30}deg`,
              "--letter-angle-invert": `${index * -30}deg`,
              "--letter-depth": `${index * 1.8}px`,
            } as CSSProperties}
          >
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}
