"use client";

import React from "react";
import type { CanvasElement } from "@/types/whiteboard";
import type {
  CircuitComponentNode,
  OpticsDeviceKind,
  PhysicsDiagramProps,
} from "@/types/physics";
import { getComponentPins, solveCircuitDC } from "@/lib/physics-circuit";
import { solveForceDiagram } from "@/lib/physics-forces";
import { isLensDevice, solveOpticsDiagram } from "@/lib/physics-optics";

export interface PhysicsDiagramElementProps {
  element: CanvasElement;
  isSelected?: boolean;
  onPointerDown?: (e: React.PointerEvent, id: string) => void;
  onUpdateProps?: (id: string, patch: Record<string, unknown>) => void;
}

const BOX_W = 600;
const BOX_H = 390;

function drawComponentSymbol(
  comp: CircuitComponentNode,
  liveCurrent: number,
  liveVoltage: number,
  onToggleSwitch?: () => void
): React.ReactNode {
  const gx = 40 + (comp.x / 12) * 520;
  const gy = 48 + (comp.y / 8) * 265;
  const rot = comp.rotation;

  const body = (() => {
    switch (comp.kind) {
      case "battery":
        return (
          <g>
            <line x1={-32} y1={0} x2={-6} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={6} y1={0} x2={32} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            {/* Pin 0 (- short thick), Pin 1 (+ long thin) */}
            <line x1={-6} y1={-10} x2={-6} y2={10} stroke="#0f172a" strokeWidth={3.5} />
            <line x1={6} y1={-18} x2={6} y2={18} stroke="#dc2626" strokeWidth={2.2} />
            <text x={-17} y={-10} fontSize={10} fontWeight={700} fill="#475569">−</text>
            <text x={11} y={-10} fontSize={10} fontWeight={700} fill="#dc2626">+</text>
          </g>
        );
      case "resistor":
        return (
          <g>
            <line x1={-32} y1={0} x2={-18} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={18} y1={0} x2={32} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <rect x={-18} y={-8} width={36} height={16} fill="#ffffff" stroke="#0f172a" strokeWidth={2.2} />
          </g>
        );
      case "rheostat":
        return (
          <g>
            <line x1={-32} y1={0} x2={-18} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={18} y1={0} x2={32} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <rect x={-18} y={-8} width={36} height={16} fill="#ffffff" stroke="#0f172a" strokeWidth={2.2} />
            <line x1={-16} y1={14} x2={16} y2={-14} stroke="#2563eb" strokeWidth={2} />
            <polygon points="16,-14 8,-13 13,-7" fill="#2563eb" />
          </g>
        );
      case "switch":
        return (
          <g
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleSwitch?.();
            }}
            style={{ cursor: "pointer" }}
          >
            <rect x={-28} y={-20} width={56} height={36} fill="rgba(0,0,0,0.001)" />
            <line x1={-32} y1={0} x2={-14} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={14} y1={0} x2={32} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <circle cx={-14} cy={0} r={3.5} fill="#0f172a" />
            <circle cx={14} cy={0} r={3.5} fill="#0f172a" />
            <line
              x1={-14}
              y1={0}
              x2={comp.closed ? 14 : 11}
              y2={comp.closed ? 0 : -15}
              stroke={comp.closed ? "#16a34a" : "#dc2626"}
              strokeWidth={2.6}
            />
          </g>
        );
      case "bulb": {
        const lit = Math.abs(liveCurrent) > 0.05;
        return (
          <g>
            <line x1={-32} y1={0} x2={-14} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={14} y1={0} x2={32} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <circle
              cx={0}
              cy={0}
              r={14}
              fill={lit ? "#fef08a" : "#ffffff"}
              stroke="#0f172a"
              strokeWidth={2.2}
            />
            <line x1={-9} y1={-9} x2={9} y2={9} stroke="#0f172a" strokeWidth={1.6} />
            <line x1={-9} y1={9} x2={9} y2={-9} stroke="#0f172a" strokeWidth={1.6} />
          </g>
        );
      }
      case "ammeter":
      case "voltmeter": {
        const isA = comp.kind === "ammeter";
        return (
          <g>
            <line x1={-32} y1={0} x2={-15} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={15} y1={0} x2={32} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <circle
              cx={0}
              cy={0}
              r={15}
              fill="#ffffff"
              stroke={isA ? "#2563eb" : "#e11d48"}
              strokeWidth={2.2}
            />
            <text
              x={0}
              y={4}
              textAnchor="middle"
              fontSize={12}
              fontWeight={800}
              fill={isA ? "#2563eb" : "#e11d48"}
              transform={`rotate(${-rot})`}
            >
              {isA ? "A" : "V"}
            </text>
          </g>
        );
      }
      case "capacitor":
        return (
          <g>
            <line x1={-32} y1={0} x2={-5} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={5} y1={0} x2={32} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={-5} y1={-14} x2={-5} y2={14} stroke="#0f172a" strokeWidth={2.4} />
            <line x1={5} y1={-14} x2={5} y2={14} stroke="#0f172a" strokeWidth={2.4} />
          </g>
        );
      case "inductor":
        return (
          <g>
            <line x1={-32} y1={0} x2={-18} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <line x1={18} y1={0} x2={32} y2={0} stroke="#0f172a" strokeWidth={2.2} />
            <path
              d="M -18 0 A 6 7 0 0 1 -6 0 A 6 7 0 0 1 6 0 A 6 7 0 0 1 18 0"
              fill="none"
              stroke="#0f172a"
              strokeWidth={2.2}
            />
          </g>
        );
    }
  })();

  const readoutText =
    comp.kind === "ammeter"
      ? `${Math.abs(liveCurrent).toFixed(2)} A`
      : comp.kind === "voltmeter"
        ? `${Math.abs(liveVoltage).toFixed(2)} V`
        : comp.kind === "rheostat"
          ? `${comp.label} (${((comp.value || 12) * (comp.extra ?? 0.5)).toFixed(1)}Ω)`
          : comp.label;

  return (
    <g key={comp.id} transform={`translate(${gx}, ${gy})`}>
      <g transform={`rotate(${rot})`}>{body}</g>
      <text
        x={0}
        y={rot === 90 || rot === 270 ? 28 : -20}
        textAnchor="middle"
        fontSize={10.5}
        fontWeight={700}
        fill={comp.kind === "ammeter" ? "#1d4ed8" : comp.kind === "voltmeter" ? "#be123c" : "#334155"}
      >
        {readoutText}
      </text>
    </g>
  );
}

