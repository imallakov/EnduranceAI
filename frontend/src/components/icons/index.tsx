// Stroke-style icons — ported from design-handoff/endurance/project/components/icons.jsx
// All icons accept size and optional className props.

import React from 'react';

interface IcProps {
  size?: number;
  stroke?: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

const Ic: React.FC<IcProps> = ({ size = 16, stroke = 1.6, children, style, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
    className={className}
  >
    {children}
  </svg>
);

interface IconProps {
  size?: number;
  stroke?: number;
  style?: React.CSSProperties;
  className?: string;
}

export const IconLogo: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 18 C 7 6, 13 6, 17 14" stroke="#1E1B4B" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="19.5" cy="16" r="2.2" fill="#F97066" />
  </svg>
);

export const IconDashboard: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Ic>
);

export const IconActivity: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="M3 12h3.5l2.5-7 4 14 2.5-7H21" /></Ic>
);

export const IconPredict: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M3 17l4-4 3 3 5-6 6 7" />
    <circle cx="3" cy="17" r="1.2" fill="currentColor" />
    <circle cx="7" cy="13" r="1.2" fill="currentColor" />
    <circle cx="10" cy="16" r="1.2" fill="currentColor" />
    <circle cx="15" cy="10" r="1.2" fill="currentColor" />
  </Ic>
);

export const IconPlan: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18" />
    <path d="M8 3v4M16 3v4" />
  </Ic>
);

export const IconRace: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M5 21V4" />
    <path d="M5 4h11l-2 4 2 4H5" />
  </Ic>
);

export const IconAnalytics: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M4 20V10" />
    <path d="M10 20V4" />
    <path d="M16 20v-7" />
    <path d="M22 20H2" />
  </Ic>
);

export const IconSettings: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </Ic>
);

export const IconLogout: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Ic>
);

export const IconSearch: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Ic>
);

export const IconBell: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </Ic>
);

export const IconChevDown: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="m6 9 6 6 6-6" /></Ic>
);

export const IconChevRight: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="m9 6 6 6-6 6" /></Ic>
);

export const IconArrowUp: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M12 19V5" />
    <path d="m5 12 7-7 7 7" />
  </Ic>
);

export const IconArrowDown: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </Ic>
);

export const IconArrowRight: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </Ic>
);

export const IconArrowFlat: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="M5 12h14" /></Ic>
);

export const IconExternal: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M7 17 17 7" />
    <path d="M9 7h8v8" />
  </Ic>
);

export const IconCalendar: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </Ic>
);

export const IconCloud: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A7 7 0 1 0 6 18h11.5z" />
  </Ic>
);

export const IconMountain: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="m3 20 5.5-9 4 6 3.5-5 5 8z" /></Ic>
);

export const IconRefresh: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8" />
    <path d="M21 3v5h-5" />
  </Ic>
);

export const IconFilter: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="M3 4h18l-7 9v6l-4 2v-8z" /></Ic>
);

export const IconRunner: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <circle cx="17" cy="4.5" r="1.5" />
    <path d="M11 8l3-2 3 3 2 3" />
    <path d="m5 21 4-7 4 2-2 5" />
    <path d="m13 14 3 2 1 5" />
  </Ic>
);

export const IconCheck: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="m5 13 4 4L19 7" /></Ic>
);

export const IconMenu: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="M4 6h16M4 12h16M4 18h16" /></Ic>
);

export const IconClose: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="M6 6l12 12M18 6 6 18" /></Ic>
);

export const IconTriangleUp: React.FC<IconProps> = (p) => (
  <Ic {...p}><path d="m6 15 6-7 6 7" fill="currentColor" /></Ic>
);

export const IconShoe: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M2 16c0-2 2-2 3-3l3-3 4 3h4l5 2c1 .5 1.5 1.5 1.5 3 0 1.5-1 2-2.5 2H4c-1 0-2-.5-2-2v-2z" />
  </Ic>
);

export const IconTimer: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <circle cx="12" cy="14" r="8" />
    <path d="M12 10v4l2 2M9 2h6" />
  </Ic>
);

export const IconCommand: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M9 6V3a3 3 0 1 0-3 3h3zm0 0v12m0-12h6m0 0V3a3 3 0 1 1 3 3h-3zm0 12h-3a3 3 0 1 0 3 3v-3zm0 0V6m0 12h6a3 3 0 1 0-3-3v3" />
  </Ic>
);

export const IconUpload: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </Ic>
);

export const IconTrash: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
  </Ic>
);

// Share — three connected dots (Twitter / Telegram convention).
// Visually distinct from IconLogout to avoid confusion in row toolbars.
export const IconShare: React.FC<IconProps> = (p) => (
  <Ic {...p}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </Ic>
);
