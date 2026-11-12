/**
 * Smart DC Circuit schematic layout, pin geometry, Union-Find netlist builder,
 * and nodal conductance matrix solver for Grade 11/12 Physics circuits.
 */

import type {
  CircuitComponentKind,
  CircuitComponentNode,
  CircuitWireSegment,
  PhysicsDiagramProps,
} from "@/types/physics";

export interface CircuitSolution {
  nodeVoltages: Map<string, number>;
  branchCurrents: Map<string, number>;
  branchVoltages: Map<string, number>;
  totalCurrentA: number;
  isShortCircuit: boolean;
  isOpenCircuit: boolean;
}

const COMP_HALF_LEN = 0.72;

export function getComponentPins(
  comp: CircuitComponentNode
): [{ x: number; y: number }, { x: number; y: number }] {
  const rad = (comp.rotation * Math.PI) / 180;
  const dx = Math.cos(rad) * COMP_HALF_LEN;
  const dy = Math.sin(rad) * COMP_HALF_LEN;
  return [
    { x: comp.x - dx, y: comp.y - dy },
    { x: comp.x + dx, y: comp.y + dy },
  ];
}

function terminalKey(compId: string, pin: 0 | 1): string {
  return `${compId}:${pin}`;
}

function solveLinearSystem(A: number[][], b: number[]): number[] | null {
  const n = A.length;
  if (n === 0) return [];
  const M = A.map((row, i) => [...row, b[i]]);

  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    }
    if (Math.abs(M[pivot][col]) < 1e-14) return null;
    if (pivot !== col) {
      const tmp = M[col];
      M[col] = M[pivot];
      M[pivot] = tmp;
    }
    const div = M[col][col];
    for (let j = col; j <= n; j++) M[col][j] /= div;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col];
      if (Math.abs(factor) < 1e-15) continue;
      for (let j = col; j <= n; j++) M[r][j] -= factor * M[col][j];
    }
  }
  return M.map((row) => row[n]);
}

