"use client";

import React from "react";
import type { PhysicsSimKind } from "@/types/physics";
import { wavelengthToHex, type EvaluatedSimState } from "@/lib/physics-sim";

function buildSpringZigzag(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  coils = 10,
  amp = 10
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const pts: string[] = [`M ${x1} ${y1}`];
  const lead = 12;
  const bodyLen = Math.max(10, len - 2 * lead);
  pts.push(`L ${x1 + ux * lead} ${y1 + uy * lead}`);
  for (let i = 1; i <= coils; i++) {
    const t = (i - 0.5) / coils;
    const dist = lead + t * bodyLen;
    const sign = i % 2 === 0 ? 1 : -1;
    pts.push(
      `L ${x1 + ux * dist + nx * amp * sign} ${y1 + uy * dist + ny * amp * sign}`
    );
  }
  pts.push(`L ${x2 - ux * lead} ${y2 - uy * lead}`);
  pts.push(`L ${x2} ${y2}`);
  return pts.join(" ");
}

function renderArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  label?: string
): React.ReactNode {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 6) return null;
  const ux = dx / len;
  const uy = dy / len;
  const ah = 7;
  const aw = 4;
  const tipX = x2;
  const tipY = y2;
  const leftX = tipX - ux * ah - uy * aw;
  const leftY = tipY - uy * ah + ux * aw;
  const rightX = tipX - ux * ah + uy * aw;
  const rightY = tipY - uy * ah - ux * aw;
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.2} />
      <polygon
        points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
        fill={color}
      />
      {label && (
        <text
          x={x2 + ux * 8}
          y={y2 + uy * 8 + 4}
          fontSize={11}
          fontWeight={700}
          fill={color}
        >
          {label}
        </text>
      )}
    </g>
  );
}

