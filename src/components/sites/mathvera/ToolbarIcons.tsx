"use client";

import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  className?: string;
}

/**
 * Anime Cel-Shaded Duotone SVG Icon System for PhysBoard.
 * Signature visual traits:
 * - Soft rounded strokes with rich deep-indigo/category ink outlines
 * - Vibrant Japanese pastel fills (Sakura, Sky, Lavender, Mint, Gold, Coral)
 * - Crisp white specular gloss dots & 4-point kawaii sparkle accents (✦)
 */
const base = (size: number, color = "#312e81", className?: string): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className,
  "aria-hidden": true,
});

export const IconGrip: React.FC<IconProps> = ({ size = 14, color = "#94a3b8", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="8.5" cy="6" r="1.5" fill={color} stroke="none" />
    <circle cx="15.5" cy="6" r="1.5" fill={color} stroke="none" />
    <circle cx="8.5" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="15.5" cy="12" r="1.5" fill={color} stroke="none" />
    <circle cx="8.5" cy="18" r="1.5" fill={color} stroke="none" />
    <circle cx="15.5" cy="18" r="1.5" fill={color} stroke="none" />
  </svg>
);

export const IconCursor: React.FC<IconProps> = ({ size = 16, color = "#312e81", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M4.5 3.5l14 6.5-6.2 2.1-2.1 6.4-5.7-15z" fill="#c7d2fe" stroke="#3730a3" strokeWidth={1.75} />
    <path d="M6.6 5.8l4.1 1.9" stroke="#ffffff" strokeWidth={1.3} opacity={0.9} />
    <path d="M12.2 12.2l4.8 4.8" stroke="#6366f1" strokeWidth={2} />
    <path d="M19.5 16.5c-.9 0-1.6-.7-1.6-1.6 0 .9-.7 1.6-1.6 1.6.9 0 1.6.7 1.6 1.6 0-.9.7-1.6 1.6-1.6z" fill="#f472b6" stroke="none" />
  </svg>
);

export const IconMarquee: React.FC<IconProps> = ({ size = 16, color = "#4338ca", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="4" y="4" width="16" height="16" rx="4" fill="#e0e7ff" stroke="none" />
    <rect x="4" y="4" width="16" height="16" rx="4" stroke="#4f46e5" strokeDasharray="3.2 2.4" strokeWidth={1.7} />
    <circle cx="4.5" cy="4.5" r="1.7" fill="#f472b6" stroke="#ffffff" strokeWidth={0.8} />
    <circle cx="19.5" cy="4.5" r="1.7" fill="#38bdf8" stroke="#ffffff" strokeWidth={0.8} />
    <circle cx="4.5" cy="19.5" r="1.7" fill="#34d399" stroke="#ffffff" strokeWidth={0.8} />
    <circle cx="19.5" cy="19.5" r="1.7" fill="#fbbf24" stroke="#ffffff" strokeWidth={0.8} />
  </svg>
);

export const IconPen: React.FC<IconProps> = ({ size = 16, color = "#3730a3", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M17.2 3.3a2.4 2.4 0 0 1 3.5 3.5L8.2 19.3l-5.2 1.4 1.4-5.2L17.2 3.3z" fill="#bae6fd" stroke="#0369a1" strokeWidth={1.7} />
    <path d="M15.2 5.3l3.5 3.5 2-2a2.4 2.4 0 0 0-3.5-3.5l-2 2z" fill="#f472b6" stroke="#be185d" strokeWidth={1.5} />
    <path d="M6.8 14.5l6.8-6.8" stroke="#ffffff" strokeWidth={1.3} opacity={0.9} />
    <path d="M3 20.7l2.6-.7-1.9-1.9-.7 2.6z" fill="#0369a1" stroke="none" />
    <path d="M21.2 2.2c-.6 0-1.1-.5-1.1-1.1 0 .6-.5 1.1-1.1 1.1.6 0 1.1.5 1.1 1.1 0-.6.5-1.1 1.1-1.1z" fill="#fbbf24" stroke="none" />
  </svg>
);

export const IconFountain: React.FC<IconProps> = ({ size = 16, color = "#5b21b6", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M12 21l3.2-4.2 1.8-7.6a2 2 0 0 0-1-2.2L12 3.5 8 7a2 2 0 0 0-1 2.2l1.8 7.6L12 21z" fill="#ddd6fe" stroke="#5b21b6" strokeWidth={1.7} />
    <path d="M9.4 16h5.2l-2.6 4.5L9.4 16z" fill="#fde68a" stroke="#b45309" strokeWidth={1.3} />
    <line x1="12" y1="4.2" x2="12" y2="11" stroke="#5b21b6" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.5" fill="#ec4899" stroke="none" />
    <circle cx="11.4" cy="11.4" r="0.5" fill="#ffffff" stroke="none" />
  </svg>
);

export const IconPencil: React.FC<IconProps> = ({ size = 16, color = "#92400e", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M19.8 5.2l-1-1a2 2 0 0 0-2.8 0L4.8 15.4 3.5 20.5l5.1-1.3L19.8 8a2 2 0 0 0 0-2.8z" fill="#fde68a" stroke="#b45309" strokeWidth={1.7} />
    <path d="M14.5 5.5l4 4 1.3-1.3a2 2 0 0 0 0-2.8l-1-1a2 2 0 0 0-2.8 0l-1.5 1.1z" fill="#fda4af" stroke="#be123c" strokeWidth={1.4} />
    <path d="M4.8 15.4l3.8 3.8-5.1 1.3 1.3-5.1z" fill="#fef3c7" stroke="#b45309" strokeWidth={1.3} />
    <path d="M3.5 20.5l2-.5-1.5-1.5-.5 2z" fill="#1e293b" stroke="none" />
  </svg>
);

export const IconHighlighter: React.FC<IconProps> = ({ size = 16, color = "#a16207", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="m14.5 4.2 4.3 4.3-7.6 7.6a1.5 1.5 0 0 1-1.1.4H6.8l-2.8 2.8v-2.6l1.8-2.3v-3.2c0-.4.1-.8.4-1.1l8.3-5.9z" fill="#fef08a" stroke="#ca8a04" strokeWidth={1.7} />
    <path d="M12.2 6.4l4.4 4.4" stroke="#eab308" strokeWidth={1.8} />
    <line x1="3" y1="20.8" x2="17" y2="20.8" stroke="#facc15" strokeWidth={3.2} strokeLinecap="round" />
    <path d="M8.2 12.2l4.2-4.2" stroke="#ffffff" strokeWidth={1.2} opacity={0.9} />
  </svg>
);

export const IconBrush: React.FC<IconProps> = ({ size = 16, color = "#9d174d", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M10.2 11.4 18 3.6a2.4 2.4 0 0 1 3.4 3.4l-7.8 7.8" fill="#fbcfe8" stroke="#be185d" strokeWidth={1.7} />
    <path d="M10.2 11.4c-1.8 1-3.7 2.5-3.7 4.9 0 2.1 1.7 3.8 3.8 3.8 2.1 0 3.8-1.7 3.8-3.8 0-1.4-.6-2.8-1.4-4.1" fill="#f472b6" stroke="#9d174d" strokeWidth={1.7} />
    <circle cx="9.2" cy="15.8" r="1" fill="#ffffff" stroke="none" opacity={0.85} />
    <circle cx="4.2" cy="19.2" r="1.4" fill="#38bdf8" stroke="none" />
  </svg>
);

export const IconLaser: React.FC<IconProps> = ({ size = 16, color = "#dc2626", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M4 19l4-4 3 3-4 4H4v-3z" fill="#fca5a5" stroke="#dc2626" strokeWidth={1.6} />
    <path d="M7 16l8-8 3 3-8 8" fill="#fee2e2" stroke="#dc2626" strokeWidth={1.7} />
    <line x1="16.5" y1="7.5" x2="21" y2="3" stroke="#ef4444" strokeWidth={2.4} strokeLinecap="round" />
    <path d="M21.2 2.4c-.9 0-1.6-.7-1.6-1.6 0 .9-.7 1.6-1.6 1.6.9 0 1.6.7 1.6 1.6 0-.9.7-1.6 1.6-1.6z" fill="#facc15" stroke="#ef4444" strokeWidth={0.6} />
    <circle cx="20.2" cy="2.6" r="1" fill="#ffffff" stroke="none" />
  </svg>
);

export const IconShapeSnap: React.FC<IconProps> = ({ size = 16, color = "#6d28d9", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="3.5" y="4" width="7" height="7" rx="2" fill="#ddd6fe" stroke="#6d28d9" strokeWidth={1.65} />
    <circle cx="16.5" cy="16" r="4.3" fill="#bae6fd" stroke="#0284c7" strokeWidth={1.65} />
    <circle cx="15.2" cy="14.6" r="0.9" fill="#ffffff" stroke="none" />
    <path d="M10.8 7.5c2.6 0 3.7 1.8 4.2 3.8" stroke="#a855f7" strokeDasharray="2 1.5" strokeWidth={1.5} />
    <path d="M18.5 5.5c-1 0-1.8-.8-1.8-1.8 0 1-.8 1.8-1.8 1.8 1 0 1.8.8 1.8 1.8 0-1 .8-1.8 1.8-1.8z" fill="#fbbf24" stroke="none" />
  </svg>
);

export const IconDashedPen: React.FC<IconProps> = ({ size = 16, color = "#0369a1", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M3 18.2c2-3.5 5.5-3.5 8 0s5.5 3.5 9-1" stroke="#0ea5e9" strokeDasharray="2.6 2.4" strokeWidth={2.1} />
    <path d="M15.2 3.5l4.2 4.2-6 6-3.7.6.6-3.7 4.9-7.1z" fill="#bae6fd" stroke="#0369a1" strokeWidth={1.6} />
    <path d="m14 5.2 3.8 3.8" stroke="#f472b6" strokeWidth={1.6} />
  </svg>
);

export const IconEraser: React.FC<IconProps> = ({ size = 16, color = "#be185d", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="m7 20-4-4a2.2 2.2 0 0 1 0-3.1L12.5 3.4a2.2 2.2 0 0 1 3.1 0l4.6 4.6a2.2 2.2 0 0 1 0 3.1L11.8 19.5a2 2 0 0 1-1.4.6H7z" fill="#fbcfe8" stroke="#be185d" strokeWidth={1.7} />
    <path d="m9.5 6.8 7.6 7.6-4.8 4.8a2 2 0 0 1-1.4.6H7l-4-4a2.2 2.2 0 0 1 0-3.1l6.5-5.9z" fill="#e0f2fe" stroke="#0369a1" strokeWidth={1.6} />
    <line x1="3" y1="21" x2="14" y2="21" stroke="#be185d" strokeWidth={1.7} />
    <circle cx="18.2" cy="18.2" r="1.1" fill="#f472b6" stroke="none" />
    <circle cx="21" cy="16.2" r="0.8" fill="#38bdf8" stroke="none" />
  </svg>
);

export const IconFormula: React.FC<IconProps> = ({ size = 16, color = "#4338ca", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="2.5" y="3" width="19" height="18" rx="4.5" fill="#eef2ff" stroke="#6366f1" strokeWidth={1.6} />
    <path d="M8.5 18c1.5 0 2.5-1.3 3-3.5l1.4-6.2c.4-1.8 1.4-2.8 2.8-2.8" stroke="#3730a3" strokeWidth={2} />
    <path d="M7.5 11.5h7.5" stroke="#ec4899" strokeWidth={2} />
    <circle cx="17.8" cy="7.5" r="1.4" fill="#fbbf24" stroke="none" />
  </svg>
);

export const IconInsert: React.FC<IconProps> = ({ size = 16, color = "#0f766e", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="#ccfbf1" stroke="#0d9488" strokeWidth={1.7} />
    <path d="M12 7.5v9M7.5 12h9" stroke="#0f766e" strokeWidth={2.2} />
    <path d="M19 4.2c-.6 0-1.1-.5-1.1-1.1 0 .6-.5 1.1-1.1 1.1.6 0 1.1.5 1.1 1.1 0-.6.5-1.1 1.1-1.1z" fill="#fbbf24" stroke="none" />
  </svg>
);

export const IconPoint: React.FC<IconProps> = ({ size = 15, color = "#db2777", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="12" cy="12" r="7.8" fill="#fce7f3" stroke="#f472b6" strokeDasharray="3 2" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="3.8" fill="#ec4899" stroke="#9d174d" strokeWidth={1.5} />
    <circle cx="10.7" cy="10.7" r="1.1" fill="#ffffff" stroke="none" />
  </svg>
);

export const IconSegment: React.FC<IconProps> = ({ size = 16, color = "#1d4ed8", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <line x1="6" y1="18" x2="18" y2="6" stroke="#2563eb" strokeWidth={2.2} />
    <circle cx="5.5" cy="18.5" r="3" fill="#60a5fa" stroke="#1e40af" strokeWidth={1.5} />
    <circle cx="4.7" cy="17.7" r="0.9" fill="#ffffff" stroke="none" />
    <circle cx="18.5" cy="5.5" r="3" fill="#f472b6" stroke="#9d174d" strokeWidth={1.5} />
    <circle cx="17.7" cy="4.7" r="0.9" fill="#ffffff" stroke="none" />
  </svg>
);

export const IconCircle: React.FC<IconProps> = ({ size = 15, color = "#0284c7", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="12" cy="12" r="8" fill="#e0f2fe" stroke="#0284c7" strokeWidth={1.8} />
    <path d="M7.5 8.5a6 6 0 0 1 5-2.5" stroke="#ffffff" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="1.7" fill="#f472b6" stroke="none" />
    <path d="M19 5.5c-.7 0-1.2-.5-1.2-1.2 0 .7-.5 1.2-1.2 1.2.7 0 1.2.5 1.2 1.2 0-.7.5-1.2 1.2-1.2z" fill="#fbbf24" stroke="none" />
  </svg>
);

export const IconPolygon: React.FC<IconProps> = ({ size = 16, color = "#7c3aed", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <polygon points="12 3.5 20.5 9.5 17.5 19.5 6.5 19.5 3.5 9.5" fill="#ede9fe" stroke="#7c3aed" strokeWidth={1.75} />
    <line x1="12" y1="3.5" x2="12" y2="12" stroke="#a78bfa" strokeWidth={1.3} />
    <line x1="3.5" y1="9.5" x2="12" y2="12" stroke="#a78bfa" strokeWidth={1.3} />
    <line x1="20.5" y1="9.5" x2="12" y2="12" stroke="#a78bfa" strokeWidth={1.3} />
    <circle cx="12" cy="12" r="1.8" fill="#f472b6" stroke="#ffffff" strokeWidth={0.7} />
  </svg>
);

export const IconTriangle2D: React.FC<IconProps> = ({ size = 16, color = "#0d9488", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M4.5 19.5h15L4.5 4.5v15z" fill="#ccfbf1" stroke="#0f766e" strokeWidth={1.8} />
    <path d="M4.5 15.2h4.3v4.3" fill="#fde68a" stroke="#d97706" strokeWidth={1.5} />
    <circle cx="4.5" cy="4.5" r="1.5" fill="#f472b6" stroke="none" />
  </svg>
);

export const IconBucket: React.FC<IconProps> = ({ size = 16, color = "#0284c7", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="m18.5 11-7-7a1.5 1.5 0 0 0-2.1 0L4 9.4a2 2 0 0 0 0 2.8l4.8 4.8a2 2 0 0 0 2.8 0L18.5 11Z" fill="#fbcfe8" stroke="#be185d" strokeWidth={1.7} />
    <path d="m5 2.8 5 5" stroke="#be185d" strokeWidth={1.7} />
    <path d="M21.5 18.5a2.2 2.2 0 1 1-4.4 0c0-1.6 2.2-4 2.2-4s2.2 2.4 2.2 4Z" fill="#38bdf8" stroke="#0369a1" strokeWidth={1.4} />
    <circle cx="18.7" cy="18" r="0.7" fill="#ffffff" stroke="none" />
  </svg>
);

export const IconCube3D: React.FC<IconProps> = ({ size = 16, color = "#0284c7", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M12 2.5 20 7l-8 4.5L4 7l8-4.5z" fill="#bae6fd" stroke="none" />
    <path d="M4 7v9.5l8 4.5v-9.5L4 7z" fill="#e0f2fe" stroke="none" />
    <path d="M20 7v9.5l-8 4.5v-9.5l8-4.5z" fill="#7dd3fc" stroke="none" />
    <path d="M20.2 7.2a1.7 1.7 0 0 0-.8-1.5l-6.6-3.7a1.7 1.7 0 0 0-1.6 0L4.6 5.7a1.7 1.7 0 0 0-.8 1.5v9.6a1.7 1.7 0 0 0 .8 1.5l6.6 3.7a1.7 1.7 0 0 0 1.6 0l6.6-3.7a1.7 1.7 0 0 0 .8-1.5V7.2z" stroke="#0369a1" strokeWidth={1.7} />
    <path d="m4 7 8 4.5L20 7M12 21.5v-10" stroke="#0369a1" strokeWidth={1.6} />
    <circle cx="12" cy="11.5" r="1.4" fill="#fbbf24" stroke="#ffffff" strokeWidth={0.6} />
  </svg>
);

export const IconFunction: React.FC<IconProps> = ({ size = 16, color = "#4f46e5", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M3 12.5h18M12 3v18" stroke="#a5b4fc" strokeWidth={1.4} />
    <path d="M3.5 17.5c3.5 0 4.5-12 8.5-12s5 12 8.5 12" stroke="#4f46e5" strokeWidth={2.2} />
    <circle cx="12" cy="5.5" r="2" fill="#f472b6" stroke="#ffffff" strokeWidth={0.8} />
    <circle cx="20" cy="17.2" r="1.4" fill="#38bdf8" stroke="none" />
  </svg>
);

export const IconChart: React.FC<IconProps> = ({ size = 16, color = "#059669", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M3.5 3.5v16a1 1 0 0 0 1 1h16" stroke="#0f766e" strokeWidth={1.8} />
    <rect x="6.8" y="13" width="3.2" height="7" rx="1.4" fill="#fbcfe8" stroke="#db2777" strokeWidth={1.4} />
    <rect x="11.8" y="8.5" width="3.2" height="11.5" rx="1.4" fill="#fde68a" stroke="#d97706" strokeWidth={1.4} />
    <rect x="16.8" y="5" width="3.2" height="15" rx="1.4" fill="#a7f3d0" stroke="#059669" strokeWidth={1.4} />
    <path d="M20 2.5c-.6 0-1-.4-1-1 0 .6-.4 1-1 1 .6 0 1 .4 1 1 0-.6.4-1 1-1z" fill="#fbbf24" stroke="none" />
  </svg>
);

export const IconRealWorld: React.FC<IconProps> = ({ size = 16, color = "#d97706", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="3" y="4" width="18" height="16" rx="3.5" fill="#fef3c7" stroke="#d97706" strokeWidth={1.7} />
    <circle cx="8.2" cy="8.8" r="2.2" fill="#fbbf24" stroke="#d97706" strokeWidth={1.2} />
    <path d="M3.5 17.5l4.8-4.8 3 3 4.2-4.2 5 5V18a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2v-.5z" fill="#86efac" stroke="#15803d" strokeWidth={1.5} />
  </svg>
);

export const IconPhysics: React.FC<IconProps> = ({ size = 16, color = "#7c3aed", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <ellipse cx="12" cy="12" rx="9.2" ry="3.8" transform="rotate(32 12 12)" fill="#ede9fe" fillOpacity={0.5} stroke="#7c3aed" strokeWidth={1.5} />
    <ellipse cx="12" cy="12" rx="9.2" ry="3.8" transform="rotate(-32 12 12)" stroke="#38bdf8" strokeWidth={1.5} />
    <circle cx="12" cy="12" r="2.8" fill="#a855f7" stroke="#5b21b6" strokeWidth={1.3} />
    <circle cx="11.1" cy="11.1" r="0.85" fill="#ffffff" stroke="none" />
    <circle cx="19.5" cy="7.8" r="1.5" fill="#f472b6" stroke="#ffffff" strokeWidth={0.5} />
    <circle cx="4.5" cy="16.2" r="1.5" fill="#fbbf24" stroke="#ffffff" strokeWidth={0.5} />
  </svg>
);

/** New Anime Icon for Math Formulas Drawer (Toán) */
export const IconMath: React.FC<IconProps> = ({ size = 16, color = "#2563eb", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="3" y="3" width="18" height="18" rx="4.5" fill="#dbeafe" stroke="#2563eb" strokeWidth={1.65} />
    <path d="M16 7H8.5l4.5 5-4.5 5H16" stroke="#1e40af" strokeWidth={2.1} />
    <path d="M19.5 4.5c-.6 0-1.1-.5-1.1-1.1 0 .6-.5 1.1-1.1 1.1.6 0 1.1.5 1.1 1.1 0-.6.5-1.1 1.1-1.1z" fill="#f472b6" stroke="none" />
  </svg>
);

/** New Anime Icon for Chemistry Formulas & Periodic Table Drawer (Hoá) */
export const IconChemistry: React.FC<IconProps> = ({ size = 16, color = "#059669", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M9.5 3.5h5M10.5 3.5v5.2L5.2 17.5a2 2 0 0 0 1.7 3h10.2a2 2 0 0 0 1.7-3L13.5 8.7V3.5" fill="#ecfdf5" stroke="#047857" strokeWidth={1.7} />
    <path d="M7.2 14.5h9.6l2 3.2a1.8 1.8 0 0 1-1.5 2.8H6.7a1.8 1.8 0 0 1-1.5-2.8l2-3.2z" fill="#34d399" stroke="none" />
    <circle cx="10.5" cy="17.2" r="1.1" fill="#ffffff" stroke="none" />
    <circle cx="14" cy="15.8" r="0.8" fill="#fde68a" stroke="none" />
    <circle cx="12.5" cy="11.2" r="1" fill="#38bdf8" stroke="none" />
  </svg>
);

/** New Anime Icon for Fullscreen PhET / HTML Simulation Launcher (Thí nghiệm) */
export const IconSimLab: React.FC<IconProps> = ({ size = 16, color = "#0d9488", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="2.8" y="4" width="18.4" height="14" rx="3.5" fill="#e0f2fe" stroke="#0284c7" strokeWidth={1.7} />
    <path d="M9.8 8.2l5.2 2.8-5.2 2.8V8.2z" fill="#f472b6" stroke="#be185d" strokeWidth={1.4} />
    <path d="M8.5 20.5h7" stroke="#0284c7" strokeWidth={1.8} />
    <path d="M19.8 3.2c-.7 0-1.3-.6-1.3-1.3 0 .7-.6 1.3-1.3 1.3.7 0 1.3.6 1.3 1.3 0-.7.6-1.3 1.3-1.3z" fill="#fbbf24" stroke="none" />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size = 15, color = "#dc2626", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M4.5 6.5h15M9 6.5V4.2a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.3" stroke="#dc2626" strokeWidth={1.7} />
    <path d="M5.8 6.5l1.1 12.8a2 2 0 0 0 2 1.8h6.2a2 2 0 0 0 2-1.8l1.1-12.8" fill="#fecaca" stroke="#dc2626" strokeWidth={1.7} />
    <line x1="10" y1="10.5" x2="10" y2="16.5" stroke="#ef4444" strokeWidth={1.6} />
    <line x1="14" y1="10.5" x2="14" y2="16.5" stroke="#ef4444" strokeWidth={1.6} />
  </svg>
);

export const IconUndo: React.FC<IconProps> = ({ size = 15, color = "#475569", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M8.5 13.5 3.5 8.5l5-5" stroke="#3b82f6" strokeWidth={2.1} />
    <path d="M3.5 8.5h11a5.5 5.5 0 0 1 5.5 5.5 5.5 5.5 0 0 1-5.5 5.5H10" stroke="#6366f1" strokeWidth={2.1} />
  </svg>
);

export const IconRedo: React.FC<IconProps> = ({ size = 15, color = "#475569", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="m15.5 13.5 5-5-5-5" stroke="#3b82f6" strokeWidth={2.1} />
    <path d="M20.5 8.5h-11A5.5 5.5 0 0 0 4 14a5.5 5.5 0 0 0 5.5 5.5H14" stroke="#6366f1" strokeWidth={2.1} />
  </svg>
);

export const IconSave: React.FC<IconProps> = ({ size = 15, color = "#2563eb", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" fill="#dbeafe" stroke="#2563eb" strokeWidth={1.7} />
    <path d="M7 3v5h9V3" fill="#ffffff" stroke="#2563eb" strokeWidth={1.5} />
    <rect x="7" y="13" width="10" height="8" rx="1.5" fill="#93c5fd" stroke="#1d4ed8" strokeWidth={1.5} />
  </svg>
);

export const IconOpenFile: React.FC<IconProps> = ({ size = 15, color = "#d97706", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M3.5 19h17a1.5 1.5 0 0 0 1.5-1.5V8a1.5 1.5 0 0 0-1.5-1.5h-7.8a1.5 1.5 0 0 1-1.2-.6l-.9-1.3a1.5 1.5 0 0 0-1.2-.6H3.5A1.5 1.5 0 0 0 2 5.5v12A1.5 1.5 0 0 0 3.5 19z" fill="#fde68a" stroke="#d97706" strokeWidth={1.7} />
    <path d="M7 11.5h10M7 14.5h6" stroke="#b45309" strokeWidth={1.5} />
  </svg>
);

export const IconCommand: React.FC<IconProps> = ({ size = 15, color = "#6d28d9", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" fill="#ede9fe" stroke="#6d28d9" strokeWidth={1.7} />
    <circle cx="12" cy="12" r="1.4" fill="#f472b6" stroke="none" />
  </svg>
);

export const IconFullscreen: React.FC<IconProps & { exit?: boolean }> = ({ size = 15, color = "#4338ca", exit, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    {exit ? (
      <>
        <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M15 21v-4a2 2 0 0 1 2-2h4M3 15h4a2 2 0 0 1 2 2v4" stroke="#4f46e5" strokeWidth={2} />
        <circle cx="12" cy="12" r="1.5" fill="#f472b6" stroke="none" />
      </>
    ) : (
      <>
        <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" stroke="#4f46e5" strokeWidth={2} />
        <circle cx="12" cy="12" r="1.5" fill="#38bdf8" stroke="none" />
      </>
    )}
  </svg>
);

export const IconMore: React.FC<IconProps> = ({ size = 15, color = "#4f46e5", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="5" cy="12" r="2.2" fill="#f472b6" stroke="none" />
    <circle cx="12" cy="12" r="2.2" fill="#818cf8" stroke="none" />
    <circle cx="19" cy="12" r="2.2" fill="#38bdf8" stroke="none" />
  </svg>
);

export const IconStylusOnly: React.FC<IconProps> = ({ size = 16, color = "#0369a1", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M17.5 4a2 2 0 0 0-2.8 0L6 12.7 4 19l6.3-2 8.7-8.7a2 2 0 0 0 0-2.8l-1.5-1.5z" fill="#bae6fd" stroke="#0369a1" strokeWidth={1.7} />
    <path d="m13 8.5 2.5 2.5" stroke="#0369a1" strokeWidth={1.5} />
    <path d="M21 14.5l-3 4h2.5l-1.5 3" stroke="#f59e0b" strokeWidth={1.8} />
  </svg>
);

export const IconHandTouch: React.FC<IconProps> = ({ size = 16, color = "#db2777", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="11" cy="4.2" r="2.6" stroke="#f472b6" strokeDasharray="2 2" strokeWidth={1.3} />
    <path d="M11 6.5V3.8a1.8 1.8 0 0 0-3.6 0v7.2M7.4 8.5a1.8 1.8 0 0 0-3.4.6v3.9a7.5 7.5 0 0 0 7.5 7.5h2.5a6.5 6.5 0 0 0 6.5-6.5v-3.5a1.8 1.8 0 0 0-3.6 0V11M14 9.5a1.8 1.8 0 0 0-3 0" fill="#fce7f3" stroke="#be185d" strokeWidth={1.65} />
  </svg>
);

export const IconRuler: React.FC<IconProps> = ({ size = 16, color = "#b45309", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M3.5 7.5l4-4a2 2 0 0 1 2.8 0l10.2 10.2a2 2 0 0 1 0 2.8l-4 4a2 2 0 0 1-2.8 0L3.5 10.3a2 2 0 0 1 0-2.8z" fill="#fde68a" stroke="#b45309" strokeWidth={1.7} />
    <path d="m6.5 10.5 2-2M9 13l3.2-3.2M12 16l2-2M14.5 18.5 18 15" stroke="#d97706" strokeWidth={1.5} />
    <circle cx="6.2" cy="6.2" r="1.2" fill="#f472b6" stroke="none" />
  </svg>
);

export const IconSetSquare: React.FC<IconProps> = ({ size = 16, color = "#0369a1", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M4.5 20h15a1 1 0 0 0 .8-1.6L5.8 4.2A1 1 0 0 0 4.5 5v14a1 1 0 0 0 1 1z" fill="#bae6fd" stroke="#0369a1" strokeWidth={1.7} />
    <path d="M7.5 17h6.5L7.5 10.5v6.5z" fill="#ffffff" stroke="#0284c7" strokeWidth={1.4} />
  </svg>
);

export const IconProtractor: React.FC<IconProps> = ({ size = 16, color = "#6d28d9", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M3.5 16h17a8.5 8.5 0 0 0-17 0z" fill="#ddd6fe" stroke="#6d28d9" strokeWidth={1.7} />
    <line x1="12" y1="16" x2="12" y2="11" stroke="#7c3aed" strokeWidth={1.5} />
    <circle cx="12" cy="16" r="1.5" fill="#f472b6" stroke="none" />
  </svg>
);

export const IconCompassTool: React.FC<IconProps> = ({ size = 16, color = "#0f766e", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="12" cy="4.5" r="2.3" fill="#fde68a" stroke="#b45309" strokeWidth={1.6} />
    <path d="M11 6.5 6 20.5M13 6.5 18 20.5" stroke="#0f766e" strokeWidth={1.9} />
    <path d="M8.5 14a5.5 5.5 0 0 1 7 0" stroke="#14b8a6" strokeWidth={1.5} />
  </svg>
);

export const IconCalculator: React.FC<IconProps> = ({ size = 16, color = "#334155", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="4" y="2.5" width="16" height="19" rx="3.5" fill="#e2e8f0" stroke="#334155" strokeWidth={1.7} />
    <rect x="6.5" y="5" width="11" height="4.2" rx="1.4" fill="#bbf7d0" stroke="#15803d" strokeWidth={1.3} />
    <circle cx="8" cy="12.2" r="1.2" fill="#475569" stroke="none" />
    <circle cx="12" cy="12.2" r="1.2" fill="#475569" stroke="none" />
    <circle cx="16" cy="12.2" r="1.2" fill="#3b82f6" stroke="none" />
    <circle cx="8" cy="15.6" r="1.2" fill="#475569" stroke="none" />
    <circle cx="12" cy="15.6" r="1.2" fill="#475569" stroke="none" />
    <circle cx="16" cy="15.6" r="1.2" fill="#f472b6" stroke="none" />
    <rect x="11" y="18" width="6.2" height="2" rx="1" fill="#2563eb" stroke="none" />
    <circle cx="8" cy="19" r="1.1" fill="#475569" stroke="none" />
  </svg>
);

export const IconPdf: React.FC<IconProps> = ({ size = 16, color = "#e11d48", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8l-5.5-5.5z" fill="#ffe4e6" stroke="#e11d48" strokeWidth={1.7} />
    <path d="M14 2.5V8h5.5" fill="#fda4af" stroke="#e11d48" strokeWidth={1.6} />
    <path d="M8 12.5v5M8 14.5h2.5a1.2 1.2 0 0 0 0-2.4H8" stroke="#be123c" strokeWidth={1.8} />
    <circle cx="14.5" cy="14.5" r="1.5" fill="#fb7185" stroke="none" />
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ size = 16, color = "#4f46e5", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" fill="#e0e7ff" stroke="#4f46e5" strokeWidth={1.65} />
    <circle cx="12" cy="12" r="2.8" fill="#fde68a" stroke="#d97706" strokeWidth={1.5} />
  </svg>
);
