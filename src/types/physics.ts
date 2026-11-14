/**
 * Domain types for Grade 10–12 (GDPT 2018) Physics simulations,
 * interactive diagrams (circuits, free-body forces, ray optics),
 * measuring instruments, automatic lab tables, and formula presets.
 */

export type PhysicsGrade = 10 | 11 | 12 | "optics";

export type PhysicsSimKind =
  | "kinematics_rect"
  | "projectile"
  | "incline_newton"
  | "collision_momentum"
  | "circular_motion"
  | "spring_pendulum"
  | "simple_pendulum"
  | "harmonic_phasor"
  | "standing_wave"
  | "wave_interference"
  | "young_double_slit"
  | "ideal_gas"
  | "em_induction"
  | "rlc_ac_osc"
  | "photoelectric_nuclear";

export interface PhysicsParamSpec {
  key: string;
  label: string;
  symbol: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface PhysicsSimMeta {
  kind: PhysicsSimKind;
  grade: PhysicsGrade;
  title: string;
  shortTitle: string;
  icon: string;
  description: string;
  keywords: string[];
  params: PhysicsParamSpec[];
  defaultModeOptions?: Array<{ value: string; label: string }>;
  graphAxesLabel: { xLabel: string; yLabel: string; title: string };
  relatedFormulas: string[];
}

export interface PhysicsSimProps {
  kind: PhysicsSimKind;
  playing: boolean;
  speed: 0.25 | 0.5 | 1 | 2;
  simTime: number;
  /** Epoch timestamp (ms) when `playing` last started/resumed, paired with `simTime` anchor. */
  anchorEpoch?: number;
  params: Record<string, number>;
  mode?: string;
  showVectors?: boolean;
  showGraph?: boolean;
  width?: number;
  height?: number;
  /** Optional linked Axes2D element id for realtime oscilloscope curve streaming. */
  linkedAxesId?: string;
}

export type CircuitComponentKind =
  | "battery"
  | "resistor"
  | "rheostat"
  | "switch"
  | "bulb"
  | "ammeter"
  | "voltmeter"
  | "capacitor"
  | "inductor";

export interface CircuitComponentNode {
  id: string;
  kind: CircuitComponentKind;
  label: string;
  /** Center position in diagram local units (grid 0..12 x 0..8). */
  x: number;
  y: number;
  /** Orientation in degrees: 0, 90, 180, 270. */
  rotation: 0 | 90 | 180 | 270;
  /** Resistance (Ohm), EMF (V), Capacitance (uF), Inductance (mH), or switch state (0/1). */
  value: number;
  /** Internal resistance r (for battery) or slider ratio 0..1 (for rheostat). */
  extra?: number;
  closed?: boolean;
}

export interface CircuitWireSegment {
  id: string;
  fromCompId: string;
  fromPin: 0 | 1;
  toCompId: string;
  toPin: 0 | 1;
}

export interface ForceVectorItem {
  id: string;
  symbol: string;
  angleDeg: number;
  magnitude: number;
  color: string;
}

export type OpticsDeviceKind =
  | "converging_lens"
  | "diverging_lens"
  | "concave_mirror"
  | "convex_mirror";

export type PhysicsDiagramProps =
  | {
      diagramKind: "circuit";
      presetName?: string;
      components: CircuitComponentNode[];
      wires: CircuitWireSegment[];
      showNodeVoltages?: boolean;
      width?: number;
      height?: number;
    }
  | {
      diagramKind: "fbd";
      massKg: number;
      inclineDeg: number;
      showAxesProjection: boolean;
      showResultant: boolean;
      forces: ForceVectorItem[];
      width?: number;
      height?: number;
    }
  | {
      diagramKind: "optics";
      device: OpticsDeviceKind;
      /** Focal length magnitude in SVG units (positive stored magnitude, sign inferred from device). */
      focalCm: number;
      /** Object distance d in cm (> 0 to left of optical center). */
      objectDistCm: number;
      /** Object height AB in cm. */
      objectHeightCm: number;
      width?: number;
      height?: number;
    };

export type PhysicsInstrumentKind = "ruler" | "protractor" | "stopwatch";

export interface PhysicsInstrumentProps {
  instrumentKind: PhysicsInstrumentKind;
  angleDeg?: number;
  lengthCm?: number;
  running?: boolean;
  elapsedSec?: number;
  anchorEpoch?: number;
  laps?: number[];
  linkedSimId?: string;
  width?: number;
  height?: number;
  /** Optional linked Axes2D element id for realtime oscilloscope curve streaming. */
  linkedAxesId?: string;
}

export interface LabTableRow {
  id: string;
  x: number;
  y: number;
}

export interface PhysicsLabTableProps {
  title: string;
  xLabel: string;
  yLabel: string;
  rows: LabTableRow[];
  linkedSimId?: string;
  width?: number;
  height?: number;
  /** Optional linked Axes2D element id for realtime oscilloscope curve streaming. */
  linkedAxesId?: string;
}

export interface PhysicsFormulaItem {
  id: string;
  grade: PhysicsGrade;
  topic: string;
  name: string;
  latex: string;
  note: string;
  keywords: string[];
}

export interface PhysicsConstantItem {
  id: string;
  name: string;
  symbol: string;
  valueText: string;
  latex: string;
  keywords: string[];
}

export interface PhysicsLessonPreset {
  id: string;
  grade: 10 | 11 | 12;
  title: string;
  subtitle: string;
  simKind?: PhysicsSimKind;
  diagramKind?: "circuit" | "fbd" | "optics";
  formulaLatexList: string[];
  questionPrompt: string;
  keywords: string[];
}
