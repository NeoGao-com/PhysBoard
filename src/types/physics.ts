/**
 * Domain types for Grade 10–12 (GDPT 2018) Physics simulations,
 * interactive diagrams (circuits, free-body forces, ray optics),
 * measuring instruments, automatic lab tables, and formula presets.
 */

export type PhysicsGrade = 10 | 11 | 12 | "optics";



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

export type PhysicsInstrumentKind =
  | "ruler"
  | "protractor"
  | "stopwatch"
  | "setsquare"
  | "compass";

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
  // Specific instrument configurations
  setSquareKind?: "30-60-90" | "45-45-90";
  protractorType?: "180" | "360";
  protractorAngle?: number;
  compassRadius?: number; // in world cm/units
  compassArcStart?: number; // degrees
  compassArcEnd?: number; // degrees
  compassAngle?: number; // rotation in degrees
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