export function solveCircuitDC(
  components: CircuitComponentNode[],
  wires: CircuitWireSegment[]
): CircuitSolution {
  const parent = new Map<string, string>();
  const keys: string[] = [];
  for (const c of components) {
    const k0 = terminalKey(c.id, 0);
    const k1 = terminalKey(c.id, 1);
    parent.set(k0, k0);
    parent.set(k1, k1);
    keys.push(k0, k1);
  }

  const find = (x: string): string => {
    let p = parent.get(x) ?? x;
    while (p !== (parent.get(p) ?? p)) {
      p = parent.get(p) ?? p;
    }
    let cur = x;
    while (cur !== p) {
      const next = parent.get(cur) ?? p;
      parent.set(cur, p);
      cur = next;
    }
    return p;
  };

  for (const w of wires) {
    const ka = terminalKey(w.fromCompId, w.fromPin);
    const kb = terminalKey(w.toCompId, w.toPin);
    if (!parent.has(ka) || !parent.has(kb)) continue;
    const ra = find(ka);
    const rb = find(kb);
    if (ra !== rb) parent.set(rb, ra);
  }

  const rootToIdx = new Map<string, number>();
  for (const k of keys) {
    const r = find(k);
    if (!rootToIdx.has(r)) rootToIdx.set(r, rootToIdx.size);
  }

  // Ground node at negative terminal (pin 0) of first battery if present
  const firstBattery = components.find((c) => c.kind === "battery");
  const gndIdx = firstBattery
    ? (rootToIdx.get(find(terminalKey(firstBattery.id, 0))) ?? 0)
    : 0;

  const nodeCount = rootToIdx.size;
  const unknowns: number[] = [];
  const idxToUnknown = new Map<number, number>();
  for (let i = 0; i < nodeCount; i++) {
    if (i === gndIdx) continue;
    idxToUnknown.set(i, unknowns.length);
    unknowns.push(i);
  }

  const N = unknowns.length;
  const G = Array.from({ length: N }, () => new Array<number>(N).fill(0));
  const Ivec = new Array<number>(N).fill(0);

  // Tiny leakage to keep disconnected nodes well-conditioned
  for (let i = 0; i < N; i++) G[i][i] += 1e-11;

  const stampConductance = (n0: number, n1: number, g: number) => {
    const u0 = idxToUnknown.get(n0);
    const u1 = idxToUnknown.get(n1);
    if (u0 !== undefined) G[u0][u0] += g;
    if (u1 !== undefined) G[u1][u1] += g;
    if (u0 !== undefined && u1 !== undefined) {
      G[u0][u1] -= g;
      G[u1][u0] -= g;
    }
  };

  const stampCurrentSource = (fromNode: number, toNode: number, iAmp: number) => {
    const u0 = idxToUnknown.get(fromNode);
    const u1 = idxToUnknown.get(toNode);
    if (u0 !== undefined) Ivec[u0] -= iAmp;
    if (u1 !== undefined) Ivec[u1] += iAmp;
  };

  const effRes = (c: CircuitComponentNode): number => {
    switch (c.kind) {
      case "battery":
        return Math.max(1e-3, c.extra ?? 1.0);
      case "resistor":
      case "bulb":
        return Math.max(0.1, c.value || 10);
      case "rheostat":
        return Math.max(0.2, (c.value || 20) * (c.extra ?? 0.5));
      case "switch":
        return c.closed ? 1e-4 : 1e9;
      case "ammeter":
        return 1e-4;
      case "inductor":
        return 1e-3;
      case "voltmeter":
      case "capacitor":
        return 1e9;
    }
  };

  for (const c of components) {
    const n0 = rootToIdx.get(find(terminalKey(c.id, 0))) ?? 0;
    const n1 = rootToIdx.get(find(terminalKey(c.id, 1))) ?? 0;
    const r = effRes(c);
    const g = 1 / r;
    stampConductance(n0, n1, g);
    if (c.kind === "battery") {
      // Pin 0 is (-), Pin 1 is (+)
      const emf = c.value || 12;
      stampCurrentSource(n0, n1, emf * g);
    }
  }

  const sol = solveLinearSystem(G, Ivec) ?? new Array<number>(N).fill(0);
  const nodeV = new Map<number, number>([[gndIdx, 0]]);
  for (const [nodeIdx, uIdx] of idxToUnknown.entries()) {
    nodeV.set(nodeIdx, sol[uIdx] ?? 0);
  }

  const nodeVoltages = new Map<string, number>();
  for (const k of keys) {
    const idx = rootToIdx.get(find(k)) ?? 0;
    nodeVoltages.set(k, nodeV.get(idx) ?? 0);
  }

  const branchCurrents = new Map<string, number>();
  const branchVoltages = new Map<string, number>();
  let totalCurrentA = 0;

  for (const c of components) {
    const n0 = rootToIdx.get(find(terminalKey(c.id, 0))) ?? 0;
    const n1 = rootToIdx.get(find(terminalKey(c.id, 1))) ?? 0;
    const v0 = nodeV.get(n0) ?? 0;
    const v1 = nodeV.get(n1) ?? 0;
    const u = v1 - v0;
    const r = effRes(c);
    if (c.kind === "battery") {
      const emf = c.value || 12;
      const iOut = (emf - u) / r;
      branchVoltages.set(c.id, u);
      branchCurrents.set(c.id, iOut);
      if (firstBattery?.id === c.id) totalCurrentA = Math.abs(iOut);
    } else {
      const iBranch = (v0 - v1) / r;
      branchVoltages.set(c.id, v0 - v1);
      branchCurrents.set(c.id, iBranch);
    }
  }

  return {
    nodeVoltages,
    branchCurrents,
    branchVoltages,
    totalCurrentA,
    isShortCircuit: totalCurrentA > 50,
    isOpenCircuit: totalCurrentA < 1e-4,
  };
}

