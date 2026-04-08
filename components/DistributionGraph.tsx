"use client";

import type { GameData } from "@/lib/types";

interface Props {
  game: GameData;
}

interface RawPoint { x: number; pct: number; }

// Generate normal distribution curve points from percentile data
function generateCurvePoints(percentiles: { ms: number; percentile: number }[], W: number, H: number) {
  const sorted = [...percentiles].sort((a, b) => a.ms - b.ms);
  const minX = sorted[0].ms;
  const maxX = sorted[sorted.length - 1].ms;

  // Convert percentile to density (approximate bell curve shape)
  // Use finite differences to get density from cumulative percentiles
  const points: RawPoint[] = [];
  const padding = { left: 40, right: 20, top: 16, bottom: 28 };
  const plotW = W - padding.left - padding.right;
  const plotH = H - padding.top - padding.bottom;

  const steps = 120;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ms = minX + t * (maxX - minX);

    // Interpolate percentile at this ms value
    let pct = 50;
    for (let j = 0; j < sorted.length - 1; j++) {
      if (ms >= sorted[j].ms && ms <= sorted[j + 1].ms) {
        const tt = (ms - sorted[j].ms) / (sorted[j + 1].ms - sorted[j].ms);
        pct = sorted[j].percentile + tt * (sorted[j + 1].percentile - sorted[j].percentile);
        break;
      }
    }
    if (ms <= sorted[0].ms) pct = sorted[0].percentile;
    if (ms >= sorted[sorted.length - 1].ms) pct = sorted[sorted.length - 1].percentile;

    // Convert cumulative to density using numerical derivative
    points.push({ x: ms, pct: pct });
  }

  // Compute density as derivative of percentile
  const density: { x: number; y: number }[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const d = (points[i + 1].pct - points[i - 1].pct) / 2;
    density.push({ x: points[i].x, y: Math.max(0, d) });
  }

  // Normalize density to fit plot height
  const maxD = Math.max(...density.map(p => p.y));
  if (maxD === 0) return { svgPoints: "", peakX: W / 2, padding };

  const svgPoints = density
    .map(p => {
      const sx = padding.left + ((p.x - minX) / (maxX - minX)) * plotW;
      const sy = padding.top + plotH - (p.y / maxD) * plotH;
      return `${sx},${sy}`;
    })
    .join(" ");

  // Find peak (mode)
  const peakIdx = density.reduce((best, p, i) => p.y > density[best].y ? i : best, 0);
  const peakX = padding.left + ((density[peakIdx].x - minX) / (maxX - minX)) * plotW;

  return { svgPoints, peakX, padding, minX, maxX, plotW, plotH };
}

export default function DistributionGraph({ game }: Props) {
  const W = 480, H = 120;
  const { svgPoints, peakX, padding, minX, maxX, plotW, plotH } = generateCurvePoints(
    game.stats.percentiles, W, H
  ) as any;

  if (!svgPoints) return null;

  const sorted = [...game.stats.percentiles].sort((a, b) => a.ms - b.ms);
  const labelCount = Math.min(5, sorted.length);
  const labelIndices = Array.from({ length: labelCount }, (_, i) =>
    Math.round((i / (labelCount - 1)) * (sorted.length - 1))
  );

  return (
    <div style={{ margin: "20px 0 4px" }}>
      <div style={{ fontSize: 10, color: "var(--text-3)", fontFamily: "var(--font-mono)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
        Population Distribution
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        style={{ display: "block", overflow: "visible" }}
        aria-label="Normal distribution of population scores"
      >
        {/* Filled area under curve */}
        <defs>
          <linearGradient id={`grad-${game.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={game.accent} stopOpacity="0.25" />
            <stop offset="100%" stopColor={game.accent} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <polygon
          points={`${padding.left},${padding.top + plotH} ${svgPoints} ${padding.left + plotW},${padding.top + plotH}`}
          fill={`url(#grad-${game.id})`}
        />

        {/* Curve line */}
        <polyline
          points={svgPoints}
          fill="none"
          stroke={game.accent}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
        />

        {/* Baseline */}
        <line
          x1={padding.left} y1={padding.top + plotH}
          x2={padding.left + plotW} y2={padding.top + plotH}
          stroke="var(--border)"
          strokeWidth="1"
        />

        {/* X-axis labels */}
        {labelIndices.map((idx) => {
          const p = sorted[idx];
          const sx = padding.left + ((p.ms - minX) / (maxX - minX)) * plotW;
          return (
            <text
              key={p.ms}
              x={sx}
              y={H - 4}
              textAnchor="middle"
              fontSize="8"
              fill="var(--text-3)"
              fontFamily="monospace"
            >
              {p.ms}
            </text>
          );
        })}

        {/* "You are here" marker — at median (50th percentile) */}
        {(() => {
          const median = sorted.reduce((best, p) =>
            Math.abs(p.percentile - 50) < Math.abs(best.percentile - 50) ? p : best
          );
          const mx = padding.left + ((median.ms - minX) / (maxX - minX)) * plotW;
          return (
            <g>
              <line x1={mx} y1={padding.top} x2={mx} y2={padding.top + plotH} stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="2,3" />
              <circle cx={mx} cy={padding.top + plotH / 2} r="3" fill="rgba(255,255,255,0.3)" />
              <text x={mx} y={padding.top - 2} textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)" fontFamily="monospace">median</text>
            </g>
          );
        })()}
      </svg>
      <div style={{ fontSize: 9, color: "var(--text-3)", fontFamily: "var(--font-mono)", textAlign: "right", marginTop: 2, opacity: 0.6 }}>
        Based on population research data
      </div>
    </div>
  );
}
