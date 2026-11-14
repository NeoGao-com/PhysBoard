"use client";

import React from "react";

interface IconProps {
  size?: number;
  color?: string;
}

const base = (size: number, color = "currentColor"): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: 1.85,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
});

export const IconGrip: React.FC<IconProps> = ({ size = 14, color = "#94a3b8" }) => (
  <svg {...base(size, color)}>
    <circle cx="9" cy="6" r="1" fill={color} />
    <circle cx="15" cy="6" r="1" fill={color} />
    <circle cx="9" cy="12" r="1" fill={color} />
    <circle cx="15" cy="12" r="1" fill={color} />
    <circle cx="9" cy="18" r="1" fill={color} />
    <circle cx="15" cy="18" r="1" fill={color} />
  </svg>
);

export const IconCursor: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M5 3l14 7-6 2-2 6-6-15z" />
  </svg>
);

export const IconMarquee: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
  </svg>
);

export const IconPen: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

export const IconFountain: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="m12 19 7-7 3 3-7 7-3-3z" />
    <path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <circle cx="11" cy="11" r="1.5" />
  </svg>
);

export const IconPencil: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M21.17 6.81a1 1 0 0 0-3.98-3.98L3.84 16.18a1 1 0 0 0-.29.53l-.7 3.91a.5.5 0 0 0 .58.58l3.91-.7a1 1 0 0 0 .53-.29Z" />
    <path d="m15 5 4 4" />
  </svg>
);

export const IconHighlighter: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="m9 11-6 6v3h9l3-3" />
    <path d="m22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4" />
  </svg>
);

export const IconBrush: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08" />
    <path d="M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z" />
  </svg>
);

export const IconLaser: React.FC<IconProps> = ({ size = 15, color = "#ef4444" }) => (
  <svg {...base(size, color)}>
    <path d="m14 4 6 6-8 8H6v-6l8-8z" />
    <path d="m17 7 3-3" strokeWidth={2.2} stroke="#ef4444" />
    <circle cx="20.5" cy="3.5" r="1.5" fill="#ef4444" stroke="none" />
    <path d="M9 15l2 2" />
  </svg>
);

export const IconShapeSnap: React.FC<IconProps> = ({ size = 15, color = "currentColor" }) => (
  <svg {...base(size, color)}>
    <path d="M4 4h6v6H4z" />
    <circle cx="16" cy="16" r="4" />
    <path d="M14 7h6M17 4v6" strokeWidth={1.5} />
  </svg>
);
export const IconDashedPen: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M4 18c2-4 5-4 7 0s5 4 9-2" strokeDasharray="3 3" />
    <path d="M15 4l5 5-7 7H8v-5l7-7z" />
  </svg>
);

export const IconEraser: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
    <path d="M22 21H7" />
    <path d="m5 11 9 9" />
  </svg>
);

export const IconFormula: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M9 19c1.5 0 2.5-1 3-3l2-9c.5-2 1.5-3 3-3" />
    <path d="M8 11h8" />
  </svg>
);

export const IconInsert: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

export const IconPoint: React.FC<IconProps> = ({ size = 14, color }) => (
  <svg {...base(size, color)}>
    <circle cx="12" cy="12" r="4" fill={color || "currentColor"} />
  </svg>
);

export const IconSegment: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <circle cx="5" cy="19" r="2" fill={color || "currentColor"} />
    <circle cx="19" cy="5" r="2" fill={color || "currentColor"} />
    <path d="M6.5 17.5 17.5 6.5" />
  </svg>
);

export const IconCircle: React.FC<IconProps> = ({ size = 14, color }) => (
  <svg {...base(size, color)}>
    <circle cx="12" cy="12" r="8" />
  </svg>
);

export const IconPolygon: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <polygon points="12 3 21 9.5 17.5 20 6.5 20 3 9.5" />
  </svg>
);

export const IconTriangle2D: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M4 20h16L4 4v16z" />
    <path d="M8 16h5v-5" strokeWidth="1.4" />
  </svg>
);

export const IconBucket: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="m19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z" />
    <path d="m5 2 5 5" />
    <path d="M2 13h15" />
    <path d="M22 20a2 2 0 1 1-4 0c0-1.6 2-3.5 2-3.5s2 1.9 2 3.5Z" fill="#3b82f6" stroke="#2563eb" />
  </svg>
);

export const IconCube3D: React.FC<IconProps> = ({ size = 15, color = "#0284c7" }) => (
  <svg {...base(size, color)}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
  </svg>
);

export const IconFunction: React.FC<IconProps> = ({ size = 15, color = "#4f46e5" }) => (
  <svg {...base(size, color)}>
    <path d="M3 19c4 0 5-14 9-14s5 14 9 14" />
    <path d="M3 12h18" strokeOpacity="0.45" />
  </svg>
);

