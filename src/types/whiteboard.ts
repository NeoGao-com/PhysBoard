import { z } from "zod";

// --- Transform ---
export const TransformSchema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  scale: z.number().default(1),
  rotation: z.number().default(0),
  z: z.number().default(0),
});
export type Transform = z.infer<typeof TransformSchema>;

// --- Style ---
export const StyleSchema = z.object({
  stroke: z.string().nullable().optional(),
  fill: z.string().nullable().optional(),
  width: z.number().optional(), // 1, 2, 3.5, 6 (default: 2.4)
  opacity: z.number().min(0).max(1).optional(),
  dash: z.boolean().optional(),
  hidden: z.boolean().optional(),
  layer: z.enum(["answer", "base"]).optional(),
});
export type Style = z.infer<typeof StyleSchema>;

export interface StyleProperties {
  stroke?: string | null;
  fill?: string | null;
  width?: number | null;
  dash?: boolean | null;
  opacity?: number;
  hidden?: boolean;
}

// --- Meta ---
export const MetaSchema = z.object({
  createdBy: z.string(),
  createdAtSeq: z.number(),
  stepId: z.string().optional(),
  page: z.number().int().min(1).default(1),
});
export type Meta = z.infer<typeof MetaSchema>;

// --- Ink Props ---
export const InkPropsSchema = z.object({
  points: z.array(z.number()), // Flat [x0, y0, x1, y1, ...] in math world coordinates
  pressures: z.array(z.number()).optional(), // Pointer pressures [p0, p1, ...] in [0..1]
  closed: z.boolean().optional(),
  nib: z.enum(["fountain", "pencil", "highlighter", "brush", "dashed", "laser"]).optional(),
});
export type InkProps = z.infer<typeof InkPropsSchema>;

// --- Universal Canvas Element Schema ---
export const CanvasElementSchema = z.object({
  id: z.string().min(1),
  type: z.string(),
  transform: TransformSchema,
  style: StyleSchema,
  meta: MetaSchema,
  props: z.record(z.string(), z.any()),
});
export type CanvasElement = z.infer<typeof CanvasElementSchema>;

export type WhiteboardElementType =
  | "Ink"
  | "Point"
  | "Rectangle"
  | "MathText"
  | "Shape"
  | "Image"
  | "Table"
  | "Group"
  | "Step"
  | "GeomPoint"
  | "GeomSegment"
  | "GeomVector"
  | "VectorCalc"
  | "GeomLine"
  | "GeomRay"
  | "GeomCircle"
  | "GeomPolygon"
  | "GeomAngle"
  | "GeomConstruction"
  | "FillRegion"
  | "Axes2D"
  | "Axes3D"
  | "Plot"
  | "Slider"
  | "Conic"
  | "Curve2D"
  | "GraphTangent"
  | "GraphArea"
  | "VarTable"
  | "TrigCircle"
  | "Solid3D"
  | "RoundSection"
  | "SpaceFigure"
  | "OrthoViews"
  | "Revolution"
  | "Chart"
  | "TreeDiagram"
  | "Venn"
  | "Counting"
  | "NumberLine"
  | "Network"
  | "RealObject"
  | "LineDecor"
  | "ExamPaper"
  | "ExamItem"
  | "PhysicsSim"
  | "PhysicsDiagram"
  | "PhysicsInstrument"
  | "PhysicsLabTable";

// --- Discriminated Element Interfaces ---
export interface InkElement extends CanvasElement {
  type: "Ink";
  props: InkProps;
}

export interface MathTextElement extends CanvasElement {
  type: "MathText";
  props: {
    latex: string;
    mathjson?: Record<string, unknown>;
  };
}

export interface ShapeElement extends CanvasElement {
  type: "Shape";
  props: {
    kind: "rect" | "arrow" | "sticky" | "text" | "line";
    text?: string;
  };
}

export interface ImageElement extends CanvasElement {
  type: "Image";
  props: {
    src: string;
    w?: number;
    h?: number;
  };
}

export interface TableElementData extends CanvasElement {
  type: "Table";
  props: {
    cells: string[][];
  };
}

export interface Axes2DElementData extends CanvasElement {
  type: "Axes2D";
  props: {
    size?: number;
    sizeX?: number;
    sizeY?: number;
    xPos?: number;
    xNeg?: number;
    yPos?: number;
    yNeg?: number;
    grid?: boolean;
    ticks?: "int" | "pi";
    legend?: boolean;
  };
}

