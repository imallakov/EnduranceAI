// Stroke-style icons — match Linear/Vercel restraint.
// All accept size + color, default 16/currentColor.

const Ic = ({ size = 16, stroke = 1.6, children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

const IconLogo = ({ size = 22 }) => (
  // Abstract "arc + dot" — a forward stride
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M3 18 C 7 6, 13 6, 17 14" stroke="#1E1B4B" strokeWidth="2.2" strokeLinecap="round" />
    <circle cx="19.5" cy="16" r="2.2" fill="#F97066" />
  </svg>
);

const IconDashboard = (p) => <Ic {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Ic>;
const IconActivity = (p) => <Ic {...p}><path d="M3 12h3.5l2.5-7 4 14 2.5-7H21"/></Ic>;
const IconPredict  = (p) => <Ic {...p}><path d="M3 17l4-4 3 3 5-6 6 7"/><circle cx="3" cy="17" r="1.2" fill="currentColor"/><circle cx="7" cy="13" r="1.2" fill="currentColor"/><circle cx="10" cy="16" r="1.2" fill="currentColor"/><circle cx="15" cy="10" r="1.2" fill="currentColor"/></Ic>;
const IconPlan     = (p) => <Ic {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4M16 3v4"/></Ic>;
const IconRace     = (p) => <Ic {...p}><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></Ic>;
const IconAnalytics= (p) => <Ic {...p}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></Ic>;
const IconSettings = (p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></Ic>;
const IconLogout   = (p) => <Ic {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></Ic>;
const IconSearch   = (p) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></Ic>;
const IconBell     = (p) => <Ic {...p}><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></Ic>;
const IconChevDown = (p) => <Ic {...p}><path d="m6 9 6 6 6-6"/></Ic>;
const IconChevRight= (p) => <Ic {...p}><path d="m9 6 6 6-6 6"/></Ic>;
const IconArrowUp  = (p) => <Ic {...p}><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></Ic>;
const IconArrowDown= (p) => <Ic {...p}><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></Ic>;
const IconArrowRight= (p) => <Ic {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></Ic>;
const IconArrowFlat= (p) => <Ic {...p}><path d="M5 12h14"/></Ic>;
const IconExternal = (p) => <Ic {...p}><path d="M7 17 17 7"/><path d="M9 7h8v8"/></Ic>;
const IconCalendar = (p) => <Ic {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></Ic>;
const IconCloud    = (p) => <Ic {...p}><path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A7 7 0 1 0 6 18h11.5z"/></Ic>;
const IconMountain = (p) => <Ic {...p}><path d="m3 20 5.5-9 4 6 3.5-5 5 8z"/></Ic>;
const IconRefresh  = (p) => <Ic {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></Ic>;
const IconFilter   = (p) => <Ic {...p}><path d="M3 4h18l-7 9v6l-4 2v-8z"/></Ic>;
const IconRunner   = (p) => <Ic {...p}><circle cx="17" cy="4.5" r="1.5"/><path d="M11 8l3-2 3 3 2 3"/><path d="m5 21 4-7 4 2-2 5"/><path d="m13 14 3 2 1 5"/></Ic>;
const IconCheck    = (p) => <Ic {...p}><path d="m5 13 4 4L19 7"/></Ic>;
const IconMenu     = (p) => <Ic {...p}><path d="M4 6h16M4 12h16M4 18h16"/></Ic>;
const IconClose    = (p) => <Ic {...p}><path d="M6 6l12 12M18 6 6 18"/></Ic>;
const IconTriangleUp= (p) => <Ic {...p}><path d="m6 15 6-7 6 7" fill="currentColor"/></Ic>;
const IconShoe     = (p) => <Ic {...p}><path d="M2 16c0-2 2-2 3-3l3-3 4 3h4l5 2c1 .5 1.5 1.5 1.5 3 0 1.5-1 2-2.5 2H4c-1 0-2-.5-2-2v-2z"/></Ic>;
const IconTimer    = (p) => <Ic {...p}><circle cx="12" cy="14" r="8"/><path d="M12 10v4l2 2M9 2h6"/></Ic>;
const IconCommand  = (p) => <Ic {...p}><path d="M9 6V3a3 3 0 1 0-3 3h3zm0 0v12m0-12h6m0 0V3a3 3 0 1 1 3 3h-3zm0 12h-3a3 3 0 1 0 3 3v-3zm0 0V6m0 12h6a3 3 0 1 0-3-3v3"/></Ic>;

Object.assign(window, {
  IconLogo, IconDashboard, IconActivity, IconPredict, IconPlan, IconRace,
  IconAnalytics, IconSettings, IconLogout, IconSearch, IconBell, IconChevDown,
  IconChevRight, IconArrowUp, IconArrowDown, IconArrowRight, IconArrowFlat,
  IconExternal, IconCalendar, IconCloud, IconMountain, IconRefresh, IconFilter,
  IconRunner, IconCheck, IconMenu, IconClose, IconTriangleUp, IconShoe, IconTimer,
  IconCommand,
});
