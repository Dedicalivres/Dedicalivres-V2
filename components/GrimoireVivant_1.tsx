"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";

type GrimoireVivantProps = {
  fallback?: ReactNode;
};

const FLASH_DUR = 3200;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const FLASH_LAYERS = [
  { r: 0.15, op: 0.55, c: "255,210,80" }, { r: 0.22, op: 0.42, c: "240,185,50" },
  { r: 0.30, op: 0.35, c: "220,165,30" }, { r: 0.40, op: 0.28, c: "255,200,60" },
  { r: 0.50, op: 0.22, c: "230,170,20" }, { r: 0.60, op: 0.16, c: "200,140,10" },
  { r: 0.70, op: 0.12, c: "215,155,25" }, { r: 0.80, op: 0.09, c: "180,120,8" },
  { r: 0.90, op: 0.06, c: "160,100,5" }, { r: 1.02, op: 0.04, c: "140,85,2" },
  { r: 1.15, op: 0.025, c: "120,70,0" }, { r: 1.30, op: 0.012, c: "100,55,0" },
];

function noise(x: number, y: number, t: number) {
  return Math.sin(x * 0.8 + t * 1.1) * Math.cos(y * 0.6 + t * 0.7)
    + Math.sin(x * 0.4 - t * 0.8) * Math.cos(y * 1.1 + t * 0.5) * 0.5
    + Math.cos(x * 1.2 + t * 0.4) * Math.sin(y * 0.3 - t * 0.9) * 0.3;
}

