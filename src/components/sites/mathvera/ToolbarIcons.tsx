"use client";

import React from "react";

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  className?: string;
}

const base = (size: number, color = "currentColor", className?: string): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: color,
  strokeWidth: 1.85,
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

export const IconCursor: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M4.5 3.5l14 6.5-6.5 2-2 6.5-5.5-15z"
      fill="currentColor"
      fillOpacity={0.18}
    />
    <path d="M10 12l5 5" strokeWidth={1.8} />
    <path
      d="M19 16c-.8 0-1.4-.6-1.4-1.4 0 .8-.6 1.4-1.4 1.4.8 0 1.4.6 1.4 1.4 0-.8.6-1.4 1.4-1.4z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const IconMarquee: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" fill="currentColor" fillOpacity={0.08} stroke="none" />
    <rect x="4" y="4" width="16" height="16" rx="3.5" strokeDasharray="3.5 2.5" />
    <circle cx="4" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="20" cy="4" r="1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="20" r="1" fill="currentColor" stroke="none" />
    <circle cx="20" cy="20" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPen: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M17.5 3.5a2.5 2.5 0 0 1 3.5 3.5L8 20l-5.5 1.5L4 16 17.5 3.5z"
      fill="currentColor"
      fillOpacity={0.16}
    />
    <path d="m14 7 3.5 3.5" />
    <path d="m5.5 18.5 2.5-2.5" strokeWidth={1.5} />
    <path
      d="M21 2c-.5 0-1-.5-1-1 0 .5-.5 1-1 1 .5 0 1 .5 1 1 0-.5.5-1 1-1z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const IconFountain: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M12 21l3-4 2-8a2 2 0 0 0-1-2.2L12 3.5 8 6.8a2 2 0 0 0-1 2.2l2 8 3 4z"
      fill="currentColor"
      fillOpacity={0.16}
    />
    <line x1="12" y1="4" x2="12" y2="10.5" strokeWidth={1.6} />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <path d="M9 16h6" strokeWidth={1.5} />
  </svg>
);

export const IconPencil: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M20.5 5.5l-2-2a2 2 0 0 0-2.8 0L4.5 14.7a1.5 1.5 0 0 0-.4.7l-1 4.5a.6.6 0 0 0 .7.7l4.5-1c.3-.1.5-.2.7-.4L20.5 8.3a2 2 0 0 0 0-2.8z"
      fill="currentColor"
      fillOpacity={0.16}
    />
    <path d="m14 4.5 3.5 3.5" />
    <path d="m4.2 16.8 3 3" />
    <path d="m3.1 20.9 2.2-.5-1.7-1.7z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconHighlighter: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="m14.5 4.5 4 4-7.5 7.5a1.5 1.5 0 0 1-1.1.4H6.5l-3 3v-2.5l2-2.5v-3.4c0-.4.1-.8.4-1.1l8.6-8.4z"
      fill="currentColor"
      fillOpacity={0.18}
    />
    <path d="M12.5 6.5l4 4" strokeWidth={1.5} />
    <line x1="3" y1="21" x2="16" y2="21" strokeWidth={2.8} strokeOpacity={0.4} strokeLinecap="round" />
  </svg>
);

export const IconBrush: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M10 11.5 18 3.5a2.5 2.5 0 0 1 3.5 3.5l-8 8" />
    <path d="m12.5 9 2.5 2.5" strokeWidth={2} />
    <path
      d="M10 11.5c-1.5 1-3.5 2.5-3.5 5 0 2.2 1.8 4 4 4s4-1.8 4-4c0-1.5-.7-3-1.5-4.5"
      fill="currentColor"
      fillOpacity={0.2}
    />
    <circle cx="4" cy="19" r="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const IconLaser: React.FC<IconProps> = ({ size = 15, color = "#ef4444", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M4 19l4-4 3 3-4 4H4v-3z"
      fill={color}
      fillOpacity={0.25}
      stroke={color}
    />
    <path d="M7 16l8-8 3 3-8 8" stroke={color} />
    <path d="M13 10l3 3" stroke={color} strokeWidth={1.5} />
    <line x1="16.5" y1="7.5" x2="21" y2="3" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    <path
      d="M21 2c-.6 0-1.1-.5-1.1-1.1 0 .6-.5 1.1-1.1 1.1.6 0 1.1.5 1.1 1.1 0-.6.5-1.1 1.1-1.1z"
      fill={color}
      stroke="none"
    />
    <circle cx="21" cy="2" r="0.9" fill="#fff" stroke="none" />
  </svg>
);