export interface Axes3DElementData extends CanvasElement {
  type: "Axes3D";
  props: {
    size?: number;
    xPos?: number;
    xNeg?: number;
    yPos?: number;
    yNeg?: number;
    zPos?: number;
    zNeg?: number;
  };
}

export interface PlotElementData extends CanvasElement {
  type: "Plot";
  props: {
    exprLatex: string;
    params?: Array<{
      name: string;
      min: number;
      max: number;
      step: number;
      value: number;
    }>;
    domain?: [number, number];
    shade?: [number, number];
    color?: string;
    axes?: string;
    marks?: {
      roots?: boolean;
      extrema?: boolean;
      yIntercept?: boolean;
      asymptotes?: boolean;
      intersections?: boolean;
    };
  };
}

export interface SliderElementData extends CanvasElement {
  type: "Slider";
  props: {
    name: string;
    min: number;
    max: number;
    step: number;
    value: number;
  };
}

export interface TrigCircleElementData extends CanvasElement {
  type: "TrigCircle";
  props: {
    angle: number;
    unit?: "rad" | "deg";
    show?: {
      sin?: boolean;
      cos?: boolean;
      tan?: boolean;
      cot?: boolean;
      special?: boolean;
    };
  };
}

export interface RealObjectElementData extends CanvasElement {
  type: "RealObject";
  props: {
    icon: string;
    from: string;
    to: string;
    width?: number;
    flip?: boolean;
    src?: string;
    ratio?: number;
  };
}

export interface LineDecorElementData extends CanvasElement {
  type: "LineDecor";
  props: {
    target: string;
    kind: "ground" | "water" | "dim" | "label";
    side: 1 | -1;
    text?: string;
    offset?: number;
  };
}

export interface WhiteboardPageState {
  cur: number;
  count: number;
}

// --- Whiteboard Action Commands ---
export type WhiteboardAction =
  | {
      type: "ink.stroke";
      params: {
        points: number[];
        pressures?: number[];
        closed?: boolean;
        nib?: InkProps["nib"];
        style?: Partial<Style>;
        at?: { x: number; y: number };
        page?: number;
      };
    }
  | {
      type: "object.create";
      params: {
        id?: string;
        type: string;
        transform?: Partial<Transform>;
        style?: Partial<Style>;
        props: Record<string, unknown>;
        page?: number;
        stepId?: string;
      };
    }
  | {
      type: "object.update";
      params: {
        id: string;
        transform?: Partial<Transform>;
        style?: Partial<Style>;
        props?: Record<string, unknown>;
      };
    }
  | {
      type: "object.delete";
      params: {
        id: string;
      };
    }
  | {
      type: "object.reorder";
      params: {
        id: string;
        z: number;
      };
    }
  | {
      type: "style.set";
      params: {
        id: string;
        style: Partial<Style>;
      };
    };

// --- Tool Identifier Types ---
export type WhiteboardTool =
  | "select"
  | "select:marquee"
  | "ink"
  | "ink:fountain"
  | "ink:pencil"
  | "ink:highlighter"
  | "ink:brush"
  | "ink:dashed"
  | "ink:laser"
  | "erase"
  | "pan"
  | "formula"
  | "text.write"
  | "point"
  | "geometry.point"
  | "segment"
  | "c:segment"
  | "c:dseg"
  | "c:line"
  | "c:ray"
  | "c:vector"
  | "circle"
  | "c:circle"
  | "polygon"
  | "c:polygon"
  | "floodFill"
  | string
  | null;

// --- Selection & Bounding Box ---
export interface BoundingBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export type HandleType = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface TransformHandle {
  type: HandleType;
  x: number; // Math World X
  y: number; // Math World Y
  anchorX: number; // Opposite anchor World X
  anchorY: number; // Opposite anchor World Y
  mode: "x" | "y" | "xy";
  cursor: "nwse-resize" | "nesw-resize" | "ns-resize" | "ew-resize";
}

// --- Styling Types for StylePicker ---
export interface StylePatch {
  stroke?: string | null;
  fill?: string | null;
  width?: number;
  dash?: boolean;
}

export interface SelectionStyleState {
  count: number;
  stroke: string | "mixed" | null;
  width: number | "mixed" | null;
  dash: boolean | "mixed" | null;
}
