import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = (p: P) => ({
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...p,
});

export const IconPhoto = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="M7 5l1.2-1.6h7.6L17 5" />
  </svg>
);

export const IconVideo = (p: P) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="13" height="12" rx="2" />
    <path d="M16 10l5-3v10l-5-3z" />
  </svg>
);

export const IconHome = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 11l8-6 8 6" />
    <path d="M6 10v9h12v-9" />
    <path d="M10 19v-5h4v5" />
  </svg>
);

export const IconGlobe = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.6 2.3 2.6 14.7 0 17M12 3.5C9.4 5.8 9.4 18.2 12 20.5" />
  </svg>
);

export const IconPin = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 21s-6.5-6-6.5-10.5A6.5 6.5 0 0 1 18.5 10.5C18.5 15 12 21 12 21z" />
    <circle cx="12" cy="10.3" r="2.3" />
  </svg>
);

export const IconPlus = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconMinus = (p: P) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const IconClose = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export const IconChevron = (p: P) => (
  <svg {...base(p)}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const IconCamera = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 8h3l1.4-2h7.2L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13" r="3.2" />
  </svg>
);

export const IconCheck = (p: P) => (
  <svg {...base(p)}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

/* ---- info tabs ---- */
export const IconGeneral = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 6h16M4 12h16M4 18h10" />
  </svg>
);

export const IconSafety = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l7 3v5c0 4.4-3 8.2-7 10-4-1.8-7-5.6-7-10V6z" />
    <path d="M12 8.5v4M12 15.2h.01" />
  </svg>
);

export const IconSpace = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    <path d="M12 3v18M4 7.5l8 4.5 8-4.5" />
  </svg>
);

/* ---- VR controls ---- */
export const IconVR = (p: P) => (
  <svg {...base(p)}>
    <rect x="2.5" y="7.5" width="19" height="9" rx="3" />
    <path d="M9 16.5c.5-1.6 1.5-2.4 3-2.4s2.5.8 3 2.4" />
    <circle cx="7.5" cy="11.5" r="0.6" fill="currentColor" />
    <circle cx="16.5" cy="11.5" r="0.6" fill="currentColor" />
  </svg>
);

export const IconAuto = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 1 2.4 5.7" />
    <path d="M4 20v-3.5h3.5" />
    <path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconSample = (p: P) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconDIY = (p: P) => (
  <svg {...base(p)}>
    <path d="M14.5 4.2a4 4 0 0 0-5.3 5.3L4 14.7 6.3 17l5.2-5.2a4 4 0 0 0 5.3-5.3l-2.4 2.4-2-2z" />
  </svg>
);

export const IconFullscreen = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </svg>
);

export const IconLookAround = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2" />
    <path d="M12 8.5l2.2 3.5-2.2 3.5-2.2-3.5z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconZoomIn = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-3.6-3.6M11 8.5v5M8.5 11h5" />
  </svg>
);

export const IconZoomOut = (p: P) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-3.6-3.6M8.5 11h5" />
  </svg>
);

export const IconCompass = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" stroke="none" />
  </svg>
);

export const IconArrowDown = (p: P) => (
  <svg {...base(p)}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </svg>
);

export const IconSound = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 9v6h4l5 4V5L8 9z" />
    <path d="M16 8.5a4 4 0 0 1 0 7M18.5 6a7 7 0 0 1 0 12" />
  </svg>
);

export const IconGrid = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="7" height="7" rx="1" />
    <rect x="13" y="4" width="7" height="7" rx="1" />
    <rect x="4" y="13" width="7" height="7" rx="1" />
    <rect x="13" y="13" width="7" height="7" rx="1" />
  </svg>
);