export const IconShapeSnap: React.FC<IconProps> = ({ size = 15, color = "currentColor", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="3.5" y="4" width="6.5" height="6.5" rx="1.8" fill="currentColor" fillOpacity={0.16} />
    <circle cx="16.5" cy="16" r="4.2" fill="currentColor" fillOpacity={0.16} />
    <path d="M10 7.5c3 0 4 2 4.5 4" strokeDasharray="2 1.5" strokeWidth={1.5} />
    <path
      d="M17 5.5c-.8 0-1.5-.7-1.5-1.5 0 .8-.7 1.5-1.5 1.5.8 0 1.5.7 1.5 1.5 0-.8.7-1.5 1.5-1.5z"
      fill="currentColor"
      stroke="none"
    />
    <circle cx="12" cy="14" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const IconDashedPen: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M3 18c2-3.5 5.5-3.5 8 0s5.5 3.5 9-1"
      strokeDasharray="2.5 2.5"
      strokeWidth={2}
    />
    <path
      d="M15.5 3.5l4 4-6 6-3.5.5.5-3.5 5-7z"
      fill="currentColor"
      fillOpacity={0.16}
    />
    <path d="m14 5 4 4" strokeWidth={1.4} />
  </svg>
);

export const IconEraser: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="m6.8 20.2-3.8-3.8a2.2 2.2 0 0 1 0-3.1L12.5 3.8a2.2 2.2 0 0 1 3.1 0l4.6 4.6a2.2 2.2 0 0 1 0 3.1l-6.8 6.8c-.8.8-2 .9-2.9.2l-3.7 1.7z"
      fill="currentColor"
      fillOpacity={0.15}
    />
    <path d="m6.8 20.2-3.8-3.8a2.2 2.2 0 0 1 0-3.1L12.5 3.8a2.2 2.2 0 0 1 3.1 0l4.6 4.6a2.2 2.2 0 0 1 0 3.1L9.6 21.5H3" />
    <path d="m9.5 7 7.5 7.5" strokeWidth={1.8} />
    <circle cx="18" cy="18" r="0.9" fill="currentColor" stroke="none" />
    <circle cx="21" cy="16" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export const IconFormula: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M8.5 20c1.8 0 3-1.5 3.5-4l2-8.5C14.5 5 15.8 4 17.5 4"
      strokeWidth={2}
    />
    <path d="M7 11.5h9" strokeWidth={2} />
    <path
      d="M3 13.5l1.5-1.5 1.5 3 2-6"
      strokeOpacity={0.45}
      strokeWidth={1.4}
    />
    <circle cx="18" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconInsert: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4" fill="currentColor" fillOpacity={0.14} />
    <path d="M12 7.5v9M7.5 12h9" strokeWidth={2.1} />
    <path
      d="M18.5 4c-.4 0-.8-.4-.8-.8 0 .4-.4.8-.8.8.4 0 .8.4.8.8 0-.4.4-.8.8-.8z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const IconPoint: React.FC<IconProps> = ({ size = 14, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="12" cy="12" r="7.5" strokeDasharray="3 2" strokeOpacity={0.45} />
    <circle cx="12" cy="12" r="3.5" fill={color || "currentColor"} stroke="none" />
    <circle cx="10.8" cy="10.8" r="1.1" fill="#fff" stroke="none" />
  </svg>
);

export const IconSegment: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <line x1="6" y1="18" x2="18" y2="6" strokeWidth={2.1} />
    <circle cx="5.5" cy="18.5" r="2.8" fill={color || "currentColor"} stroke="none" />
    <circle cx="4.6" cy="17.6" r="0.9" fill="#fff" stroke="none" />
    <circle cx="18.5" cy="5.5" r="2.8" fill={color || "currentColor"} stroke="none" />
    <circle cx="17.6" cy="4.6" r="0.9" fill="#fff" stroke="none" />
  </svg>
);