export function renderPhysicsSceneSvg(
  kind: PhysicsSimKind,
  ev: EvaluatedSimState,
  stageW: number,
  stageH: number,
  showVectors: boolean
): React.ReactNode {
  const d = ev.data;
  const cx = stageW / 2;
  const cy = stageH / 2;

  switch (kind) {
    case "kinematics_rect": {
      if (d.isFreefall) {
        const h0 = Number(d.h0 ?? 20);
        const y = Number(d.y ?? h0);
        const v = Number(d.v ?? 0);
        const topY = 26;
        const botY = stageH - 22;
        const py = botY - (y / Math.max(1, h0)) * (botY - topY);
        return (
          <g>
            <line x1={60} y1={topY} x2={60} y2={botY} stroke="#94a3b8" strokeDasharray="4 3" />
            <line x1={30} y1={botY} x2={stageW - 30} y2={botY} stroke="#475569" strokeWidth={2.5} />
            <text x={72} y={topY + 10} fontSize={11} fill="#64748b">{h0} m</text>
            <text x={72} y={botY - 6} fontSize={11} fill="#64748b">0 m</text>
            <circle cx={cx} cy={py} r={14} fill="#2563eb" stroke="#1e40af" strokeWidth={2} />
            {showVectors && v > 0.2 && renderArrow(cx, py, cx, Math.min(botY, py + 12 + v * 2.4), "#dc2626", "v")}
          </g>
        );
      }
      const x = Number(d.x ?? 0);
      const v = Number(d.v ?? 0);
      const px = 38 + (((x % 60) + 60) % 60) * ((stageW - 76) / 60);
      const roadY = stageH - 42;
      return (
        <g>
          <line x1={20} y1={roadY} x2={stageW - 20} y2={roadY} stroke="#475569" strokeWidth={2.5} />
          {[0, 15, 30, 45, 60].map((m) => {
            const tx = 38 + (m / 60) * (stageW - 76);
            return (
              <g key={m}>
                <line x1={tx} y1={roadY} x2={tx} y2={roadY + 7} stroke="#64748b" />
                <text x={tx - 8} y={roadY + 19} fontSize={10} fill="#64748b">{m}m</text>
              </g>
            );
          })}
          <rect x={px - 24} y={roadY - 28} width={48} height={22} rx={5} fill="#2563eb" />
          <circle cx={px - 14} cy={roadY - 5} r={5} fill="#0f172a" />
          <circle cx={px + 14} cy={roadY - 5} r={5} fill="#0f172a" />
          {showVectors && renderArrow(px, roadY - 40, px + Math.max(-60, Math.min(60, v * 3.5)), roadY - 40, "#dc2626", "v")}
        </g>
      );
    }

    case "projectile": {
      const x = Number(d.x ?? 0);
      const y = Number(d.y ?? 0);
      const vx = Number(d.vx ?? 10);
      const vy = Number(d.vy ?? 0);
      const maxR = Math.max(10, Number(d.range ?? 20), ...ev.series.map((p) => p.x));
      const maxH = Math.max(6, Number(d.hMax ?? 8), Number(d.h0 ?? 0));
      const padL = 32;
      const padB = stageH - 24;
      const scaleX = (stageW - 56) / (maxR * 1.08);
      const scaleY = (stageH - 48) / (maxH * 1.15);
      const s = Math.min(scaleX, scaleY * 1.35);
      const toPx = (mx: number, my: number) => ({
        x: padL + mx * s,
        y: padB - my * s,
      });
      const pathD = ev.series
        .map((p, idx) => {
          const pt = toPx(p.x, p.y);
          return `${idx === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
        })
        .join(" ");
      const cur = toPx(x, y);
      return (
        <g>
          <line x1={18} y1={padB} x2={stageW - 14} y2={padB} stroke="#475569" strokeWidth={2} />
          <path d={pathD} fill="none" stroke="#93c5fd" strokeWidth={2} strokeDasharray="5 4" />
          <circle cx={cur.x} cy={cur.y} r={8} fill="#ea580c" stroke="#9a3412" strokeWidth={1.5} />
          {showVectors && (
            <>
              {renderArrow(cur.x, cur.y, cur.x + vx * 2.2, cur.y, "#2563eb", "vx")}
              {renderArrow(cur.x, cur.y, cur.x, cur.y - vy * 2.2, "#16a34a", "vy")}
            </>
          )}
        </g>
      );
    }

    case "incline_newton": {
      const deg = Number(d.alphaDeg ?? 30);
      const rad = (deg * Math.PI) / 180;
      const baseW = 240;
      const x0 = cx - 120;
      const y0 = stageH - 26;
      const topX = x0;
      const topY = y0 - Math.tan(rad) * baseW * 0.75;
      const botX = x0 + baseW;
      const botY = y0;
      const dx = botX - topX;
      const dy = botY - topY;
      const slopeLen = Math.hypot(dx, dy) || 1;
      const ux = dx / slopeLen;
      const uy = dy / slopeLen;
      const nx = uy; // normal outward (up-right)
      const ny = -ux;
      const s = Number(d.s ?? 0);
      const frac = Math.min(0.84, 0.2 + (s * 24) / slopeLen);
      const bx = topX + ux * slopeLen * frac + nx * 16;
      const by = topY + uy * slopeLen * frac + ny * 16;
      const P = Number(d.P ?? 20);
      const N = Number(d.N ?? 17);
      const fms = Number(d.fms ?? 0);
      const fPull = Number(d.F ?? 0);
      return (
        <g>
          <polygon
            points={`${topX},${y0} ${botX},${botY} ${topX},${topY}`}
            fill="#e2e8f0"
            stroke="#475569"
            strokeWidth={2}
          />
          <text x={botX - 42} y={botY - 8} fontSize={11} fontWeight={600} fill="#334155">α={deg}°</text>
          <g transform={`translate(${bx}, ${by}) rotate(${deg})`}>
            <rect x={-18} y={-14} width={36} height={28} rx={4} fill="#3b82f6" stroke="#1d4ed8" strokeWidth={1.8} />
          </g>
          {showVectors && (
            <>
              {renderArrow(bx, by, bx, by + Math.min(62, P * 1.4), "#dc2626", "P")}
              {renderArrow(bx, by, bx + nx * Math.min(58, N * 1.4), by + ny * Math.min(58, N * 1.4), "#2563eb", "N")}
              {Math.abs(fms) > 0.3 &&
                renderArrow(bx, by, bx - ux * Math.min(48, Math.abs(fms) * 2.2), by - uy * Math.min(48, Math.abs(fms) * 2.2), "#d97706", "Fms")}
              {fPull > 0.5 &&
                renderArrow(bx, by, bx - ux * Math.min(56, fPull * 1.5), by - uy * Math.min(56, fPull * 1.5), "#16a34a", "F")}
            </>
          )}
        </g>
      );
    }

    case "collision_momentum": {
      const trackY = stageH - 58;
      const x1 = cx + Number(d.x1 ?? -2) * 32;
      const x2 = cx + Number(d.x2 ?? 2) * 32;
      const v1 = Number(d.cv1 ?? 0);
      const v2 = Number(d.cv2 ?? 0);
      const r1 = 14 + Number(d.m1 ?? 2) * 1.6;
      const r2 = 14 + Number(d.m2 ?? 3) * 1.6;
      return (
        <g>
          <line x1={20} y1={trackY} x2={stageW - 20} y2={trackY} stroke="#475569" strokeWidth={2.5} />
          <circle cx={Math.max(30, Math.min(stageW - 30, x1))} cy={trackY - r1} r={r1} fill="#2563eb" />
          <text x={Math.max(30, Math.min(stageW - 30, x1)) - 8} y={trackY - r1 + 4} fontSize={11} fontWeight={700} fill="#fff">m₁</text>
          <circle cx={Math.max(30, Math.min(stageW - 30, x2))} cy={trackY - r2} r={r2} fill="#e11d48" />
          <text x={Math.max(30, Math.min(stageW - 30, x2)) - 8} y={trackY - r2 + 4} fontSize={11} fontWeight={700} fill="#fff">m₂</text>
          {showVectors && (
            <>
              {renderArrow(Math.max(30, Math.min(stageW - 30, x1)), trackY - 2 * r1 - 12, Math.max(30, Math.min(stageW - 30, x1)) + v1 * 9, trackY - 2 * r1 - 12, "#2563eb", "v₁")}
              {renderArrow(Math.max(30, Math.min(stageW - 30, x2)), trackY - 2 * r2 - 12, Math.max(30, Math.min(stageW - 30, x2)) + v2 * 9, trackY - 2 * r2 - 12, "#e11d48", "v₂")}
            </>
          )}
        </g>
      );
    }

    case "circular_motion": {
      const R = Number(d.R ?? 2);
      const th = Number(d.theta ?? 0);
      const radPx = 28 + R * 13;
      const bx = cx + radPx * Math.cos(th);
      const by = cy - radPx * Math.sin(th);
      const tx = -Math.sin(th);
      const ty = -Math.cos(th);
      return (
        <g>
          <circle cx={cx} cy={cy} r={radPx} fill="none" stroke="#94a3b8" strokeDasharray="5 4" strokeWidth={2} />
          <line x1={cx} y1={cy} x2={bx} y2={by} stroke="#64748b" strokeWidth={1.6} />
          <circle cx={cx} cy={cy} r={4} fill="#0f172a" />
          <circle cx={bx} cy={by} r={10} fill="#2563eb" />
          {showVectors && (
            <>
              {renderArrow(bx, by, bx + tx * 46, by + ty * 46, "#16a34a", "v")}
              {renderArrow(bx, by, bx + (cx - bx) * 0.45, by + (cy - by) * 0.45, "#dc2626", "Fht")}
            </>
          )}
        </g>
      );
    }

    case "spring_pendulum": {
      const xCm = Number(d.x ?? 0);
      const A = Number(d.A ?? 10);
      const W = Number(d.W ?? 1);
      const Wd = Number(d.Wd ?? 0);
      const Wt = Number(d.Wt ?? 0);
      const isVert = Boolean(d.isVertical);
      if (isVert) {
        const eqY = cy + 10;
        const py = eqY + xCm * 3.5;
        return (
          <g>
            <line x1={cx - 48} y1={18} x2={cx + 48} y2={18} stroke="#334155" strokeWidth={4} />
            <line x1={cx - 60} y1={eqY} x2={cx + 60} y2={eqY} stroke="#94a3b8" strokeDasharray="4 3" />
            <path d={buildSpringZigzag(cx, 18, cx, py - 18, 12, 11)} fill="none" stroke="#475569" strokeWidth={2} />
            <rect x={cx - 20} y={py - 18} width={40} height={36} rx={6} fill="#2563eb" />
            <text x={cx + 30} y={eqY + 4} fontSize={11} fill="#64748b">O</text>
          </g>
        );
      }
      const eqX = cx + 26;
      const px = eqX + xCm * 6.5;
      const wallX = 36;
      const massY = cy + 16;
      const wFracD = W > 1e-9 ? Math.min(1, Wd / W) : 0;
      const wFracT = W > 1e-9 ? Math.min(1, Wt / W) : 0;
      return (
        <g>
          <line x1={wallX} y1={massY - 45} x2={wallX} y2={massY + 26} stroke="#334155" strokeWidth={4} />
          <line x1={wallX} y1={massY + 22} x2={stageW - 24} y2={massY + 22} stroke="#64748b" strokeWidth={2} />
          <line x1={eqX} y1={massY - 38} x2={eqX} y2={massY + 30} stroke="#94a3b8" strokeDasharray="4 3" />
          <text x={eqX - 4} y={massY + 42} fontSize={10} fill="#64748b">O</text>
          <text x={eqX - A * 6.5 - 8} y={massY + 42} fontSize={10} fill="#64748b">-A</text>
          <text x={eqX + A * 6.5 - 6} y={massY + 42} fontSize={10} fill="#64748b">+A</text>
          <path d={buildSpringZigzag(wallX, massY, px - 22, massY, 12, 10)} fill="none" stroke="#475569" strokeWidth={2} />
          <rect x={px - 22} y={massY - 22} width={44} height={44} rx={6} fill="#2563eb" stroke="#1e40af" strokeWidth={1.8} />
          {/* Energy bars */}
          <rect x={24} y={16} width={100} height={8} rx={4} fill="#e2e8f0" />
          <rect x={24} y={16} width={100 * wFracD} height={8} rx={4} fill="#16a34a" />
          <text x={130} y={24} fontSize={10} fill="#15803d">Wđ</text>
          <rect x={24} y={29} width={100} height={8} rx={4} fill="#e2e8f0" />
          <rect x={24} y={29} width={100 * wFracT} height={8} rx={4} fill="#f59e0b" />
          <text x={130} y={37} fontSize={10} fill="#b45309">Wt</text>
        </g>
      );
    }

    case "simple_pendulum": {
      const l = Number(d.l ?? 1);
      const rad = Number(d.alphaRad ?? 0);
      const pivX = cx;
      const pivY = 24;
      const lenPx = 75 + l * 38;
      const bx = pivX + lenPx * Math.sin(rad);
      const by = pivY + lenPx * Math.cos(rad);
      return (
        <g>
          <line x1={cx - 56} y1={pivY} x2={cx + 56} y2={pivY} stroke="#334155" strokeWidth={4} />
          <line x1={pivX} y1={pivY} x2={pivX} y2={pivY + lenPx + 18} stroke="#cbd5e1" strokeDasharray="4 4" />
          <line x1={pivX} y1={pivY} x2={bx} y2={by} stroke="#475569" strokeWidth={2.2} />
          <circle cx={bx} cy={by} r={13} fill="#e11d48" stroke="#9f1239" strokeWidth={2} />
          {showVectors && (
            <>
              {renderArrow(bx, by, bx, by + 38, "#dc2626", "P")}
              {renderArrow(bx, by, bx - 36 * Math.sin(rad), by - 36 * Math.cos(rad), "#2563eb", "T")}
            </>
          )}
        </g>
      );
    }

    case "harmonic_phasor": {
      const scaleR = 7.5;
      const A1 = Number(d.A1 ?? 6) * scaleR;
      const A2 = Number(d.A2 ?? 4) * scaleR;
      const A = Number(d.A ?? 7) * scaleR;
      const a1 = Number(d.a1 ?? 0);
      const a2 = Number(d.a2 ?? 0);
      const aSum = Number(d.aSum ?? 0);
      const ox = cx - 40;
      const oy = cy;
      return (
        <g>
          <circle cx={ox} cy={oy} r={Math.max(12, A)} fill="none" stroke="#cbd5e1" strokeDasharray="4 3" />
          <line x1={ox - 95} y1={oy} x2={ox + 115} y2={oy} stroke="#94a3b8" />
          <line x1={ox} y1={oy - 95} x2={ox} y2={oy + 95} stroke="#94a3b8" />
          {renderArrow(ox, oy, ox + A1 * Math.cos(a1), oy - A1 * Math.sin(a1), "#2563eb", "A₁")}
          {A2 > 1 && renderArrow(ox, oy, ox + A2 * Math.cos(a2), oy - A2 * Math.sin(a2), "#16a34a", "A₂")}
          {renderArrow(ox, oy, ox + A * Math.cos(aSum), oy - A * Math.sin(aSum), "#dc2626", "A")}
        </g>
      );
    }

    case "standing_wave": {
      const pathTop = ev.series
        .map((p, idx) => {
          const px = 26 + p.x * (stageW - 52);
          const py = cy - p.y * 12;
          return `${idx === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
        })
        .join(" ");
      const isFree = Boolean(d.isFreeEnd);
      const k = Number(d.k ?? 3);
      return (
        <g>
          <line x1={26} y1={cy} x2={stageW - 26} y2={cy} stroke="#cbd5e1" strokeDasharray="4 3" />
          <circle cx={26} cy={cy} r={5} fill="#0f172a" />
          {!isFree && <circle cx={stageW - 26} cy={cy} r={5} fill="#0f172a" />}
          <path d={pathTop} fill="none" stroke="#2563eb" strokeWidth={2.8} />
          {Array.from({ length: k + 1 }).map((_, idx) => {
            const halfW = Number(d.halfWaves ?? k);
            const u = idx / halfW;
            if (u > 1.001) return null;
            return <circle key={idx} cx={26 + u * (stageW - 52)} cy={cy} r={4} fill="#dc2626" />;
          })}
        </g>
      );
    }

    case "wave_interference": {
      const lambda = Number(d.lambda ?? 2.4);
      const dVal = Number(d.d ?? 10);
      const t = Number(d.t ?? 0);
      const sScale = 22;
      const sx1 = cx - (dVal * sScale) / 2;
      const sx2 = cx + (dVal * sScale) / 2;
      const rStep = lambda * sScale;
      const phaseShift = ((t * 1.4) % 1) * rStep;
      const rings = [0, 1, 2, 3, 4, 5, 6];
      return (
        <g>
          {rings.map((idx) => (
            <React.Fragment key={idx}>
              <circle cx={sx1} cy={cy + 30} r={idx * rStep + phaseShift} fill="none" stroke="#2563eb" strokeOpacity={0.35} strokeWidth={1.6} />
              <circle cx={sx2} cy={cy + 30} r={idx * rStep + phaseShift} fill="none" stroke="#e11d48" strokeOpacity={0.35} strokeWidth={1.6} />
            </React.Fragment>
          ))}
          <line x1={cx} y1={20} x2={cx} y2={cy + 30} stroke="#16a34a" strokeWidth={2} strokeDasharray="5 3" />
          <circle cx={sx1} cy={cy + 30} r={6} fill="#2563eb" />
          <circle cx={sx2} cy={cy + 30} r={6} fill="#e11d48" />
          <text x={sx1 - 6} y={cy + 48} fontSize={11} fontWeight={700} fill="#1e293b">S₁</text>
          <text x={sx2 - 6} y={cy + 48} fontSize={11} fontWeight={700} fill="#1e293b">S₂</text>
        </g>
      );
    }

    case "young_double_slit": {
      const lambdaNm = Number(d.lambdaNm ?? 590);
      const iMm = Number(d.iMm ?? 1.2);
      const col = wavelengthToHex(lambdaNm);
      const slitX = 95;
      const screenX = stageW - 70;
      const strips = Array.from({ length: 45 }, (_, k) => k - 22);
      return (
        <g>
          <rect x={slitX - 3} y={24} width={6} height={stageH - 48} fill="#334155" />
          <rect x={slitX - 4} y={cy - 22} width={8} height={6} fill="#fff" />
          <rect x={slitX - 4} y={cy + 16} width={8} height={6} fill="#fff" />
          <polygon
            points={`20,${cy - 24} ${slitX},${cy - 24} ${slitX},${cy + 24} 20,${cy + 24}`}
            fill={col}
            fillOpacity={0.35}
          />
          <polygon
            points={`${slitX},${cy - 22} ${screenX},24 ${screenX},${stageH - 24} ${slitX},${cy + 22}`}
            fill={col}
            fillOpacity={0.14}
          />
          <rect x={screenX} y={24} width={28} height={stageH - 48} fill="#0f172a" rx={3} />
          {strips.map((idx) => {
            const yPos = cy + idx * 3.8;
            if (yPos < 26 || yPos > stageH - 28) return null;
            const xMm = idx * 0.22;
            const intensity = Math.pow(Math.cos((Math.PI * xMm) / iMm), 2);
            return (
              <rect
                key={idx}
                x={screenX + 2}
                y={yPos}
                width={24}
                height={3.9}
                fill={col}
                fillOpacity={intensity}
              />
            );
          })}
        </g>
      );
    }

    case "ideal_gas": {
      const V = Number(d.V ?? 3);
      const T = Number(d.T ?? 300);
      const t = Number(d.t ?? 0);
      const cylX = cx - 64;
      const cylW = 128;
      const botY = stageH - 24;
      const maxH = stageH - 54;
      const gasH = Math.max(32, Math.min(maxH, (V / 8) * maxH));
      const pistY = botY - gasH;
      const hotRatio = Math.min(1, Math.max(0, (T - 200) / 400));
      const pCol = `rgb(${Math.round(59 + hotRatio * 180)}, ${Math.round(130 - hotRatio * 60)}, ${Math.round(246 - hotRatio * 200)})`;
      const speedMul = Math.sqrt(T / 300);
      return (
        <g>
          <rect x={cylX} y={pistY} width={cylW} height={gasH} fill="#f8fafc" stroke="#334155" strokeWidth={2.5} />
          <rect x={cylX + 2} y={pistY - 12} width={cylW - 4} height={12} fill="#64748b" />
          <line x1={cx} y1={14} x2={cx} y2={pistY - 12} stroke="#475569" strokeWidth={5} />
          {Array.from({ length: 18 }).map((_, i) => {
            const rx = ((Math.sin(i * 12.7 + t * 2.1 * speedMul) + 1) / 2) * (cylW - 16) + cylX + 8;
            const ry = ((Math.cos(i * 8.3 + t * 2.7 * speedMul) + 1) / 2) * (gasH - 16) + pistY + 8;
            return <circle key={i} cx={rx} cy={ry} r={3.5} fill={pCol} />;
          })}
        </g>
      );
    }

    case "em_induction": {
      const magX = Number(d.magX ?? 0);
      const emf = Number(d.emf ?? 0);
      const coilX = cx + 36;
      const mCx = cx - 55 + magX * 52;
      const needleDeg = Math.max(-55, Math.min(55, emf * 14));
      return (
        <g>
          {/* Magnet */}
          <rect x={mCx - 38} y={cy - 16} width={38} height={32} fill="#dc2626" />
          <rect x={mCx} y={cy - 16} width={38} height={32} fill="#2563eb" />
          <text x={mCx - 24} y={cy + 4} fontSize={12} fontWeight={700} fill="#fff">S</text>
          <text x={mCx + 15} y={cy + 4} fontSize={12} fontWeight={700} fill="#fff">N</text>
          {/* Coil */}
          {[0, 1, 2, 3, 4].map((idx) => (
            <ellipse
              key={idx}
              cx={coilX + idx * 14}
              cy={cy}
              rx={7}
              ry={34}
              fill="none"
              stroke="#b45309"
              strokeWidth={3}
            />
          ))}
          {/* Galvanometer G */}
          <circle cx={stageW - 46} cy={46} r={24} fill="#fff" stroke="#334155" strokeWidth={2} />
          <text x={stageW - 51} y={64} fontSize={10} fontWeight={700} fill="#64748b">G</text>
          <line
            x1={stageW - 46}
            y1={46}
            x2={stageW - 46 + 18 * Math.sin((needleDeg * Math.PI) / 180)}
            y2={46 - 18 * Math.cos((needleDeg * Math.PI) / 180)}
            stroke="#dc2626"
            strokeWidth={2.2}
          />
        </g>
      );
    }

    case "rlc_ac_osc": {
      const U = Number(d.U ?? 100);
      const I = Number(d.I ?? 1.5);
      const phiRad = Number(d.phiRad ?? 0);
      const uPath = ev.series
        .map((p, idx) => {
          const px = 22 + (idx / (ev.series.length - 1)) * (stageW - 44);
          const py = cy - (p.y / (U * 1.6 || 1)) * 68;
          return `${idx === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
        })
        .join(" ");
      const iPath = ev.series
        .map((p, idx) => {
          const px = 22 + (idx / (ev.series.length - 1)) * (stageW - 44);
          const py = cy - ((p.y2 ?? 0) / (I * 42 || 1)) * 52;
          return `${idx === 0 ? "M" : "L"} ${px.toFixed(1)} ${py.toFixed(1)}`;
        })
        .join(" ");
      return (
        <g>
          <rect x={16} y={16} width={stageW - 32} height={stageH - 32} rx={8} fill="#0f172a" />
          <line x1={16} y1={cy} x2={stageW - 16} y2={cy} stroke="#334155" strokeDasharray="4 3" />
          <path d={uPath} fill="none" stroke="#38bdf8" strokeWidth={2.4} />
          <path d={iPath} fill="none" stroke="#fb923c" strokeWidth={2.4} />
          <text x={26} y={32} fontSize={11} fontWeight={600} fill="#38bdf8">u(t)</text>
          <text x={58} y={32} fontSize={11} fontWeight={600} fill="#fb923c">i(t) (Δφ = {((phiRad * 180) / Math.PI).toFixed(0)}°)</text>
        </g>
      );
    }

    case "photoelectric_nuclear": {
      if (d.isRadioactive) {
        const remainPct = Number(d.remainPct ?? 100);
        const total = 60;
        const aliveCount = Math.round((remainPct / 100) * total);
        return (
          <g>
            {Array.from({ length: total }).map((_, idx) => {
              const col = idx % 10;
              const row = Math.floor(idx / 10);
              const px = 48 + col * 30;
              const py = 28 + row * 28;
              const alive = (idx * 17 + 7) % total < aliveCount;
              return (
                <circle
                  key={idx}
                  cx={px}
                  cy={py}
                  r={7.5}
                  fill={alive ? "#0f766e" : "#fed7aa"}
                  stroke={alive ? "#115e59" : "#ea580c"}
                  strokeWidth={1.3}
                />
              );
            })}
          </g>
        );
      }
      const lambdaNm = Number(d.lambdaNm ?? 360);
      const emitted = Boolean(d.emitted);
      const t = Number(d.t ?? 0);
      const col = wavelengthToHex(lambdaNm);
      return (
        <g>
          <rect x={42} y={32} width={16} height={stageH - 64} rx={4} fill="#475569" />
          <rect x={stageW - 58} y={32} width={16} height={stageH - 64} rx={4} fill="#94a3b8" />
          {[0, 1, 2, 3].map((idx) => (
            <line
              key={idx}
              x1={110}
              y1={20}
              x2={58}
              y2={52 + idx * 34}
              stroke={col}
              strokeWidth={2.4}
              strokeDasharray="6 4"
            />
          ))}
          {emitted &&
            [0, 1, 2, 3, 4].map((idx) => {
              const frac = ((t * 0.9 + idx * 0.2) % 1);
              const ex = 62 + frac * (stageW - 125);
              const ey = 54 + idx * 28;
              return (
                <g key={idx}>
                  <circle cx={ex} cy={ey} r={4.5} fill="#2563eb" />
                  <text x={ex - 3} y={ey - 7} fontSize={9} fill="#1d4ed8">e⁻</text>
                </g>
              );
            })}
          {!emitted && (
            <text x={cx - 72} y={cy} fontSize={12} fontWeight={600} fill="#dc2626">
              λ &gt; λ₀ — Không có electron thoát ra
            </text>
          )}
        </g>
      );
    }
  }
}