export const PhysicsDiagramElement: React.FC<PhysicsDiagramElementProps> = ({
  element,
  isSelected = false,
  onPointerDown,
  onUpdateProps,
}) => {
  const props = element.props as unknown as PhysicsDiagramProps;
  const sc = element.transform.scale || 1;
  const defaultW = props.diagramKind === "optics" ? 10.8 : 10.2;
  const defaultH = 6.6;
  const worldW = (typeof props.width === "number" && props.width > 0 ? props.width : defaultW) * sc;
  const worldH = (typeof props.height === "number" && props.height > 0 ? props.height : defaultH) * sc;
  const tx = element.transform.x;
  const ty = element.transform.y;

  const headerTitle =
    props.diagramKind === "circuit"
      ? `⚡ ${props.presetName ?? "Sơ đồ Mạch điện"}`
      : props.diagramKind === "fbd"
        ? "↗ Phân tích Lực & Chiếu hệ trục Ox/Oy"
        : "🔍 Quang hình học (3 Tia sáng & Dựng ảnh)";

  const renderBody = () => {
    if (props.diagramKind === "circuit") {
      const sol = solveCircuitDC(props.components, props.wires);
      const compMap = new Map(props.components.map((c) => [c.id, c]));
      const toSvg = (gx: number, gy: number) => ({
        x: 40 + (gx / 12) * 520,
        y: 48 + (gy / 8) * 265,
      });
      const rheo = props.components.find((c) => c.kind === "rheostat");
      const bat = props.components.find((c) => c.kind === "battery");
      const sw = props.components.find((c) => c.kind === "switch");

      return (
        <>
          <g>
            {props.wires.map((w) => {
              const ca = compMap.get(w.fromCompId);
              const cb = compMap.get(w.toCompId);
              if (!ca || !cb) return null;
              const pa = getComponentPins(ca)[w.fromPin];
              const pb = getComponentPins(cb)[w.toPin];
              const sa = toSvg(pa.x, pa.y);
              const sb = toSvg(pb.x, pb.y);
              const midX = (sa.x + sb.x) / 2;
              const dPath =
                Math.abs(sa.x - sb.x) < 2 || Math.abs(sa.y - sb.y) < 2
                  ? `M ${sa.x} ${sa.y} L ${sb.x} ${sb.y}`
                  : `M ${sa.x} ${sa.y} L ${midX} ${sa.y} L ${midX} ${sb.y} L ${sb.x} ${sb.y}`;
              return (
                <path
                  key={w.id}
                  d={dPath}
                  fill="none"
                  stroke={sol.isOpenCircuit ? "#64748b" : "#1e293b"}
                  strokeWidth={2}
                />
              );
            })}
            {props.components.map((comp) =>
              drawComponentSymbol(
                comp,
                sol.branchCurrents.get(comp.id) ?? 0,
                sol.branchVoltages.get(comp.id) ?? 0,
                comp.kind === "switch"
                  ? () => {
                      const nextComps = props.components.map((c) =>
                        c.id === comp.id ? { ...c, closed: !c.closed } : c
                      );
                      onUpdateProps?.(element.id, { components: nextComps });
                    }
                  : undefined
              )
            )}
          </g>
          <foreignObject x={12} y={326} width={BOX_W - 24} height={56}>
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 11.5,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <span data-physics-circuit-readout="true" style={{ fontWeight: 700, color: sol.isOpenCircuit ? "#dc2626" : "#1d4ed8" }}>
                {sol.isShortCircuit
                  ? "⚠ Ngắn mạch!"
                  : sol.isOpenCircuit
                    ? "Mạch hở: I = 0.00 A"
                    : `I_mạch = ${sol.totalCurrentA.toFixed(2)} A`}
              </span>
              {sw && (
                <button
                  type="button"
                  data-physics-switch="true"
                  onClick={() => {
                    const next = props.components.map((c) =>
                      c.id === sw.id ? { ...c, closed: !c.closed } : c
                    );
                    onUpdateProps?.(element.id, { components: next });
                  }}
                  style={{
                    padding: "3px 9px",
                    borderRadius: 6,
                    border: "1px solid #cbd5e1",
                    background: sw.closed ? "#dcfce7" : "#fee2e2",
                    color: sw.closed ? "#166534" : "#991b1b",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Khóa K: {sw.closed ? "Đóng" : "Mở"}
                </button>
              )}
              {rheo && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
                  R_b:
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.05}
                    value={rheo.extra ?? 0.5}
                    onChange={(e) => {
                      const ratio = Number(e.target.value);
                      const next = props.components.map((c) =>
                        c.id === rheo.id ? { ...c, extra: ratio } : c
                      );
                      onUpdateProps?.(element.id, { components: next });
                    }}
                    style={{ width: 90, accentColor: "#2563eb" }}
                  />
                  {((rheo.value || 12) * (rheo.extra ?? 0.5)).toFixed(1)}Ω
                </label>
              )}
              {bat && (
                <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontWeight: 600 }}>
                  E:
                  <input
                    type="range"
                    min={3}
                    max={24}
                    step={1}
                    value={bat.value}
                    onChange={(e) => {
                      const emf = Number(e.target.value);
                      const next = props.components.map((c) =>
                        c.id === bat.id ? { ...c, value: emf, label: `E=${emf}V, r=${c.extra ?? 1}Ω` } : c
                      );
                      onUpdateProps?.(element.id, { components: next });
                    }}
                    style={{ width: 70, accentColor: "#2563eb" }}
                  />
                  {bat.value}V
                </label>
              )}
            </div>
          </foreignObject>
        </>
      );
    }

    if (props.diagramKind === "fbd") {
      const sol = solveForceDiagram(props.forces, props.massKg, props.inclineDeg);
      const cx = 300;
      const cy = 185;
      const scaleN = 5.2;
      const axisRad = (props.inclineDeg * Math.PI) / 180;
      const ux = Math.cos(axisRad);
      const uy = Math.sin(axisRad);

      return (
        <>
          <g>
            {/* Surface / Incline */}
            <line
              x1={cx - ux * 200}
              y1={cy + 20 - uy * 200}
              x2={cx + ux * 200}
              y2={cy + 20 + uy * 200}
              stroke="#64748b"
              strokeWidth={3}
            />
            {props.showAxesProjection && (
              <>
                <line
                  x1={cx - ux * 145}
                  y1={cy - uy * 145}
                  x2={cx + ux * 155}
                  y2={cy + uy * 155}
                  stroke="#94a3b8"
                  strokeDasharray="5 4"
                />
                <line
                  x1={cx + uy * 130}
                  y1={cy - ux * 130}
                  x2={cx - uy * 130}
                  y2={cy + ux * 130}
                  stroke="#94a3b8"
                  strokeDasharray="5 4"
                />
                <text x={cx + ux * 158} y={cy + uy * 158 + 4} fontSize={11} fill="#64748b">Ox</text>
                <text x={cx + uy * 135} y={cy - ux * 135} fontSize={11} fill="#64748b">Oy</text>
              </>
            )}
            <g transform={`translate(${cx}, ${cy}) rotate(${props.inclineDeg})`}>
              <rect x={-22} y={-18} width={44} height={36} rx={5} fill="#eff6ff" stroke="#1e40af" strokeWidth={2} />
              <text x={0} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#1e3a8a">
                {props.massKg}kg
              </text>
            </g>
            {props.forces.map((f) => {
              const r = (f.angleDeg * Math.PI) / 180;
              const ex = cx + Math.cos(r) * f.magnitude * scaleN;
              const ey = cy - Math.sin(r) * f.magnitude * scaleN;
              const proj = sol.projections.find((p) => p.id === f.id);
              const px = cx + (proj?.fxWorld ?? 0) * scaleN;
              const py = cy - (proj?.fyWorld ?? 0) * scaleN;
              return (
                <g key={f.id}>
                  {props.showAxesProjection && proj && Math.hypot(px - ex, py - ey) > 4 && (
                    <line x1={ex} y1={ey} x2={px} y2={py} stroke={f.color} strokeOpacity={0.55} strokeDasharray="3 3" />
                  )}
                  <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={f.color} strokeWidth={2.5} />
                  <circle cx={ex} cy={ey} r={3.5} fill={f.color} />
                  <text x={ex + 6} y={ey - 4} fontSize={11.5} fontWeight={700} fill={f.color}>
                    {f.symbol.replace(/\\vec\{([^}]+)\}/g, "$1")} ({f.magnitude.toFixed(1)}N)
                  </text>
                </g>
              );
            })}
            {props.showResultant && sol.resultantMag > 0.2 && (() => {
              const r = (sol.resultantWorldAngleDeg * Math.PI) / 180;
              const ex = cx + Math.cos(r) * sol.resultantMag * scaleN;
              const ey = cy - Math.sin(r) * sol.resultantMag * scaleN;
              return (
                <g>
                  <line x1={cx} y1={cy} x2={ex} y2={ey} stroke="#16a34a" strokeWidth={3} strokeDasharray="6 3" />
                  <circle cx={ex} cy={ey} r={4} fill="#16a34a" />
                  <text x={ex + 6} y={ey + 12} fontSize={11} fontWeight={700} fill="#15803d">
                    F_hl={sol.resultantMag.toFixed(1)}N
                  </text>
                </g>
              );
            })()}
          </g>
          <foreignObject x={12} y={326} width={BOX_W - 24} height={56}>
            <div
              onPointerDown={(e) => e.stopPropagation()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 11.5,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              <span style={{ fontWeight: 700, color: "#15803d" }}>
                a = {sol.accelMs2.toFixed(2)} m/s²
              </span>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                α:
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={props.inclineDeg}
                  onChange={(e) => {
                    const alpha = Number(e.target.value);
                    const rad = (alpha * Math.PI) / 180;
                    const P = props.massKg * 9.8;
                    const N = Number((P * Math.cos(rad)).toFixed(1));
                    const nextForces = props.forces.map((f) => {
                      if (f.id === "f_N") return { ...f, angleDeg: 90 - alpha, magnitude: N };
                      if (f.id === "f_ms") return { ...f, angleDeg: 180 - alpha, magnitude: Number((0.15 * N).toFixed(1)) };
                      return f;
                    });
                    onUpdateProps?.(element.id, { inclineDeg: alpha, forces: nextForces });
                  }}
                  style={{ width: 90, accentColor: "#2563eb" }}
                />
                {props.inclineDeg}°
              </label>
              <button
                type="button"
                onClick={() => onUpdateProps?.(element.id, { showAxesProjection: !props.showAxesProjection })}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: props.showAxesProjection ? "#dbeafe" : "#ffffff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Chiếu Ox/Oy
              </button>
              <button
                type="button"
                onClick={() => {
                  const hasPull = props.forces.some((f) => f.id === "f_pull");
                  const next = hasPull
                    ? props.forces.filter((f) => f.id !== "f_pull")
                    : [
                        ...props.forces,
                        { id: "f_pull", symbol: "F_kéo", angleDeg: -props.inclineDeg, magnitude: 10, color: "#7c3aed" },
                      ];
                  onUpdateProps?.(element.id, { forces: next });
                }}
                style={{
                  padding: "3px 8px",
                  borderRadius: 6,
                  border: "1px solid #cbd5e1",
                  background: "#ffffff",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                + Lực kéo
              </button>
            </div>
          </foreignObject>
        </>
      );
    }

    // Optics interactive 3-ray diagram
    const sol = solveOpticsDiagram(
      props.device,
      props.focalCm,
      props.objectDistCm,
      props.objectHeightCm
    );
    const ox = 300;
    const oy = 186;
    const pxPerCm = 5.4;
    const toPx = (cmX: number, cmY: number) => ({
      x: ox + cmX * pxPerCm,
      y: oy - cmY * pxPerCm,
    });
    const isLens = isLensDevice(props.device);
    const objBase = toPx(-sol.dCm, 0);
    const objTop = toPx(-sol.dCm, props.objectHeightCm);
    const imgBase =
      sol.dPrimeCm !== null
        ? toPx(isLens ? sol.dPrimeCm : -sol.dPrimeCm, 0)
        : null;
    const imgTop =
      sol.dPrimeCm !== null && sol.imageHeightCm !== null
        ? toPx(isLens ? sol.dPrimeCm : -sol.dPrimeCm, sol.imageHeightCm)
        : null;
    const f1 = toPx(-Math.abs(sol.signedFocalCm), 0);
    const f2 = toPx(Math.abs(sol.signedFocalCm), 0);

    return (
      <>
        <g>
          {/* Principal Axis */}
          <line x1={20} y1={oy} x2={BOX_W - 20} y2={oy} stroke="#64748b" strokeWidth={1.6} />
          {/* Optical Device */}
          {isLens ? (
            <g>
              <line x1={ox} y1={66} x2={ox} y2={306} stroke="#0284c7" strokeWidth={2.8} />
              <polyline
                points={
                  props.device === "converging_lens"
                    ? `${ox - 7},74 ${ox},64 ${ox + 7},74`
                    : `${ox - 7},64 ${ox},74 ${ox + 7},64`
                }
                fill="none"
                stroke="#0284c7"
                strokeWidth={2.5}
              />
              <polyline
                points={
                  props.device === "converging_lens"
                    ? `${ox - 7},298 ${ox},308 ${ox + 7},298`
                    : `${ox - 7},308 ${ox},298 ${ox + 7},308`
                }
                fill="none"
                stroke="#0284c7"
                strokeWidth={2.5}
              />
            </g>
          ) : (
            <path
              d={
                props.device === "concave_mirror"
                  ? `M ${ox - 8} 68 Q ${ox + 12} ${oy} ${ox - 8} 304`
                  : `M ${ox + 8} 68 Q ${ox - 12} ${oy} ${ox + 8} 304`
              }
              fill="none"
              stroke="#0284c7"
              strokeWidth={3.2}
            />
          )}

          {/* Focal markers */}
          <circle cx={f1.x} cy={oy} r={3.5} fill="#0f172a" />
          <text x={f1.x - 4} y={oy + 15} fontSize={10.5} fontWeight={700} fill="#334155">F</text>
          {isLens && (
            <>
              <circle cx={f2.x} cy={oy} r={3.5} fill="#0f172a" />
              <text x={f2.x - 4} y={oy + 15} fontSize={10.5} fontWeight={700} fill="#334155">F′</text>
            </>
          )}
          <text x={ox + 4} y={oy + 14} fontSize={10.5} fontWeight={700} fill="#334155">O</text>

          {/* 3 Principal Rays */}
          {sol.rays.map((r, idx) => {
            const p1 = toPx(r.x1, r.y1);
            const p2 = toPx(r.x2, r.y2);
            return (
              <line
                key={idx}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke={r.color}
                strokeWidth={1.8}
                strokeDasharray={r.dashed ? "5 4" : undefined}
              />
            );
          })}

          {/* Object AB */}
          <line x1={objBase.x} y1={objBase.y} x2={objTop.x} y2={objTop.y} stroke="#1e293b" strokeWidth={3} />
          <polygon points={`${objTop.x},${objTop.y} ${objTop.x - 4},${objTop.y + 8} ${objTop.x + 4},${objTop.y + 8}`} fill="#1e293b" />
          <text x={objBase.x - 6} y={objBase.y + 15} fontSize={11} fontWeight={700}>A</text>
          <text x={objTop.x - 6} y={objTop.y - 6} fontSize={11} fontWeight={700}>B</text>

          {/* Image A'B' */}
          {imgBase && imgTop && Math.abs(imgTop.y - oy) < 220 && (
            <g>
              <line
                x1={imgBase.x}
                y1={imgBase.y}
                x2={imgTop.x}
                y2={imgTop.y}
                stroke="#e11d48"
                strokeWidth={2.8}
                strokeDasharray={sol.isRealImage ? undefined : "5 3"}
              />
              <text x={imgBase.x - 6} y={imgBase.y + (sol.isUpright ? 15 : -8)} fontSize={11} fontWeight={700} fill="#e11d48">
                A′
              </text>
              <text x={imgTop.x - 6} y={imgTop.y + (sol.isUpright ? -6 : 14)} fontSize={11} fontWeight={700} fill="#e11d48">
                B′
              </text>
            </g>
          )}
        </g>

        <foreignObject x={12} y={322} width={BOX_W - 24} height={60}>
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              padding: "5px 10px",
              fontSize: 11,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
              <span data-physics-optics-summary="true" style={{ fontWeight: 700, color: sol.isRealImage ? "#0f766e" : "#be123c" }}>
                {sol.summaryText} {sol.dPrimeCm !== null ? `(d′=${sol.dPrimeCm.toFixed(1)}cm, k=${sol.k?.toFixed(2)})` : ""}
              </span>
              <select
                value={props.device}
                onChange={(e) => onUpdateProps?.(element.id, { device: e.target.value as OpticsDeviceKind })}
                style={{ fontSize: 11, borderRadius: 5, border: "1px solid #cbd5e1", padding: "1px 4px" }}
              >
                <option value="converging_lens">Thấu kính hội tụ</option>
                <option value="diverging_lens">Thấu kính phân kỳ</option>
                <option value="concave_mirror">Gương cầu lõm</option>
                <option value="convex_mirror">Gương cầu lồi</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, flex: 1 }}>
                d:
                <input
                  type="range"
                  data-physics-optics-d="true"
                  min={4}
                  max={45}
                  step={1}
                  value={props.objectDistCm}
                  onChange={(e) => onUpdateProps?.(element.id, { objectDistCm: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: "#2563eb" }}
                />
                {props.objectDistCm}cm
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, flex: 1 }}>
                |f|:
                <input
                  type="range"
                  min={6}
                  max={25}
                  step={1}
                  value={props.focalCm}
                  onChange={(e) => onUpdateProps?.(element.id, { focalCm: Number(e.target.value) })}
                  style={{ flex: 1, accentColor: "#0284c7" }}
                />
                {props.focalCm}cm
              </label>
            </div>
          </div>
        </foreignObject>
      </>
    );
  };

  return (
    <g
      data-id={element.id}
      data-oid={element.id}
      data-element-type="PhysicsDiagram"
      data-physics-diagram={props.diagramKind}
      data-selected={isSelected ? "true" : undefined}
      transform={`translate(${tx - worldW / 2}, ${-ty - worldH / 2}) scale(${worldW / BOX_W}, ${worldH / BOX_H})`}
      onPointerDown={(e) => onPointerDown?.(e, element.id)}
      style={{ cursor: "move" }}
    >
      <rect
        x={0}
        y={0}
        width={BOX_W}
        height={BOX_H}
        rx={12}
        fill="#ffffff"
        stroke={isSelected ? "#f59e0b" : "#cbd5e1"}
        strokeWidth={isSelected ? 2.5 : 1.5}
      />
      <rect x={0} y={0} width={BOX_W} height={36} rx={12} fill="#f0f9ff" />
      <rect x={0} y={22} width={BOX_W} height={14} fill="#f0f9ff" />
      <text x={14} y={23} fontSize={13} fontWeight={700} fill="#0c4a6e">
        {headerTitle}
      </text>
      {renderBody()}
    </g>
  );
};