export const IconCircle: React.FC<IconProps> = ({ size = 14, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity={0.14} />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <path
      d="M18.5 5.5c-.5 0-.9-.4-.9-.9 0 .5-.4.9-.9.9.5 0 .9.4.9.9 0-.5.4-.9.9-.9z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const IconPolygon: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <polygon
      points="12 3.5 20.5 9.5 17.5 19.5 6.5 19.5 3.5 9.5"
      fill="currentColor"
      fillOpacity={0.15}
    />
    <polygon points="12 3.5 20.5 9.5 17.5 19.5 6.5 19.5 3.5 9.5" />
    <line x1="12" y1="3.5" x2="12" y2="12" strokeOpacity={0.4} />
    <line x1="3.5" y1="9.5" x2="12" y2="12" strokeOpacity={0.4} />
    <line x1="20.5" y1="9.5" x2="12" y2="12" strokeOpacity={0.4} />
    <line x1="6.5" y1="19.5" x2="12" y2="12" strokeOpacity={0.4} />
    <line x1="17.5" y1="19.5" x2="12" y2="12" strokeOpacity={0.4} />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconTriangle2D: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M4.5 19.5h15L4.5 4.5v15z"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <path d="M4.5 15.5h4v4" strokeWidth={1.5} />
  </svg>
);

export const IconBucket: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="m19 11-7.5-7.5a1.5 1.5 0 0 0-2.1 0L3.8 9.1a2 2 0 0 0 0 2.8l5.2 5.2a2 2 0 0 0 2.8 0L19 11Z"
      fill="currentColor"
      fillOpacity={0.15}
    />
    <path d="m5 2.5 5 5" strokeWidth={1.7} />
    <path d="M3 13.5c4-2 7 0 14-2.5" strokeOpacity={0.4} strokeWidth={1.4} />
    <path
      d="M21.5 18.5a2 2 0 1 1-4 0c0-1.5 2-3.8 2-3.8s2 2.3 2 3.8Z"
      fill="#38bdf8"
      stroke="#0284c7"
      strokeWidth={1.4}
    />
    <circle cx="19" cy="18" r="0.6" fill="#fff" stroke="none" />
  </svg>
);

