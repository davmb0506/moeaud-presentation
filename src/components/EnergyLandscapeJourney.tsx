import { useEffect, useRef, type MutableRefObject } from "react";

type Props = {
  progressRef: MutableRefObject<number>;
};

type Pt = { x: number; y: number };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function smootherstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** Semiancho del embudo: y=0 arriba (alta energía), y=1 abajo (nativa). */
function halfWidth(y: number): number {
  return lerp(0.46, 0.03, Math.pow(y, 0.9));
}

/** Rugosidad de la pared (valles y barreras locales). */
function rugged(y: number, side: 1 | -1): number {
  return (
    side *
    (0.032 * Math.sin(y * Math.PI * 13) * (1 - y * 0.85) +
      0.02 * Math.sin(y * Math.PI * 7 + 0.8) * (1 - y) +
      0.011 * Math.sin(y * Math.PI * 21 + 1.3) * (1 - y * y))
  );
}

function wallX(y: number, side: 1 | -1): number {
  return 0.5 + side * halfWidth(y) + rugged(y, side);
}

/** Descenso por el interior del embudo (no por la pared). */
function pathAt(t: number): Pt {
  const y = smootherstep(t);
  const hw = halfWidth(y);
  // Margen respecto a las paredes rugosas.
  const maxOff = Math.max(0.008, hw * 0.55);
  // Arranca a la izquierda del eje, oscila suave y termina en el fondo.
  const lateral =
    -0.42 * (1 - y) +
    0.28 * Math.sin(y * Math.PI * 2.6) * (1 - y) +
    0.12 * Math.sin(y * Math.PI * 5.8 + 0.9) * (1 - y) * (1 - y);
  const dx = Math.max(-maxOff, Math.min(maxOff, lateral * hw));
  return { x: 0.5 + dx, y };
}

function stageOf(t: number): "Desplegada" | "Intermediario" | "Nativa" {
  if (t < 0.3) return "Desplegada";
  if (t < 0.75) return "Intermediario";
  return "Nativa";
}

/**
 * Embudo de energía libre en miniatura, pensado para superponerse
 * sobre el visor 3D (fondo transparente).
 */
export function EnergyLandscapeJourney({ progressRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;

    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const draw = () => {
      if (!running) return;
      const W = wrap.clientWidth;
      const H = wrap.clientHeight;
      if (W < 2 || H < 2) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const t = Math.min(1, Math.max(0, progressRef.current));

      const padL = 20;
      const padR = 8;
      const padT = 22;
      const padB = 10;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const X = (nx: number) => padL + nx * plotW;
      const Y = (ny: number) => padT + ny * plotH;

      ctx.clearRect(0, 0, W, H);

      /** Elige el mayor tamaño de fuente con el que el texto cabe en `maxW`. */
      const fitFont = (text: string, maxW: number) => {
        for (let px = 8.5; px >= 5.5; px -= 0.5) {
          ctx.font = `700 ${px}px ui-sans-serif, system-ui, sans-serif`;
          if (ctx.measureText(text).width <= maxW) return;
        }
      };

      const samples = 90;
      const left: Pt[] = [];
      const right: Pt[] = [];
      for (let i = 0; i <= samples; i += 1) {
        const y = i / samples;
        left.push({ x: wallX(y, -1), y });
        right.push({ x: wallX(y, 1), y });
      }

      const outline = () => {
        ctx.beginPath();
        ctx.moveTo(X(left[0].x), Y(left[0].y));
        for (const p of left) ctx.lineTo(X(p.x), Y(p.y));
        for (let i = right.length - 1; i >= 0; i -= 1) {
          ctx.lineTo(X(right[i].x), Y(right[i].y));
        }
        ctx.closePath();
      };

      outline();
      const fill = ctx.createLinearGradient(0, Y(0), 0, Y(1));
      fill.addColorStop(0, "rgba(255, 255, 255, 0.82)");
      fill.addColorStop(1, "rgba(226, 232, 240, 0.78)");
      ctx.fillStyle = fill;
      ctx.fill();

      outline();
      ctx.strokeStyle = "rgba(15, 23, 42, 0.75)";
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Eje Y: energía libre interna (energía de la cadena + entropía del solvente)
      const ax = padL - 6;
      ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
      ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(ax, Y(0.99));
      ctx.lineTo(ax, Y(0));
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(ax, Y(0) - 4);
      ctx.lineTo(ax - 3.5, Y(0) + 3);
      ctx.lineTo(ax + 3.5, Y(0) + 3);
      ctx.closePath();
      ctx.fill();
      ctx.save();
      ctx.translate(ax - 6, (Y(0) + Y(0.99)) / 2);
      ctx.rotate(-Math.PI / 2);
      fitFont("Energía libre interna", Y(0.99) - Y(0));
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("Energía libre interna", 0, 0);
      ctx.restore();

      // Eje X: el ancho del embudo codifica la entropía conformacional
      const exL = X(wallX(0, -1));
      const exR = X(wallX(0, 1));
      const ey = Y(0) - 7;
      ctx.strokeStyle = "rgba(99, 102, 241, 0.9)";
      ctx.fillStyle = "rgba(99, 102, 241, 0.9)";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(exL, ey);
      ctx.lineTo(exR, ey);
      ctx.stroke();
      for (const [tipX, dir] of [
        [exL, 1],
        [exR, -1],
      ] as const) {
        ctx.beginPath();
        ctx.moveTo(tipX, ey);
        ctx.lineTo(tipX + dir * 5, ey - 3);
        ctx.lineTo(tipX + dir * 5, ey + 3);
        ctx.closePath();
        ctx.fill();
      }
      fitFont("Entropía conformacional", W - 6);
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillText("Entropía conformacional", W / 2, ey - 3);

      // Trayectoria
      const steps = Math.max(2, Math.ceil(t * 60));
      ctx.beginPath();
      for (let i = 0; i <= steps; i += 1) {
        const p = pathAt((i / steps) * t);
        if (i === 0) ctx.moveTo(X(p.x), Y(p.y));
        else ctx.lineTo(X(p.x), Y(p.y));
      }
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 1.9;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      // Partícula
      const pos = pathAt(t);
      const r = 3.6;
      ctx.beginPath();
      ctx.arc(X(pos.x), Y(pos.y), r + 1.6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(X(pos.x), Y(pos.y), r, 0, Math.PI * 2);
      ctx.fillStyle = "#f59e0b";
      ctx.fill();
      ctx.strokeStyle = "#b45309";
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Etiqueta de la etapa actual, junto a la partícula
      const stage = stageOf(t);
      ctx.font = "700 8.5px ui-sans-serif, system-ui, sans-serif";
      const tw = ctx.measureText(stage).width;
      const bw = tw + 10;
      const bh = 14;
      let bx = X(pos.x) + 7;
      if (bx + bw > W - 2) bx = X(pos.x) - 7 - bw;
      const by = Math.min(H - bh - 1, Math.max(1, Y(pos.y) - bh / 2));
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.strokeStyle = "rgba(203, 213, 225, 0.95)";
      ctx.lineWidth = 1;
      const rr = 7;
      ctx.beginPath();
      ctx.moveTo(bx + rr, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, rr);
      ctx.arcTo(bx + bw, by + bh, bx, by + bh, rr);
      ctx.arcTo(bx, by + bh, bx, by, rr);
      ctx.arcTo(bx, by, bx + bw, by, rr);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(stage, bx + 5, by + bh / 2);

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [progressRef]);

  return (
    <div ref={wrapRef} className="proteinas-energy-overlay">
      <canvas ref={canvasRef} className="proteinas-energy-canvas" />
    </div>
  );
}
