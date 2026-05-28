# EnduranceAI Frontend

React 18 + TypeScript + Tailwind CSS v4 dashboard for EnduranceAI.

## Prerequisites

- Node.js 18+
- npm 9+ (or pnpm 8+)

## Getting started

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the Dashboard loads immediately with mock data.

## Available commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR on :5173 |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview production build locally |

## Project structure

```
src/
├── api/            # axios client (JWT interceptor) + react-query client
├── components/
│   ├── charts/     # LineChart, RadialGauge, Sparkline, ComponentBar, ElevationProfile
│   ├── dashboard/  # HeroCard, MetricCard, MetricsRow, ChartCard, ReadinessCard, …
│   ├── icons/      # All SVG icons as named React exports
│   ├── layout/     # AppShell (Sidebar + TopBar + Outlet)
│   └── ui/         # Button, Card, Pill, Chip
├── lib/
│   ├── mocks.ts    # SERIES (CTL/ATL/TSB) + ACTIVITIES mock data
│   └── format.ts   # formatPace, formatTime, formatDate helpers
├── pages/          # Dashboard + stub pages (Activities, Predictions, Plan, …)
└── types/          # TypeScript API types
```

## Design system

Tokens defined in `src/index.css` under `@theme` (Tailwind v4 CSS-first).
All numbers use Geist Mono with `font-feature-settings: 'tnum' 1`.
Page background: `#F5F4F1`. Card surface: `#FFFFFF`. Accent CTA: `#F97066`.

## Backend

Django + DRF backend in `../backend/`. Not connected yet — all data is mock.
Run `cd ../backend && python manage.py runserver` to start on :8000.
