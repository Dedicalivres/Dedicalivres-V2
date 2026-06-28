"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";

type LivingBook3DProps = {
  fallback: ReactNode;
};

const letters = Array.from("DÉDICALIVRES");

const idlePositions = [
  [-38, -20, -18],
  [-18, -34, 22],
  [10, -24, -12],
  [34, -8, 28],
  [42, 18, -18],
  [24, 36, 16],
  [-2, 30, -28],
  [-28, 12, 20],
  [-42, -2, -8],
  [-10, -44, -24],
  [24, -38, 8],
  [46, -24, -6],
];

export function LivingBook3D({ fallback: _fallback }: LivingBook3DProps) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const stateRef = useRef({
    pointerX: 0,
    pointerY: 0,
    targetX: 0,
    targetY: 0,
    wheel: 0,
    hold: 0,
    holdTarget: 0,
    holdUntil: 0,
    burst: 0,
    raf: 0,
  });

  useEffect(() => {
    const stageElement = stageRef.current;
    if (!stageElement) return;
    const stage = stageElement;

    const letterNodes = Array.from(stage.querySelectorAll<HTMLElement>(".living-type-letter"));
    const startedAt = performance.now();
    let holdTimer: number | undefined;
    let pressing = false;

    function setPointer(clientX: number, clientY: number) {
      const rect = stage.getBoundingClientRect();
      stateRef.current.targetX = ((clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2;
      stateRef.current.targetY = ((clientY - rect.top) / Math.max(rect.height, 1) - 0.5) * 2;
    }

    function handlePointerMove(event: PointerEvent) {
      setPointer(event.clientX, event.clientY);
    }

    function handlePointerLeave() {
      stateRef.current.targetX = 0;
      stateRef.current.targetY = 0;
      pressing = false;
      stateRef.current.holdTarget = 0;
      if (holdTimer) window.clearTimeout(holdTimer);
    }

    function handlePointerDown(event: PointerEvent) {
      event.preventDefault();
      setPointer(event.clientX, event.clientY);
      pressing = true;
      stateRef.current.holdTarget = 0.36;
      stateRef.current.burst = 1;
      if (holdTimer) window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => {
        if (!pressing) return;
        stateRef.current.holdTarget = 1;
        stateRef.current.burst = 1.4;
      }, 260);
    }

    function handlePointerUp() {
      pressing = false;
      if (holdTimer) window.clearTimeout(holdTimer);
      const shouldHold = stateRef.current.hold > 0.18 || stateRef.current.holdTarget > 0.5;
      stateRef.current.holdTarget = shouldHold ? 1 : 0;
      stateRef.current.holdUntil = shouldHold ? performance.now() + 1150 : 0;
      stateRef.current.burst = shouldHold ? 1.25 : 0.8;
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      stateRef.current.wheel += Math.max(-2.6, Math.min(2.6, event.deltaY / 120)) * 0.9;
      stateRef.current.burst = Math.max(stateRef.current.burst, 0.55);
    }

    function animate(now: number) {
      const state = stateRef.current;
      const elapsed = (now - startedAt) / 1000;

      state.pointerX += (state.targetX - state.pointerX) * 0.08;
      state.pointerY += (state.targetY - state.pointerY) * 0.08;
      state.wheel *= 0.9;
      state.burst *= 0.9;
      if (!pressing && state.holdUntil && now > state.holdUntil) {
        state.holdUntil = 0;
        state.holdTarget = 0;
      }
      state.hold += (state.holdTarget - state.hold) * 0.11;

      stage.style.setProperty("--living-x", state.pointerX.toFixed(3));
      stage.style.setProperty("--living-y", state.pointerY.toFixed(3));
      stage.style.setProperty("--living-hold", state.hold.toFixed(3));
      stage.style.setProperty("--living-burst", state.burst.toFixed(3));

      const stageWidth = stage.clientWidth || 430;
      const stageHeight = stage.clientHeight || 350;
      const spreadX = Math.min(230, stageWidth * 0.34);
      const spreadY = Math.min(150, stageHeight * 0.31);
      const compactWordScale = stageWidth < 520 ? 0.9 : 1;
      const formedSpacing = Math.max(30, Math.min(44, (stageWidth - 110) / Math.max(letters.length - 1, 1))) * compactWordScale;

      letterNodes.forEach((node, index) => {
        const [idleX, idleY, idleZ] = idlePositions[index];
        const idlePxX = (idleX / 46) * spreadX;
        const idlePxY = (idleY / 44) * spreadY;
        const formedX = (index - (letters.length - 1) / 2) * formedSpacing;
        const formedY = -10 + Math.sin(index * 0.7) * 4;
        const phase = elapsed * (0.72 + index * 0.025) + index * 0.64;
        const driftX = Math.sin(phase * 0.82) * 18 + state.pointerX * 26 + state.wheel * 2.6;
        const driftY = Math.cos(phase) * 16 - state.pointerY * 20;
        const x = idlePxX + driftX + (formedX - idlePxX) * state.hold;
        const y = idlePxY + driftY + (formedY - idlePxY) * state.hold;
        const z = idleZ + Math.sin(phase * 0.54) * 42 * (1 - state.hold);
        const rotY = Math.sin(phase) * 42 * (1 - state.hold) + state.wheel * (28 + index * 1.2) + state.pointerX * 18;
        const rotX = Math.cos(phase * 0.76) * 18 * (1 - state.hold) - state.pointerY * 12;
        const rotZ = Math.sin(phase * 0.42) * 10 * (1 - state.hold);
        const formedScale = 1 - state.hold * (1 - compactWordScale);
        const scale = (1 + state.hold * 0.18 + state.burst * 0.08) * formedScale;

        node.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${z.toFixed(2)}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) rotateZ(${rotZ.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        node.style.opacity = String(0.58 + Math.abs(Math.cos((rotY * Math.PI) / 180)) * 0.36 + state.hold * 0.16);
      });

      state.raf = window.requestAnimationFrame(animate);
    }

    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerleave", handlePointerLeave);
    stage.addEventListener("pointerdown", handlePointerDown);
    stage.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
    stateRef.current.raf = window.requestAnimationFrame(animate);

    return () => {
      stage.removeEventListener("pointermove", handlePointerMove);
      stage.removeEventListener("pointerleave", handlePointerLeave);
      stage.removeEventListener("pointerdown", handlePointerDown);
      stage.removeEventListener("wheel", handleWheel);
      window.removeEventListener("pointerup", handlePointerUp);
      if (holdTimer) window.clearTimeout(holdTimer);
      window.cancelAnimationFrame(stateRef.current.raf);
    };
  }, []);

  return (
    <div ref={stageRef} className="living-book-3d-stage living-type-stage" aria-label="Noyau typographique vivant Dédicalivres">
      <div className="book-3d-haze" />
      <div className="book-3d-constellation" />
      <div className="living-type-orbit orbit-one" />
      <div className="living-type-orbit orbit-two" />
      <div className="living-type-core" />
      <div className="living-type-word" aria-hidden="true">
        {letters.map((letter, index) => (
          <span className="living-type-letter" style={{ "--i": index } as CSSProperties} key={`${letter}-${index}`}>
            {letter}
          </span>
        ))}
      </div>
    </div>
  );
}