export const IconChart: React.FC<IconProps> = ({ size = 15, color = "#059669" }) => (
  <svg {...base(size, color)}>
    <path d="M3 3v18h18" />
    <path d="M18 17V9M13 17V5M8 17v-3" />
  </svg>
);

export const IconRealWorld: React.FC<IconProps> = ({ size = 15, color = "#d97706" }) => (
  <svg {...base(size, color)}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <circle cx="8.5" cy="9.5" r="1.5" />
    <path d="m21 15-4.5-4.5L7 20" />
  </svg>
);

export const IconPhysics: React.FC<IconProps> = ({ size = 15, color = "#7c3aed" }) => (
  <svg {...base(size, color)}>
    <circle cx="12" cy="12" r="1.5" fill={color} />
    <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-30 12 12)" />
    <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(90 12 12)" />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size = 14, color }) => (
  <svg {...base(size, color)}>
    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
  </svg>
);

export const IconUndo: React.FC<IconProps> = ({ size = 14, color }) => (
  <svg {...base(size, color)}>
    <path d="M9 14 4 9l5-5" />
    <path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H11" />
  </svg>
);

export const IconRedo: React.FC<IconProps> = ({ size = 14, color }) => (
  <svg {...base(size, color)}>
    <path d="m15 14 5-5-5-5" />
    <path d="M20 9H9.5A5.5 5.5 0 0 0 4 14.5 5.5 5.5 0 0 0 9.5 20H13" />
  </svg>
);

export const IconSave: React.FC<IconProps> = ({ size = 14, color }) => (
  <svg {...base(size, color)}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <path d="M17 21v-8H7v8M7 3v5h8" />
  </svg>
);

export const IconOpenFile: React.FC<IconProps> = ({ size = 14, color }) => (
  <svg {...base(size, color)}>
    <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
  </svg>
);

export const IconCommand: React.FC<IconProps> = ({ size = 14, color }) => (
  <svg {...base(size, color)}>
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
  </svg>
);

export const IconFullscreen: React.FC<IconProps & { exit?: boolean }> = ({ size = 14, color, exit }) => (
  <svg {...base(size, color)}>
    {exit ? (
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    ) : (
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    )}
  </svg>
);

export const IconMore: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <circle cx="5" cy="12" r="1.5" fill={color || "currentColor"} />
    <circle cx="12" cy="12" r="1.5" fill={color || "currentColor"} />
    <circle cx="19" cy="12" r="1.5" fill={color || "currentColor"} />
  </svg>
);

export const IconStylusOnly: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M12 2v20" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const IconHandTouch: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M18 11V6a2 2 0 0 0-4 0v5" />
    <path d="M14 10V4a2 2 0 0 0-4 0v7" />
    <path d="M10 10.5V6a2 2 0 0 0-4 0v8" />
    <path d="M18 8a2 2 0 0 1 4 2v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 13" />
  </svg>
);

export const IconRuler: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M3 7l4-4 14 14-4 4L3 7z" />
    <path d="M6 10l2-2M9 13l3-3M12 16l2-2M15 19l3-3" />
  </svg>
);

export const IconSetSquare: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M4 20h16L4 4v16z" />
    <path d="M7 17h6L7 11v6z" />
  </svg>
);

export const IconProtractor: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M3 15h18a9 9 0 0 0-18 0z" />
    <path d="M12 15v-3M7 15v-1.5M17 15v-1.5" />
  </svg>
);

export const IconCompassTool: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7l-5 14M12 7l5 14M9 14h6" />
  </svg>
);

export const IconCalculator: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <rect x="4" y="2" width="16" height="20" rx="3" />
    <line x1="8" y1="6" x2="16" y2="6" strokeWidth="2" />
    <line x1="16" y1="11" x2="16" y2="11.01" strokeWidth="2.5" />
    <line x1="12" y1="11" x2="12" y2="11.01" strokeWidth="2.5" />
    <line x1="8" y1="11" x2="8" y2="11.01" strokeWidth="2.5" />
    <line x1="16" y1="15" x2="16" y2="15.01" strokeWidth="2.5" />
    <line x1="12" y1="15" x2="12" y2="15.01" strokeWidth="2.5" />
    <line x1="8" y1="15" x2="8" y2="15.01" strokeWidth="2.5" />
    <line x1="16" y1="19" x2="16" y2="19.01" strokeWidth="2.5" />
    <line x1="12" y1="19" x2="12" y2="19.01" strokeWidth="2.5" />
    <line x1="8" y1="19" x2="8" y2="19.01" strokeWidth="2.5" />
  </svg>
);

export const IconPdf: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 13v4M9 15h2a1 1 0 0 0 1-1v0a1 1 0 0 0-1-1H9" />
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

export const IconHtmlSim: React.FC<IconProps> = ({ size = 15, color }) => (
  <svg {...base(size, color)}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
    <line x1="14" y1="4" x2="10" y2="20" />
  </svg>
);
