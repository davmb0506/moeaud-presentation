/**
 * Frontera escalonada del cono de dominancia (min–min), estilo tesis/ax.step.
 * Sin diagonales: horizontal → vertical entre puntos no dominados, extendida a la derecha.
 */

export type ConePoint = {
  id: string;
  x: number;
  y: number;
  color: string;
};

type Props = {
  points: ConePoint[];
  sx: (x: number) => number;
  sy: (y: number) => number;
  /** Extremo peor en f1 (borde derecho del plot). */
  xMaxPx: number;
  /** Extremo peor en f2 (borde superior); solo para el cono del pin. */
  yMinPx: number;
  /** Punto fijado: cono L resaltado encima. */
  highlightId?: string | null;
};

/** Path SVG tipo matplotlib ax.step(..., where="post"). */
function stepPath(
  pts: { x: number; y: number }[],
  sx: (x: number) => number,
  sy: (y: number) => number,
  xMaxPx: number
): string {
  if (pts.length === 0) return "";
  const sorted = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const parts: string[] = [
    `M ${sx(sorted[0].x).toFixed(1)} ${sy(sorted[0].y).toFixed(1)}`,
  ];
  for (let i = 0; i < sorted.length - 1; i++) {
    const next = sorted[i + 1];
    parts.push(`H ${sx(next.x).toFixed(1)}`);
    parts.push(`V ${sy(next.y).toFixed(1)}`);
  }
  parts.push(`H ${xMaxPx.toFixed(1)}`);
  return parts.join(" ");
}

export function DominanceCones({
  points,
  sx,
  sy,
  xMaxPx,
  yMinPx,
  highlightId = null,
}: Props) {
  // Una escalera por color (condición).
  const byColor = new Map<string, ConePoint[]>();
  for (const p of points) {
    const list = byColor.get(p.color) ?? [];
    list.push(p);
    byColor.set(p.color, list);
  }

  const highlight = highlightId
    ? points.find((p) => p.id === highlightId) ?? null
    : null;

  return (
    <g className="abl-cones" aria-hidden>
      {[...byColor.entries()].map(([color, pts]) => (
        <path
          key={color}
          d={stepPath(pts, sx, sy, xMaxPx)}
          className="abl-front-step"
          style={{ stroke: color }}
        />
      ))}
      {highlight && (
        <g className="abl-cone-group">
          <line
            className="abl-cone"
            x1={sx(highlight.x)}
            y1={sy(highlight.y)}
            x2={xMaxPx}
            y2={sy(highlight.y)}
          />
          <line
            className="abl-cone"
            x1={sx(highlight.x)}
            y1={sy(highlight.y)}
            x2={sx(highlight.x)}
            y2={yMinPx}
          />
        </g>
      )}
    </g>
  );
}