export function GrimoireVivant({ fallback: _fallback }: GrimoireVivantProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const coverCvsRef = useRef<HTMLCanvasElement>(null);
  const flashCvsRef = useRef<HTMLCanvasElement>(null);
  const featherRef = useRef<HTMLDivElement>(null);
  const writingSvgRef = useRef<SVGSVGElement>(null);
  const stateRef = useRef({
    mx: 0, my: 0, tx: 0, ty: 0, scroll: 0,
    isOpen: false, writeStarted: false, lastClick: 0,
    flashActive: false, flashStart: 0, flashCx: 0, flashCy: 0,
    raf: 0, flashNodesInit: false,
  });
  const audioCtxRef = useRef<AudioContext | null>(null);
  const veinsRef = useRef<Array<{ x: number; y: number; cp1x: number; cp1y: number; cp2x: number; cp2y: number; ex: number; ey: number; c: string; w: number; ph: number }>>([]);
  const nodesRef = useRef<Array<{ x: number; y: number; r: number; ph: number; sp: number; c: string }>>([]);

  const getAC = useCallback(async () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") {
      await audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playCrystal = useCallback(async () => {
    try {
      const ac = await getAC(); const t = ac.currentTime;
      const m = ac.createGain(); m.gain.setValueAtTime(0.14, t); m.gain.exponentialRampToValueAtTime(0.001, t + 0.5); m.connect(ac.destination);
      [1046.5, 1318.5, 1568].forEach((f, i) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime([0.9, 0.55, 0.3][i], t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.48);
        o.connect(g); g.connect(m); o.start(t); o.stop(t + 0.52);
      });
    } catch (e) {}
  }, [getAC]);

  const playBookOpen = useCallback(async () => {
    try {
      const ac = await getAC(); const t = ac.currentTime;
      const len = Math.floor(ac.sampleRate * 2.5);
      const rb = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = rb.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.2); }
      const rv = ac.createConvolver(); rv.buffer = rb;
      const rvg = ac.createGain(); rvg.gain.setValueAtTime(0.3, t); rv.connect(rvg); rvg.connect(ac.destination);
      const dry = ac.createGain(); dry.gain.setValueAtTime(0.7, t); dry.connect(ac.destination);
      ([[0, 180, 0.7], [0.06, 280, 0.45], [0.10, 350, 0.3], [0.18, 220, 0.22]] as [number, number, number][]).forEach(([dt, fr, vol]) => {
        const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.1), ac.sampleRate);
        const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const s = ac.createBufferSource(); s.buffer = nb;
        const f = ac.createBiquadFilter(); f.type = "bandpass"; f.frequency.setValueAtTime(fr, t); f.Q.setValueAtTime(1.2, t);
        const g = ac.createGain(); g.gain.setValueAtTime(vol, t + dt); g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.09);
        s.connect(f); f.connect(g); g.connect(dry); g.connect(rv); s.start(t + dt); s.stop(t + dt + 0.12);
      });
      ([[0.12, 0.28, 1200, 0.18], [0.28, 0.22, 1800, 0.13], [0.42, 0.30, 1400, 0.10], [0.60, 0.20, 2000, 0.07], [0.76, 0.18, 1600, 0.05]] as [number, number, number, number][]).forEach(([dt, dur, fr, vol]) => {
        const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * dur), ac.sampleRate);
        const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
        const s = ac.createBufferSource(); s.buffer = nb;
        const hp = ac.createBiquadFilter(); hp.type = "highpass"; hp.frequency.setValueAtTime(fr, t);
        const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.setValueAtTime(fr * 3.5, t);
        const g = ac.createGain(); g.gain.setValueAtTime(0, t + dt); g.gain.linearRampToValueAtTime(vol, t + dt + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + dt + dur);
        s.connect(hp); hp.connect(lp); lp.connect(g); g.connect(dry); g.connect(rv); s.start(t + dt); s.stop(t + dt + dur + 0.05);
      });
      [196, 246.9, 293.7, 392, 493.9].forEach((f, i) => {
        const o = ac.createOscillator(); const g = ac.createGain();
        o.type = i < 2 ? "sine" : "triangle"; o.frequency.setValueAtTime(f, t);
        const s = t + 0.35 + i * 0.18;
        g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime([0.12, 0.10, 0.08, 0.06, 0.04][i], s + 0.4); g.gain.exponentialRampToValueAtTime(0.001, s + 2.8);
        o.connect(g); g.connect(dry); g.connect(rv); o.start(s); o.stop(s + 3.2);
      });
    } catch (e) {}
  }, [getAC]);

  const spawnLetter = useCallback((x: number, y: number) => {
    const root = rootRef.current; if (!root) return;
    const el = document.createElement("div");
    const dx = (Math.random() - 0.5) * 65; const dy = -(20 + Math.random() * 55);
    const r0 = (Math.random() - 0.5) * 12; const r1 = (Math.random() - 0.5) * 40;
    const dur = 900 + Math.random() * 900;
    const c = Math.random() > 0.5 ? "rgba(212,177,106,0.85)" : "rgba(150,255,200,0.75)";
    el.style.cssText = `position:absolute;pointer-events:none;z-index:90;font-family:Georgia,serif;left:${x}px;top:${y}px;color:${c};font-size:${9 + Math.random() * 8}px;animation:gv-lf ${dur}ms ease-out forwards;--dx:${dx}px;--dy:${dy}px;--r0:${r0}deg;--r1:${r1}deg`;
    el.textContent = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    root.appendChild(el); setTimeout(() => el.remove(), dur + 100);
  }, []);

  const spawnSpark = useCallback((x: number, y: number) => {
    const root = rootRef.current; if (!root) return;
    const el = document.createElement("canvas");
    const s = 8 + Math.random() * 14; el.width = s * 4; el.height = s * 4;
    el.style.cssText = `position:absolute;pointer-events:none;z-index:90;left:${x - s * 2}px;top:${y - s * 2}px`;
    const c = Math.random() > 0.5 ? `rgba(212,177,106,${0.7 + Math.random() * 0.3})` : `rgba(90,240,160,${0.6 + Math.random() * 0.3})`;
    const ctx = el.getContext("2d")!; ctx.fillStyle = c; ctx.strokeStyle = c; ctx.lineWidth = 0.8;
    const cx2 = s * 2; const cy2 = s * 2; const sz = s * 0.6;
    const type = Math.floor(Math.random() * 5);
    if (type === 0) { ctx.beginPath(); const pts = 3 + Math.floor(Math.random() * 4); for (let i = 0; i < pts; i++) { const a = i * (Math.PI * 2 / pts) + (Math.random() - 0.5) * 0.7; const r = sz * (0.5 + Math.random() * 0.8); i === 0 ? ctx.moveTo(cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r) : ctx.lineTo(cx2 + Math.cos(a) * r, cy2 + Math.sin(a) * r); } ctx.closePath(); ctx.fill(); }
    else if (type === 1) { const a = Math.random() * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(a) * sz * 1.4, cy2 + Math.sin(a) * sz * 1.4); ctx.stroke(); }
    else if (type === 2) { ctx.beginPath(); ctx.moveTo(cx2 - sz, cy2); ctx.lineTo(cx2 + sz, cy2); ctx.moveTo(cx2, cy2 - sz); ctx.lineTo(cx2, cy2 + sz); ctx.stroke(); }
    else if (type === 3) { for (let i = 0; i < 3; i++) { const a = i * (Math.PI * 2 / 3) + Math.random() * 0.5; ctx.beginPath(); ctx.moveTo(cx2, cy2); ctx.lineTo(cx2 + Math.cos(a) * sz * 1.5, cy2 + Math.sin(a) * sz * 1.5); ctx.stroke(); } }
    else { ctx.beginPath(); ctx.arc(cx2, cy2, sz * 0.7, Math.random() * Math.PI, (Math.random() + 1) * Math.PI); ctx.stroke(); }
    const dx = (Math.random() - 0.5) * 80; const dy = -(20 + Math.random() * 70);
    const r0 = (Math.random() - 0.5) * 20; const r1 = (Math.random() - 0.5) * 60; const dur = 700 + Math.random() * 900;
    el.style.animation = `gv-spk ${dur}ms ease-out forwards`;
    el.style.setProperty("--dx", `${dx}px`); el.style.setProperty("--dy", `${dy}px`);
    el.style.setProperty("--r0", `${r0}deg`); el.style.setProperty("--r1", `${r1}deg`);
    root.appendChild(el); setTimeout(() => el.remove(), dur + 100);
  }, []);

  const startWriting = useCallback(async () => {
    const st = stateRef.current; if (st.writeStarted) return; st.writeStarted = true;
    const fw = featherRef.current; const svg = writingSvgRef.current;
    const root = rootRef.current; if (!fw || !svg || !root) return;
    const fwNN = fw;
    fwNN.style.opacity = "1";
    const seq = [
      { rect: "gv-cr-b", x0: 5, x1: 255, ySvg: 138, dur: 1560, delay: 0, fullW: 260 },
      { rect: "gv-cr-d", x0: 5, x1: 255, ySvg: 182, dur: 1920, delay: 1700, fullW: 260 },
    ];
    for (const s of seq) {
      await new Promise<void>(resolve => {
        setTimeout(() => {
          const el = document.getElementById(s.rect) as SVGRectElement | null; if (!el) { resolve(); return; }
          const elNN = el;
          const pr = svg.getBoundingClientRect(); const sr = root.getBoundingClientRect();
          const scX = pr.width / 260; const scY = pr.height / 340;
          const start = performance.now(); let lastL = 0;
          function step(now: number) {
            const p = Math.min(1, (now - start) / s.dur);
            const ease = 1 - Math.pow(1 - p, 3);
            elNN.setAttribute("width", String(s.fullW * ease));
            const cx = (s.x0 + (s.x1 - s.x0) * ease) * scX + (pr.left - sr.left);
            const cy = s.ySvg * scY + (pr.top - sr.top);
            fwNN.style.left = `${cx}px`; fwNN.style.top = `${cy}px`;
            fwNN.style.transform = `translate(-50%,-100%) rotate(${-38 + Math.sin(now * 0.021) * 2.8}deg)`;
            if (now - lastL > 140) { spawnLetter(cx, cy); spawnSpark(cx, cy); lastL = now; }
            if (p < 1) requestAnimationFrame(step); else resolve();
          }
          requestAnimationFrame(step);
        }, s.delay);
      });
    }
    await new Promise(r => setTimeout(r, 700));
    fwNN.style.opacity = "0";
  }, [spawnLetter, spawnSpark]);

  const toggleBook = useCallback(async (cx: number, cy: number) => {
    const st = stateRef.current; const cover = coverRef.current; const root = rootRef.current; if (!cover || !root) return;
    st.isOpen = !st.isOpen;
    cover.classList.toggle("gv-open", st.isOpen);
    if (st.isOpen) {
      await playBookOpen();
      st.flashActive = true; st.flashStart = performance.now(); st.flashCx = cx; st.flashCy = cy;
      for (let i = 0; i < 10; i++) setTimeout(() => {
        spawnSpark(cx + (Math.random() - 0.5) * 50, cy + (Math.random() - 0.5) * 50);
        if (Math.random() > 0.5) spawnLetter(cx + (Math.random() - 0.5) * 70, cy + (Math.random() - 0.5) * 35);
      }, 800 + i * 35);
      setTimeout(() => startWriting(), FLASH_DUR + 200);
    } else {
      const fc = flashCvsRef.current?.getContext("2d");
      if (fc && flashCvsRef.current) fc.clearRect(0, 0, flashCvsRef.current.width, flashCvsRef.current.height);
      st.flashActive = false;
    }
  }, [playBookOpen, spawnSpark, spawnLetter, startWriting]);

  useEffect(() => {
    const root = rootRef.current; if (!root) return;

    // Injecter keyframes CSS dynamiquement
    const styleId = "gv-styles";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
        @keyframes gv-spk{0%{opacity:1;transform:translate(0,0) scale(1) rotate(var(--r0))}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(0) rotate(var(--r1))}}
        @keyframes gv-lf{0%{opacity:.9;transform:translate(0,0) scale(1) rotate(var(--r0))}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.3) rotate(var(--r1))}}
        .gv-open{transform:rotateY(-174deg) translateZ(18px) !important}
      `;
      document.head.appendChild(style);
    }

    // Init canvas
    const cvs = coverCvsRef.current; const flashCvs = flashCvsRef.current;
    let c2: CanvasRenderingContext2D | null = null;
    let fc: CanvasRenderingContext2D | null = null;
    if (cvs) { cvs.width = 260; cvs.height = 340; c2 = cvs.getContext("2d"); }

    function resizeFlash() {
      const r = root!.getBoundingClientRect();
      if (flashCvs) { flashCvs.width = r.width || 800; flashCvs.height = r.height || 560; fc = flashCvs.getContext("2d"); }
    }
    resizeFlash();
    const ro = new ResizeObserver(resizeFlash); ro.observe(root);

    // Init veins & nodes
    veinsRef.current = Array.from({ length: 14 }, () => ({
      x: Math.random() * 260, y: 0, cp1x: Math.random() * 260, cp1y: 60 + Math.random() * 100,
      cp2x: Math.random() * 260, cp2y: 180 + Math.random() * 100, ex: Math.random() * 260, ey: 340,
      c: Math.random() > 0.5 ? "rgba(70,210,130," : "rgba(200,165,90,", w: 0.3 + Math.random() * 1, ph: Math.random() * Math.PI * 2,
    }));
    nodesRef.current = Array.from({ length: 28 }, () => ({
      x: 10 + Math.random() * 240, y: 10 + Math.random() * 320, r: 1.5 + Math.random() * 3.5,
      ph: Math.random() * Math.PI * 2, sp: 0.6 + Math.random() * 1.5,
      c: Math.random() > 0.5 ? "rgba(55,200,120," : "rgba(200,165,90,",
    }));

    const st = stateRef.current;

    function drawCover(t: number) {
      if (!c2) return; const c2NN = c2; const w = 260; const h = 340; c2NN.clearRect(0, 0, w, h);
      veinsRef.current.forEach(v => { const a = 0.15 + Math.sin(t * 0.5 + v.ph) * 0.13; c2NN.beginPath(); c2NN.moveTo(v.x, v.y); c2NN.bezierCurveTo(v.cp1x, v.cp1y, v.cp2x, v.cp2y, v.ex, v.ey); c2NN.strokeStyle = v.c + a + ")"; c2NN.lineWidth = v.w; c2NN.stroke(); });
      c2NN.save(); c2NN.globalAlpha = 0.07 + Math.sin(t * 0.3) * 0.025;
      for (let gx = 14; gx < w; gx += 28) for (let gy = 12; gy < h; gy += 24) { c2NN.beginPath(); for (let k = 0; k < 6; k++) { const a2 = k * Math.PI / 3; k === 0 ? c2NN.moveTo(gx + Math.cos(a2) * 7, gy + Math.sin(a2) * 7) : c2NN.lineTo(gx + Math.cos(a2) * 7, gy + Math.sin(a2) * 7); } c2NN.closePath(); c2NN.strokeStyle = "rgba(110,240,155,.9)"; c2NN.lineWidth = 0.35; c2NN.stroke(); }
      c2NN.restore();
      nodesRef.current.forEach(n => { const a = 0.35 + Math.sin(t * n.sp + n.ph) * 0.5; const g = c2NN.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 4); g.addColorStop(0, n.c + a + ")"); g.addColorStop(1, n.c + "0)"); c2NN.beginPath(); c2NN.arc(n.x, n.y, n.r * 4, 0, Math.PI * 2); c2NN.fillStyle = g; c2NN.fill(); c2NN.beginPath(); c2NN.arc(n.x, n.y, n.r, 0, Math.PI * 2); c2NN.fillStyle = n.c + Math.min(1, a + 0.15) + ")"; c2NN.fill(); });
      const lx = (st.tx * 0.5 + 0.5) * w; const ly = (st.ty * 0.5 + 0.5) * h;
      const lg = c2NN.createRadialGradient(lx, ly, 0, lx, ly, w * 0.55); lg.addColorStop(0, "rgba(65,210,110,.28)"); lg.addColorStop(1, "transparent");
      c2NN.fillStyle = lg; c2NN.fillRect(0, 0, w, h);
    }

    function drawFlash(now: number) {
      if (!fc || !flashCvs || !st.flashActive) return;
      const fcNN = fc; const fcvsNN = flashCvs;
      const el = now - st.flashStart;
      if (el > FLASH_DUR) { st.flashActive = false; fcNN.clearRect(0, 0, fcvsNN.width, fcvsNN.height); return; }
      const p = el / FLASH_DUR; const w = fcvsNN.width; const h = fcvsNN.height;
      fcNN.clearRect(0, 0, w, h);
      let env = p < 0.18 ? p / 0.18 : p < 0.55 ? 1 : 1 - (p - 0.55) / 0.45;
      env = Math.max(0, Math.min(1, env));
      const cx = st.flashCx; const cy = st.flashCy; const diag = Math.sqrt(w * w + h * h); const ep = Math.pow(p, 0.55); const t2 = el / 1000 * 0.8;
      FLASH_LAYERS.forEach((l, i) => {
        const nx = noise(i * 1.3, 0, t2) * 28 * (1 - p * 0.6); const ny = noise(0, i * 1.1, t2 + 1.5) * 22 * (1 - p * 0.6);
        const r = diag * l.r * ep;
        const g = fcNN.createRadialGradient(cx + nx, cy + ny, 0, cx + nx, cy + ny, r);
        const op = l.op * env * (1 - p * 0.15);
        g.addColorStop(0, `rgba(${l.c},${Math.min(0.95, op)})`); g.addColorStop(0.35, `rgba(${l.c},${op * 0.6})`); g.addColorStop(0.7, `rgba(${l.c},${op * 0.18})`); g.addColorStop(1, `rgba(${l.c},0)`);
        fcNN.globalCompositeOperation = "lighter"; fcNN.fillStyle = g; fcNN.beginPath(); fcNN.arc(cx + nx, cy + ny, r, 0, Math.PI * 2); fcNN.fill();
      });
      const hg = fcNN.createRadialGradient(cx, cy, 0, cx, cy, diag * 0.18 * ep); const hop = 0.7 * env * (1 - p * 0.3);
      hg.addColorStop(0, `rgba(255,230,120,${Math.min(0.9, hop)})`); hg.addColorStop(0.5, `rgba(240,200,60,${hop * 0.4})`); hg.addColorStop(1, "rgba(200,150,10,0)");
      fcNN.fillStyle = hg; fcNN.beginPath(); fcNN.arc(cx, cy, diag * 0.18 * ep, 0, Math.PI * 2); fcNN.fill();
      fcNN.globalCompositeOperation = "source-over";
    }

    function animMedal(t: number) {
      const mc = document.getElementById("gv-mc"); const ms = document.getElementById("gv-mstar");
      if (mc) mc.setAttribute("r", String(3 + Math.sin(t * 1.8) * 1.2));
      if (ms) ms.setAttribute("transform", `translate(130,170) rotate(${t * 8})`);
    }
    function animFS(t: number) {
      ["gv-fs0","gv-fs1","gv-fs2","gv-fs3","gv-fs4","gv-fs5"].forEach((id, i) => {
        const el = document.getElementById(id); if (!el) return;
        const ph = t * 2.2 + i * 0.9;
        el.setAttribute("opacity", String(0.2 + Math.sin(ph) * 0.65));
        el.setAttribute("transform", `translate(${Math.sin(ph * 0.7) * 4},${Math.cos(ph * 0.95) * 4})`);
      });
    }

    function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

    let intervalId: ReturnType<typeof setInterval>;
    function animate(now: number) {
      st.tx = lerp(st.tx, st.mx, 0.055); st.ty = lerp(st.ty, st.my, 0.055); st.scroll *= 0.91;
      const oa = st.isOpen ? -34 : 0;
      const wrap = wrapRef.current;
      if (wrap) wrap.style.transform = `rotateY(${-14 + st.tx * 28 + st.scroll * 20 + oa}deg) rotateX(${4 - st.ty * 14}deg) rotateZ(${st.tx * 1.8}deg)`;
      const t = now / 1000;
      drawCover(t); animMedal(t); animFS(t);
      if (st.flashActive) drawFlash(now);
      st.raf = requestAnimationFrame(animate);
    }
    st.raf = requestAnimationFrame(animate);

    intervalId = setInterval(() => {
      if (!st.isOpen) return;
      const r = root.getBoundingClientRect();
      spawnLetter(r.width / 2 + (Math.random() - 0.5) * 90, r.height * 0.4 + (Math.random() - 0.5) * 60);
    }, 380);

    // Events
    const onMouseMove = (e: MouseEvent) => {
      const r = root.getBoundingClientRect();
      st.mx = (e.clientX - r.left) / r.width * 2 - 1;
      st.my = (e.clientY - r.top) / r.height * 2 - 1;
    };
    const onMouseLeave = () => { st.mx = 0; st.my = 0; };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const r = root.getBoundingClientRect(); const t = e.touches[0];
      st.mx = (t.clientX - r.left) / r.width * 2 - 1;
      st.my = (t.clientY - r.top) / r.height * 2 - 1;
    };
    const onClick = async (e: MouseEvent) => {
      const now = Date.now(); const r = root.getBoundingClientRect();
      const cx = e.clientX - r.left; const cy = e.clientY - r.top;
      if (now - st.lastClick < 340) { await toggleBook(cx, cy); }
      else { await playCrystal(); spawnSpark(cx, cy); spawnLetter(cx, cy); }
      st.lastClick = now;
    };

    root.addEventListener("mousemove", onMouseMove);
    root.addEventListener("mouseleave", onMouseLeave);
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(st.raf);
      clearInterval(intervalId);
      ro.disconnect();
      root.removeEventListener("mousemove", onMouseMove);
      root.removeEventListener("mouseleave", onMouseLeave);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("click", onClick);
    };
  }, [toggleBook, playCrystal, spawnSpark, spawnLetter]);

  return (
    <div
      ref={rootRef}
      className="grimoire-vivant-root"
      style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", cursor: "none", background: "transparent" }}
      aria-label="Grimoire Vivant Dédicalivres — double-clic pour ouvrir"
    >
      {/* Flash canvas — au-dessus de tout */}
      <canvas ref={flashCvsRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 100 }} />

      {/* Scène 3D isolée */}
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", perspective: "1100px", zIndex: 2 }}>
        <div ref={wrapRef} style={{ transformStyle: "preserve-3d", position: "relative", width: 260, height: 340 }}>
          <div id="gv-book" style={{ width: 260, height: 340, transformStyle: "preserve-3d", position: "relative" }}>

            {/* Spine */}
            <div style={{ position: "absolute", left: -28, top: -4, width: 28, height: 350, transform: "rotateY(-90deg) translateZ(0)", transformOrigin: "right" }}>
              <svg width="28" height="350" viewBox="0 0 28 350" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="gv-sg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#030a05"/><stop offset="40%" stopColor="#0e2a14"/><stop offset="100%" stopColor="#040c06"/></linearGradient></defs>
                <path d="M0,4 C2,2 8,0 8,0 L22,0 C26,0 28,2 28,6 L28,344 C28,348 22,350 22,350 L6,350 C2,350 0,348 0,344 Z" fill="url(#gv-sg)"/>
                <rect x="3" y="55" width="22" height="5" rx="2" fill="rgba(212,177,106,0.35)"/>
                <rect x="3" y="120" width="22" height="5" rx="2" fill="rgba(212,177,106,0.3)"/>
                <rect x="3" y="220" width="22" height="5" rx="2" fill="rgba(212,177,106,0.3)"/>
                <rect x="3" y="285" width="22" height="5" rx="2" fill="rgba(212,177,106,0.35)"/>
                <text x="14" y="180" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7.5" fill="rgba(212,177,106,0.65)" letterSpacing="0.18em" transform="rotate(-90,14,180)">DÉDICALIVRES</text>
                <line x1="14" y1="8" x2="14" y2="342" stroke="rgba(56,201,155,0.2)" strokeWidth="0.8"/>
              </svg>
            </div>

            {/* Pages bloc */}
            <div style={{ position: "absolute", inset: 0, transform: "translateZ(0)" }}>
              <svg width="260" height="340" viewBox="0 0 260 340" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="gv-pg" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#1a5a32"/><stop offset="50%" stopColor="#1c5c34"/><stop offset="100%" stopColor="#163d22"/></linearGradient></defs>
                <path d="M0,6 C0,2 3,0 7,0 L255,2 C258,2 260,4 260,8 L260,336 C260,339 257,341 253,340 L5,338 C2,338 0,336 0,332 Z" fill="url(#gv-pg)" opacity="0.9"/>
                <line x1="257" y1="12" x2="257" y2="328" stroke="rgba(212,177,106,0.12)" strokeWidth="0.5"/>
                <line x1="254" y1="14" x2="254" y2="326" stroke="rgba(212,177,106,0.08)" strokeWidth="0.4"/>
              </svg>
            </div>

            {/* Page intérieure */}
            <div style={{ position: "absolute", inset: 0, transform: "translateZ(1px)", overflow: "hidden", borderRadius: "0 8px 8px 0" }}>
              <svg ref={writingSvgRef} width="260" height="340" viewBox="0 0 260 340" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <clipPath id="gv-cb"><rect id="gv-cr-b" x="0" y="120" width="0" height="46"/></clipPath>
                  <clipPath id="gv-cd"><rect id="gv-cr-d" x="0" y="164" width="0" height="60"/></clipPath>
                  <clipPath id="gv-ps"><path d="M0,6 C0,2 3,0 7,0 L253,2 C257,2 260,4 260,8 L260,334 C260,338 257,340 253,340 L5,338 C2,338 0,336 0,332 Z"/></clipPath>
                </defs>
                <g clipPath="url(#gv-ps)">
                  <rect width="260" height="340" fill="rgba(22,85,48,0.16)"/>
                  <line x1="20" y1="108" x2="242" y2="109" stroke="rgba(212,177,106,0.09)" strokeWidth="0.5"/>
                  <line x1="20" y1="134" x2="242" y2="135" stroke="rgba(212,177,106,0.09)" strokeWidth="0.5"/>
                  <line x1="20" y1="160" x2="242" y2="161" stroke="rgba(212,177,106,0.09)" strokeWidth="0.5"/>
                  <line x1="20" y1="186" x2="242" y2="187" stroke="rgba(212,177,106,0.09)" strokeWidth="0.5"/>
                  <line x1="20" y1="212" x2="242" y2="213" stroke="rgba(212,177,106,0.09)" strokeWidth="0.5"/>
                  <text x="130" y="60" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7.5" fill="rgba(212,177,106,0.38)" letterSpacing="2">✦  DÉDICALIVRES  ✦</text>
                  <line x1="62" y1="68" x2="198" y2="68" stroke="rgba(212,177,106,0.16)" strokeWidth="0.4"/>
                  <text id="gv-tb" x="130" y="154" textAnchor="middle" fontFamily="'Dancing Script',cursive" fontSize="20" fill="rgba(238,228,188,0.93)" clipPath="url(#gv-cb)">Bienvenue sur</text>
                  <text id="gv-td" x="130" y="200" textAnchor="middle" fontFamily="'Dancing Script',cursive" fontSize="27" fontWeight="600" fill="rgba(248,238,198,0.96)" clipPath="url(#gv-cd)">Dédicalivres</text>
                </g>
              </svg>
            </div>

            {/* Couverture */}
            <div
              ref={coverRef}
              style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", transformOrigin: "left center", transition: "transform 1.15s cubic-bezier(0.4,0,0.2,1)", transform: "translateZ(18px)" }}
            >
              {/* Face avant */}
              <svg style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden" } as React.CSSProperties} width="260" height="340" viewBox="0 0 260 340" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gv-covG" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#1a5830"/><stop offset="50%" stopColor="#206038"/><stop offset="100%" stopColor="#124020"/></linearGradient>
                  <clipPath id="gv-gs"><path d="M8,3 C5,1 2,2 1,5 L0,14 L0,320 C0,328 1,334 4,337 L8,340 L252,339 C256,339 259,337 260,333 L260,30 C260,18 258,8 254,4 L248,1 Z"/></clipPath>
                </defs>
                <g clipPath="url(#gv-gs)">
                  <rect width="260" height="340" fill="url(#gv-covG)"/>
                  <foreignObject width="260" height="340">
                    <canvas ref={coverCvsRef} style={{ width: 260, height: 340, display: "block" }}/>
                  </foreignObject>
                </g>
                <path d="M8,3 C5,1 2,2 1,5 L0,14 L0,320 C0,328 1,334 4,337 L8,340 L252,339 C256,339 259,337 260,333 L260,30 C260,18 258,8 254,4 L248,1 Z" fill="none" stroke="rgba(212,177,106,0.6)" strokeWidth="1.2"/>
                <path d="M8,3 C5,1 2,2 1,5 L0,14 L0,170" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5" strokeLinecap="round"/>
                <line x1="18" y1="20" x2="18" y2="320" stroke="rgba(212,177,106,0.22)" strokeWidth="0.6" strokeDasharray="8,6"/>
                <path d="M28,24 L232,22 L234,316 L26,318 Z" fill="none" stroke="rgba(212,177,106,0.3)" strokeWidth="0.7"/>
                <path d="M26,22 C38,22 38,34 38,34" fill="none" stroke="rgba(212,177,106,0.6)" strokeWidth="1"/>
                <circle cx="32" cy="28" r="2.5" fill="none" stroke="rgba(212,177,106,0.5)" strokeWidth="0.7"/><circle cx="32" cy="28" r="1" fill="rgba(212,177,106,0.5)"/>
                <path d="M234,22 C222,22 222,34 222,34" fill="none" stroke="rgba(212,177,106,0.6)" strokeWidth="1"/>
                <circle cx="228" cy="28" r="2.5" fill="none" stroke="rgba(212,177,106,0.5)" strokeWidth="0.7"/><circle cx="228" cy="28" r="1" fill="rgba(212,177,106,0.5)"/>
                <path d="M26,318 C38,318 38,306 38,306" fill="none" stroke="rgba(212,177,106,0.6)" strokeWidth="1"/>
                <circle cx="32" cy="312" r="2.5" fill="none" stroke="rgba(212,177,106,0.5)" strokeWidth="0.7"/><circle cx="32" cy="312" r="1" fill="rgba(212,177,106,0.5)"/>
                <path d="M234,316 C222,316 222,304 222,304" fill="none" stroke="rgba(212,177,106,0.6)" strokeWidth="1"/>
                <circle cx="228" cy="310" r="2.5" fill="none" stroke="rgba(212,177,106,0.5)" strokeWidth="0.7"/><circle cx="228" cy="310" r="1" fill="rgba(212,177,106,0.5)"/>
                <circle cx="130" cy="170" r="38" fill="none" stroke="rgba(212,177,106,0.35)" strokeWidth="0.8"/>
                <circle cx="130" cy="170" r="30" fill="none" stroke="rgba(56,201,155,0.3)" strokeWidth="0.6"/>
                <circle cx="130" cy="170" r="22" fill="none" stroke="rgba(212,177,106,0.2)" strokeWidth="0.4"/>
                <g id="gv-mstar" transform="translate(130,170)">
                  <line x1="0" y1="-18" x2="0" y2="18" stroke="rgba(212,177,106,0.4)" strokeWidth="0.7"/>
                  <line x1="-18" y1="0" x2="18" y2="0" stroke="rgba(212,177,106,0.4)" strokeWidth="0.7"/>
                  <line x1="-13" y1="-13" x2="13" y2="13" stroke="rgba(212,177,106,0.3)" strokeWidth="0.5"/>
                  <line x1="13" y1="-13" x2="-13" y2="13" stroke="rgba(212,177,106,0.3)" strokeWidth="0.5"/>
                </g>
                <circle cx="130" cy="170" r="5" fill="none" stroke="rgba(56,201,155,0.6)" strokeWidth="0.8"/>
                <circle id="gv-mc" cx="130" cy="170" r="3" fill="#38c99b"/>
                <text x="130" y="116" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fill="rgba(212,177,106,0.38)" letterSpacing="2">✦  AGENDA LITTÉRAIRE  ✦</text>
                <line x1="60" y1="122" x2="200" y2="122" stroke="rgba(212,177,106,0.25)" strokeWidth="0.5"/>
                <text x="130" y="238" textAnchor="middle" fontFamily="Georgia,serif" fontSize="12" fill="rgba(240,220,140,0.85)" letterSpacing="0.22em">DÉDICALIVRES</text>
                <line x1="60" y1="246" x2="200" y2="246" stroke="rgba(212,177,106,0.25)" strokeWidth="0.5"/>
                <text x="130" y="258" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fill="rgba(212,177,106,0.45)" letterSpacing="0.3em">FRANCOPHONE</text>
              </svg>

              {/* 4ème de couverture */}
              <svg style={{ position: "absolute", inset: 0, transform: "rotateY(180deg)", backfaceVisibility: "hidden" } as React.CSSProperties} width="260" height="340" viewBox="0 0 260 340" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="gv-back4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#0e2e18"/><stop offset="50%" stopColor="#122818"/><stop offset="100%" stopColor="#091508"/></linearGradient>
                  <radialGradient id="gv-back4glow" cx="50%" cy="50%" r="55%"><stop offset="0%" stopColor="rgba(40,130,65,0.18)"/><stop offset="100%" stopColor="transparent"/></radialGradient>
                  <clipPath id="gv-back4shape"><path d="M8,3 C5,1 2,2 1,5 L0,14 L0,320 C0,328 1,334 4,337 L8,340 L252,339 C256,339 259,337 260,333 L260,30 C260,18 258,8 254,4 L248,1 Z"/></clipPath>
                </defs>
                <g clipPath="url(#gv-back4shape)">
                  <rect width="260" height="340" fill="url(#gv-back4)"/>
                  <rect width="260" height="340" fill="url(#gv-back4glow)"/>
                  <path d="M0,80 C60,120 90,60 130,100 C170,140 200,80 260,110" fill="none" stroke="rgba(56,201,155,0.08)" strokeWidth="1"/>
                  <path d="M0,200 C80,180 110,240 160,200 C210,160 230,220 260,200" fill="none" stroke="rgba(212,177,106,0.07)" strokeWidth="0.8"/>
                  <path d="M18,18 L242,18 L242,322 L18,322 Z" fill="none" stroke="rgba(212,177,106,0.25)" strokeWidth="0.7"/>
                  <path d="M24,24 L236,24 L236,316 L24,316 Z" fill="none" stroke="rgba(212,177,106,0.12)" strokeWidth="0.4"/>
                  <path d="M18,18 C30,18 30,30 30,30" fill="none" stroke="rgba(212,177,106,0.5)" strokeWidth="0.9"/>
                  <circle cx="24" cy="24" r="2" fill="rgba(212,177,106,0.4)"/>
                  <path d="M242,18 C230,18 230,30 230,30" fill="none" stroke="rgba(212,177,106,0.5)" strokeWidth="0.9"/>
                  <circle cx="236" cy="24" r="2" fill="rgba(212,177,106,0.4)"/>
                  <path d="M18,322 C30,322 30,310 30,310" fill="none" stroke="rgba(212,177,106,0.5)" strokeWidth="0.9"/>
                  <circle cx="24" cy="316" r="2" fill="rgba(212,177,106,0.4)"/>
                  <path d="M242,322 C230,322 230,310 230,310" fill="none" stroke="rgba(212,177,106,0.5)" strokeWidth="0.9"/>
                  <circle cx="236" cy="316" r="2" fill="rgba(212,177,106,0.4)"/>
                  <line x1="40" y1="58" x2="220" y2="58" stroke="rgba(212,177,106,0.3)" strokeWidth="0.5"/>
                  <text x="130" y="50" textAnchor="middle" fontFamily="Georgia,serif" fontSize="11" fill="rgba(212,177,106,0.5)">✦</text>
                  <text x="130" y="118" textAnchor="middle" fontFamily="'Dancing Script',cursive" fontSize="13" fill="rgba(230,215,165,0.72)" letterSpacing="0.04em">Tous acteurs de nos</text>
                  <text x="130" y="152" textAnchor="middle" fontFamily="'Dancing Script',cursive" fontSize="22" fontWeight="600" fill="rgba(240,220,155,0.92)" letterSpacing="0.02em">rencontres</text>
                  <text x="130" y="185" textAnchor="middle" fontFamily="'Dancing Script',cursive" fontSize="18" fontWeight="600" fill="rgba(235,215,150,0.85)" letterSpacing="0.02em">de demain.</text>
                  <line x1="70" y1="208" x2="190" y2="208" stroke="rgba(212,177,106,0.25)" strokeWidth="0.5"/>
                  <text x="130" y="215" textAnchor="middle" fontFamily="Georgia,serif" fontSize="8" fill="rgba(212,177,106,0.35)">— ✦ —</text>
                  <line x1="70" y1="222" x2="190" y2="222" stroke="rgba(212,177,106,0.25)" strokeWidth="0.5"/>
                  <text x="130" y="255" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7.5" fill="rgba(212,177,106,0.38)" letterSpacing="0.18em">DÉDICALIVRES</text>
                  <text x="130" y="270" textAnchor="middle" fontFamily="Georgia,serif" fontSize="6.5" fill="rgba(212,177,106,0.25)" letterSpacing="0.22em">dedicalivres.fr</text>
                  <line x1="40" y1="284" x2="220" y2="284" stroke="rgba(212,177,106,0.2)" strokeWidth="0.5"/>
                  <text x="130" y="298" textAnchor="middle" fontFamily="Georgia,serif" fontSize="7" fill="rgba(56,201,155,0.35)" letterSpacing="0.14em">espace francophone</text>
                  <circle cx="130" cy="306" r="8" fill="none" stroke="rgba(212,177,106,0.2)" strokeWidth="0.5"/>
                  <circle cx="130" cy="306" r="3" fill="none" stroke="rgba(56,201,155,0.3)" strokeWidth="0.5"/>
                  <circle cx="130" cy="306" r="1.2" fill="rgba(56,201,155,0.5)"/>
                </g>
                <path d="M8,3 C5,1 2,2 1,5 L0,14 L0,320 C0,328 1,334 4,337 L8,340 L252,339 C256,339 259,337 260,333 L260,30 C260,18 258,8 254,4 L248,1 Z" fill="none" stroke="rgba(212,177,106,0.45)" strokeWidth="1"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Plume cristal */}
      <div ref={featherRef} style={{ position: "absolute", pointerEvents: "none", opacity: 0, zIndex: 80, transform: "translate(-50%,-100%)" }}>
        <svg width="46" height="92" viewBox="0 0 46 92" xmlns="http://www.w3.org/2000/svg" overflow="visible">
          <defs>
            <radialGradient id="gv-fg1" cx="50%" cy="50%" r="55%"><stop offset="0%" stopColor="#c8fff0"/><stop offset="40%" stopColor="#38c99b" stopOpacity="0.95"/><stop offset="90%" stopColor="#0d4a38" stopOpacity="0.5"/></radialGradient>
            <filter id="gv-fgl" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <g filter="url(#gv-fgl)" opacity="0.35"><ellipse cx="23" cy="38" rx="14" ry="34" fill="#38c99b"/></g>
          <g filter="url(#gv-fgl)">
            <path d="M23 88 C17 70 5 52 7 28 C9 12 15 3 23 1 C31 3 37 12 39 28 C41 52 29 70 23 88Z" fill="url(#gv-fg1)" opacity="0.93"/>
            <path d="M23 88 C18 68 11 50 12 30 C13 17 17 8 23 4" fill="none" stroke="rgba(200,255,240,0.5)" strokeWidth="0.8"/>
            <path d="M23 88 C28 68 35 50 34 30 C33 17 29 8 23 4" fill="none" stroke="rgba(200,255,240,0.5)" strokeWidth="0.8"/>
            <path d="M23 22 C14 28 7 36 6 47" fill="none" stroke="rgba(180,255,220,0.35)" strokeWidth="0.6"/>
            <path d="M23 34 C14 40 7 48 6 59" fill="none" stroke="rgba(180,255,220,0.35)" strokeWidth="0.6"/>
            <path d="M23 22 C32 28 39 36 40 47" fill="none" stroke="rgba(180,255,220,0.35)" strokeWidth="0.6"/>
            <path d="M23 34 C32 40 39 48 40 59" fill="none" stroke="rgba(180,255,220,0.35)" strokeWidth="0.6"/>
            <polygon points="19,10 23,1 27,10 23,8" fill="rgba(200,255,240,0.9)"/>
            <line x1="23" y1="82" x2="23" y2="91" stroke="rgba(212,177,106,0.95)" strokeWidth="1.4" strokeLinecap="round"/>
          </g>
          <circle id="gv-fs0" cx="10" cy="16" r="1.6" fill="#d4b16a" opacity="0"/>
          <circle id="gv-fs1" cx="36" cy="10" r="1.3" fill="#c8fff0" opacity="0"/>
          <circle id="gv-fs2" cx="6"  cy="37" r="1.1" fill="#d4b16a" opacity="0"/>
          <circle id="gv-fs3" cx="40" cy="28" r="1.5" fill="#c8fff0" opacity="0"/>
          <circle id="gv-fs4" cx="15" cy="6"  r="1.2" fill="#d4b16a" opacity="0"/>
          <circle id="gv-fs5" cx="31" cy="54" r="1.0" fill="#c8fff0" opacity="0"/>
        </svg>
      </div>

      {/* Google Font Dancing Script */}
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet"/>
    </div>
  );
}