export const IconCube3D: React.FC<IconProps> = ({ size = 15, color = "#0284c7", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M12 2.5 20 7v5l-8-4.5-8 4.5V7l8-4.5z"
      fill={color}
      fillOpacity={0.22}
      stroke="none"
    />
    <path d="M20.5 7.2a1.8 1.8 0 0 0-.9-1.6l-7-3.9a1.8 1.8 0 0 0-1.8 0l-7 3.9a1.8 1.8 0 0 0-.9 1.6v9.6a1.8 1.8 0 0 0 .9 1.6l7 3.9a1.8 1.8 0 0 0 1.8 0l7-3.9a1.8 1.8 0 0 0 .9-1.6V7.2z" />
    <path d="m3.8 6.8 8.2 4.7 8.2-4.7M12 21.5V11.5" />
    <circle cx="12" cy="11.5" r="1.2" fill={color} stroke="none" />
  </svg>
);

export const IconFunction: React.FC<IconProps> = ({ size = 15, color = "#4f46e5", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M3 12.5h18M12 3v18" stroke={color} strokeOpacity={0.35} strokeWidth={1.3} />
    <path
      d="M3.5 17.5c3.5 0 4.5-12 8.5-12s5 12 8.5 12"
      stroke={color}
      strokeWidth={2.1}
    />
    <circle cx="12" cy="5.5" r="1.3" fill={color} stroke="none" />
    <circle cx="20.5" cy="17.5" r="1" fill={color} stroke="none" />
  </svg>
);

export const IconChart: React.FC<IconProps> = ({ size = 15, color = "#059669", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M3.5 3.5v16a1 1 0 0 0 1 1h16" stroke={color} strokeWidth={1.8} />
    <rect x="7" y="13" width="3" height="7" rx="1.5" fill={color} fillOpacity={0.25} stroke={color} strokeWidth={1.5} />
    <rect x="12" y="8" width="3" height="12" rx="1.5" fill={color} fillOpacity={0.4} stroke={color} strokeWidth={1.5} />
    <rect x="17" y="5" width="3" height="15" rx="1.5" fill={color} fillOpacity={0.6} stroke={color} strokeWidth={1.5} />
    <path
      d="M19.5 2.5c-.4 0-.7-.3-.7-.7 0 .4-.3.7-.7.7.4 0 .7.3.7.7 0-.4.3-.7.7-.7z"
      fill={color}
      stroke="none"
    />
  </svg>
);

export const IconRealWorld: React.FC<IconProps> = ({ size = 15, color = "#d97706", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="3.5" y="4" width="17" height="16" rx="3" fill={color} fillOpacity={0.14} stroke={color} />
    <circle cx="8" cy="8.5" r="2" fill={color} stroke="none" />
    <path
      d="m20 16-5-5-4 4-2.5-2.5L4 17"
      stroke={color}
      strokeWidth={1.8}
    />
  </svg>
);

export const IconPhysics: React.FC<IconProps> = ({ size = 15, color = "#7c3aed", className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="12" cy="12" r="2.4" fill={color} stroke="none" />
    <circle cx="11.2" cy="11.2" r="0.8" fill="#fff" stroke="none" />
    <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(30 12 12)" stroke={color} strokeWidth={1.4} />
    <ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-30 12 12)" stroke={color} strokeWidth={1.4} />
    <circle cx="19.5" cy="8" r="1.3" fill={color} stroke="none" />
    <circle cx="4.5" cy="8" r="1.3" fill={color} stroke="none" />
  </svg>
);

export const IconTrash: React.FC<IconProps> = ({ size = 14, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M4 6.5h16M9 6.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5" />
    <path
      d="M5.5 6.5l1.2 13a2 2 0 0 0 2 1.8h6.6a2 2 0 0 0 2-1.8l1.2-13"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <line x1="10" y1="10.5" x2="10" y2="16.5" strokeOpacity={0.6} />
    <line x1="14" y1="10.5" x2="14" y2="16.5" strokeOpacity={0.6} />
  </svg>
);

export const IconUndo: React.FC<IconProps> = ({ size = 14, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="M8.5 13.5 3.5 8.5l5-5" strokeWidth={2} />
    <path
      d="M3.5 8.5h11a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H10"
      strokeWidth={2}
    />
  </svg>
);

export const IconRedo: React.FC<IconProps> = ({ size = 14, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path d="m15.5 13.5 5-5-5-5" strokeWidth={2} />
    <path
      d="M20.5 8.5h-11A5.5 5.5 0 0 0 4 14v0a5.5 5.5 0 0 0 5.5 5.5H14"
      strokeWidth={2}
    />
  </svg>
);

export const IconSave: React.FC<IconProps> = ({ size = 14, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <path d="M7 3v5h10V3" strokeWidth={1.6} />
    <rect x="7" y="13" width="10" height="8" rx="1.5" strokeWidth={1.6} fill="currentColor" fillOpacity={0.2} />
  </svg>
);

export const IconOpenFile: React.FC<IconProps> = ({ size = 14, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M3.5 19h17a1.5 1.5 0 0 0 1.5-1.5V8a1.5 1.5 0 0 0-1.5-1.5h-7.8a1.5 1.5 0 0 1-1.2-.6l-.9-1.3a1.5 1.5 0 0 0-1.2-.6H3.5A1.5 1.5 0 0 0 2 5.5v12A1.5 1.5 0 0 0 3.5 19z"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <path d="M7 11h10M7 14h6" strokeOpacity={0.6} strokeWidth={1.4} />
  </svg>
);

export const IconCommand: React.FC<IconProps> = ({ size = 14, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z"
      fill="currentColor"
      fillOpacity={0.12}
    />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconFullscreen: React.FC<IconProps & { exit?: boolean }> = ({ size = 14, color, exit, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    {exit ? (
      <>
        <path d="M9 3v4a2 2 0 0 1-2 2H3M21 9h-4a2 2 0 0 1-2-2V3M15 21v-4a2 2 0 0 1 2-2h4M3 15h4a2 2 0 0 1 2 2v4" strokeWidth={2} />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </>
    ) : (
      <>
        <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" strokeWidth={2} />
        <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      </>
    )}
  </svg>
);

export const IconMore: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="5" cy="12" r="2" fill={color || "currentColor"} stroke="none" />
    <circle cx="4.3" cy="11.3" r="0.6" fill="#fff" stroke="none" />
    <circle cx="12" cy="12" r="2" fill={color || "currentColor"} stroke="none" />
    <circle cx="11.3" cy="11.3" r="0.6" fill="#fff" stroke="none" />
    <circle cx="19" cy="12" r="2" fill={color || "currentColor"} stroke="none" />
    <circle cx="18.3" cy="11.3" r="0.6" fill="#fff" stroke="none" />
  </svg>
);

export const IconStylusOnly: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M17.5 4a2 2 0 0 0-2.8 0L6 12.7 4 19l6.3-2 8.7-8.7a2 2 0 0 0 0-2.8l-1.5-1.5z"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <path d="m13 8.5 2.5 2.5" strokeWidth={1.5} />
    <circle cx="4.5" cy="18.5" r="1" fill="currentColor" stroke="none" />
    <path d="M21 15l-3 4h2.5l-1.5 3" strokeWidth={1.6} stroke="#38bdf8" />
  </svg>
);

export const IconHandTouch: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="11" cy="4" r="2.5" strokeDasharray="2 2" strokeOpacity={0.5} strokeWidth={1.3} />
    <path
      d="M11 6.5V3.8a1.8 1.8 0 0 0-3.6 0v7.2M7.4 8.5a1.8 1.8 0 0 0-3.4.6v3.9a7.5 7.5 0 0 0 7.5 7.5h2.5a6.5 6.5 0 0 0 6.5-6.5v-3.5a1.8 1.8 0 0 0-3.6 0V11M14 9.5a1.8 1.8 0 0 0-3 0"
      fill="currentColor"
      fillOpacity={0.12}
    />
  </svg>
);

export const IconRuler: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M3.5 7.5l4-4a2 2 0 0 1 2.8 0l10.2 10.2a2 2 0 0 1 0 2.8l-4 4a2 2 0 0 1-2.8 0L3.5 10.3a2 2 0 0 1 0-2.8z"
      fill="currentColor"
      fillOpacity={0.16}
    />
    <path d="m6.5 10.5 2-2M9 13l3.2-3.2M12 16l2-2M14.5 18.5 18 15" strokeWidth={1.5} />
    <circle cx="6" cy="6" r="1.2" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSetSquare: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M4.5 20h15a1 1 0 0 0 .8-1.6L5.8 4.2A1 1 0 0 0 4.5 5v14a1 1 0 0 0 1 1z"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <path d="M7.5 17h6.5L7.5 10.5v6.5z" strokeWidth={1.5} fill="#fff" fillOpacity={0.2} />
    <path d="M4.5 9h2M4.5 13h2M11 20v-2M15 20v-2" strokeWidth={1.3} />
  </svg>
);

export const IconProtractor: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M3.5 15.5h17a8.5 8.5 0 0 0-17 0z"
      fill="currentColor"
      fillOpacity={0.15}
    />
    <line x1="12" y1="15.5" x2="12" y2="10.5" strokeWidth={1.6} />
    <line x1="6.5" y1="15.5" x2="7.5" y2="13.5" strokeWidth={1.3} />
    <line x1="17.5" y1="15.5" x2="16.5" y2="13.5" strokeWidth={1.3} />
    <line x1="8.5" y1="11" x2="10" y2="12.5" strokeWidth={1.3} />
    <line x1="15.5" y1="11" x2="14" y2="12.5" strokeWidth={1.3} />
    <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const IconCompassTool: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="12" cy="4.5" r="2.2" fill="currentColor" fillOpacity={0.2} />
    <circle cx="12" cy="4.5" r="1" fill="currentColor" stroke="none" />
    <path d="M11 6.5 6 20.5" strokeWidth={2} />
    <path d="M13 6.5 18 20.5" strokeWidth={2} />
    <path d="M8.5 14a5.5 5.5 0 0 1 7 0" strokeWidth={1.5} />
    <path d="M17.5 19l1.5 2" strokeWidth={2} strokeLinecap="round" />
  </svg>
);

export const IconCalculator: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="4" y="2.5" width="16" height="19" rx="3.5" fill="currentColor" fillOpacity={0.14} />
    <rect x="6.5" y="5" width="11" height="4" rx="1.5" strokeWidth={1.5} fill="#fff" fillOpacity={0.3} />
    <circle cx="8" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="8" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="16" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    <rect x="11" y="18" width="6" height="2" rx="1" fill="currentColor" stroke="none" />
    <circle cx="8" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const IconPdf: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <path
      d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8l-5.5-5.5z"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <path d="M14 2.5V8h5.5" />
    <path d="M8 12.5v5M8 14.5h2.5a1.2 1.2 0 0 0 0-2.4H8" strokeWidth={1.8} />
    <circle cx="14" cy="14" r="1.5" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <circle cx="12" cy="12" r="3.2" fill="currentColor" fillOpacity={0.2} />
    <circle cx="12" cy="12" r="2.2" strokeWidth={1.6} />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
    />
  </svg>
);

export const IconHtmlSim: React.FC<IconProps> = ({ size = 15, color, className, ...props }) => (
  <svg {...base(size, color, className)} {...props}>
    <rect x="2.5" y="4" width="19" height="16" rx="3.5" fill="currentColor" fillOpacity={0.12} />
    <path d="m8 9-3.5 3 3.5 3" strokeWidth={1.8} />
    <path d="m16 9 3.5 3-3.5 3" strokeWidth={1.8} />
    <line x1="13" y1="8" x2="11" y2="16" strokeWidth={1.8} />
    <path
      d="M18.5 4.5c-.4 0-.8-.4-.8-.8 0 .4-.4.8-.8.8.4 0 .8.4.8.8 0-.4.4-.8.8-.8z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);