export function createDefaultCircuitDiagramProps(
  preset: "series" | "parallel" = "series"
): Extract<PhysicsDiagramProps, { diagramKind: "circuit" }> {
  if (preset === "parallel") {
    const components: CircuitComponentNode[] = [
      { id: "bat1", kind: "battery", label: "E=12V, r=1Ω", x: 6, y: 6.4, rotation: 180, value: 12, extra: 1 },
      { id: "sw1", kind: "switch", label: "K", x: 3.2, y: 6.4, rotation: 0, value: 1, closed: true },
      { id: "amm1", kind: "ammeter", label: "A", x: 1.6, y: 3.8, rotation: 90, value: 0 },
      { id: "res1", kind: "resistor", label: "R₁=6Ω", x: 6, y: 1.6, rotation: 0, value: 6 },
      { id: "res2", kind: "resistor", label: "R₂=12Ω", x: 6, y: 3.6, rotation: 0, value: 12 },
      { id: "volt1", kind: "voltmeter", label: "V", x: 9.8, y: 2.6, rotation: 90, value: 0 },
    ];
    const wires: CircuitWireSegment[] = [
      { id: "w1", fromCompId: "bat1", fromPin: 1, toCompId: "sw1", toPin: 1 },
      { id: "w2", fromCompId: "sw1", fromPin: 0, toCompId: "amm1", toPin: 1 },
      { id: "w3", fromCompId: "amm1", fromPin: 0, toCompId: "res1", toPin: 0 },
      { id: "w4", fromCompId: "amm1", fromPin: 0, toCompId: "res2", toPin: 0 },
      { id: "w5", fromCompId: "res1", fromPin: 1, toCompId: "bat1", toPin: 0 },
      { id: "w6", fromCompId: "res2", fromPin: 1, toCompId: "bat1", toPin: 0 },
      { id: "w7", fromCompId: "res1", fromPin: 0, toCompId: "volt1", toPin: 0 },
      { id: "w8", fromCompId: "res1", fromPin: 1, toCompId: "volt1", toPin: 1 },
    ];
    return {
      diagramKind: "circuit",
      presetName: "Mạch song song R₁ // R₂",
      components,
      wires,
      width: 10.6,
      height: 6.8,
    };
  }

  const components: CircuitComponentNode[] = [
    { id: "bat1", kind: "battery", label: "E=12V, r=1Ω", x: 6, y: 6.2, rotation: 180, value: 12, extra: 1 },
    { id: "sw1", kind: "switch", label: "K", x: 2.6, y: 6.2, rotation: 0, value: 1, closed: true },
    { id: "amm1", kind: "ammeter", label: "A", x: 2.0, y: 3.8, rotation: 90, value: 0 },
    { id: "res1", kind: "resistor", label: "R=5Ω", x: 4.4, y: 1.6, rotation: 0, value: 5 },
    { id: "rheo1", kind: "rheostat", label: "R_b=12Ω", x: 8.2, y: 1.6, rotation: 0, value: 12, extra: 0.5 },
    { id: "bulb1", kind: "bulb", label: "Đ", x: 10.0, y: 3.9, rotation: 90, value: 4 },
    { id: "volt1", kind: "voltmeter", label: "V", x: 4.4, y: 3.6, rotation: 0, value: 0 },
  ];
  const wires: CircuitWireSegment[] = [
    { id: "w1", fromCompId: "bat1", fromPin: 1, toCompId: "sw1", toPin: 1 },
    { id: "w2", fromCompId: "sw1", fromPin: 0, toCompId: "amm1", toPin: 1 },
    { id: "w3", fromCompId: "amm1", fromPin: 0, toCompId: "res1", toPin: 0 },
    { id: "w4", fromCompId: "res1", fromPin: 1, toCompId: "rheo1", toPin: 0 },
    { id: "w5", fromCompId: "rheo1", fromPin: 1, toCompId: "bulb1", toPin: 0 },
    { id: "w6", fromCompId: "bulb1", fromPin: 1, toCompId: "bat1", toPin: 0 },
    { id: "w7", fromCompId: "res1", fromPin: 0, toCompId: "volt1", toPin: 0 },
    { id: "w8", fromCompId: "res1", fromPin: 1, toCompId: "volt1", toPin: 1 },
  ];
  return {
    diagramKind: "circuit",
    presetName: "Định luật Ôm toàn mạch",
    components,
    wires,
    width: 10.6,
    height: 6.8,
  };
}

export function getCircuitComponentLabel(kind: CircuitComponentKind): string {
  switch (kind) {
    case "battery":
      return "Nguồn (E,r)";
    case "resistor":
      return "Điện trở R";
    case "rheostat":
      return "Biến trở";
    case "switch":
      return "Khóa K";
    case "bulb":
      return "Bóng đèn";
    case "ammeter":
      return "Ampe kế A";
    case "voltmeter":
      return "Vôn kế V";
    case "capacitor":
      return "Tụ điện C";
    case "inductor":
      return "Cuộn cảm L";
  }
}
