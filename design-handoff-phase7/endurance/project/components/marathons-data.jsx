// Marathons catalog — race data, route silhouettes, elevation series.
// Hand-crafted polyline shapes (viewBox 0..100 × 0..70) + 42-point
// elevation arrays so each card has unique visual signal.

// ── Route silhouettes (just a polyline; cards render with no glow) ──
const ROUTES = {
  // Berlin — broad single loop, slightly tilted oval through the city
  berlin: '14,48 20,34 32,24 46,20 62,22 76,28 84,40 82,52 70,58 54,60 38,56 24,52 18,50 14,48',
  // London — meander down the Thames then back, big northern loop
  london: '12,40 22,36 30,44 40,38 48,48 56,40 64,46 72,38 80,46 86,38 80,30 70,28 60,32 50,26 40,30 32,24 22,30 16,34 12,40',
  // Chicago — tall narrow loop north–south through the Loop
  chicago: '38,12 44,10 52,14 56,22 58,32 56,42 60,52 56,60 48,62 40,60 36,52 38,42 34,32 36,22 38,12',
  // Boston — point-to-point: Hopkinton → Boston, slight curve east
  boston: '8,18 16,22 24,26 32,28 40,32 48,36 56,42 64,46 72,50 80,52 88,50',
  // NYC — five-borough zigzag with bridges
  nyc: '20,60 22,52 26,46 34,48 36,40 30,34 36,28 44,30 50,22 56,28 50,36 58,42 64,38 70,30 76,36 72,44 64,50 56,54 52,48',
  // Tokyo — out-and-back south with detour east
  tokyo: '14,38 22,36 30,40 38,38 46,42 54,40 62,44 70,42 78,46 80,38 72,32 64,34 56,28 48,30 40,26 32,30 24,28 18,32 14,38',
  // Valencia — tight rounded rectangle loop
  valencia: '24,28 36,22 50,20 64,22 74,28 76,40 70,50 56,54 42,52 30,48 24,40 24,28',
  // Istanbul — long S-curve across the Bosphorus
  istanbul: '8,46 16,40 24,44 32,38 40,42 48,34 56,38 62,30 70,34 76,26 82,30 86,38 80,46 72,42 64,50 56,46 48,52 40,48 32,54 24,50 16,54 8,46',
  // Moscow — broad square loop through center
  moscow: '20,24 32,20 46,18 58,20 70,24 76,34 74,46 64,52 50,54 36,52 24,46 18,36 20,24',
};

// ── Elevation series — 43 points (start, every km, finish) ──
// Each value is meters above the minimum point of the course.
// Visually: flat races look flat, hilly races have spikes.
const ELEVATION = {
  berlin: [38,40,42,41,43,45,44,46,48,47,45,46,48,50,49,47,45,46,44,42,41,43,45,47,46,44,42,43,45,46,44,42,40,41,43,45,46,44,42,40,38,36,34],
  london: [22,24,26,28,30,32,34,32,30,28,30,32,34,36,34,32,30,28,30,32,34,36,38,36,34,32,30,28,30,32,34,36,38,36,34,32,30,28,26,24,22,20,18],
  chicago: [16,17,18,19,20,21,22,23,24,25,24,23,22,21,20,21,22,23,24,25,24,23,22,21,20,21,22,23,24,25,24,23,22,21,20,19,18,17,16,15,14,13,12],
  boston: [120,118,114,108,100,96,90,82,76,70,68,72,76,80,72,66,60,54,48,46,50,58,68,78,88,102,118,138,158,180,200,222,248,228,206,184,158,134,110,90,72,58,48],
  nyc: [10,12,14,12,16,22,30,40,52,46,38,30,24,28,36,46,58,72,86,98,108,118,128,140,150,142,128,112,94,82,70,86,108,134,158,182,196,182,160,134,108,86,68],
  tokyo: [28,30,32,34,38,42,46,50,54,58,62,66,68,70,68,64,60,56,52,48,44,42,46,52,58,64,70,76,80,82,80,76,70,64,58,52,46,42,38,34,30,26,22],
  valencia: [18,19,20,20,21,22,21,20,19,20,21,22,21,20,19,18,19,20,21,22,21,20,19,18,19,20,21,22,21,20,19,18,19,20,21,22,21,20,19,18,17,16,15],
  istanbul: [50,55,62,72,84,96,108,124,142,162,180,196,210,222,228,222,210,196,180,162,142,124,108,96,108,124,142,162,180,196,210,222,228,210,182,156,128,102,82,66,54,46,40],
  moscow: [42,44,46,48,52,56,60,64,68,72,76,78,80,78,76,72,68,64,60,56,60,64,68,72,76,78,80,82,80,76,72,68,64,60,56,52,48,46,44,42,40,38,36],
};

const RACES = [
  {
    id: 'berlin', name: 'Berlin Marathon', city: 'Berlin', country: 'Germany', cc: 'DE', flag: '🇩🇪',
    date: '27 Sep 2026', month: 'SEP', monthIdx: 8,
    distance: '42.195', elev: 130, coeff: 1.002, diff: 'Flat', diffKey: 'flat',
    avgTemp: '17°C', humidity: '65%', avgTime: '3:52',
    major: true, popular: true, target: true,
    blurb: 'World record course · fastest of the Majors',
  },
  {
    id: 'london', name: 'London Marathon', city: 'London', country: 'United Kingdom', cc: 'GB', flag: '🇬🇧',
    date: '26 Apr 2026', month: 'APR', monthIdx: 3,
    distance: '42.195', elev: 115, coeff: 1.004, diff: 'Flat', diffKey: 'flat',
    avgTemp: '12°C', humidity: '70%', avgTime: '4:18',
    major: true, blurb: 'Tower Bridge · The Mall finish',
  },
  {
    id: 'chicago', name: 'Chicago Marathon', city: 'Chicago', country: 'United States', cc: 'US', flag: '🇺🇸',
    date: '11 Oct 2026', month: 'OCT', monthIdx: 9,
    distance: '42.195', elev: 60, coeff: 1.001, diff: 'Flat', diffKey: 'flat',
    avgTemp: '14°C', humidity: '60%', avgTime: '4:02',
    major: true, blurb: 'Pancake-flat Loop course',
  },
  {
    id: 'boston', name: 'Boston Marathon', city: 'Boston', country: 'United States', cc: 'US', flag: '🇺🇸',
    date: '20 Apr 2026', month: 'APR', monthIdx: 3,
    distance: '42.195', elev: 400, coeff: 1.038, diff: 'Hilly', diffKey: 'hilly',
    avgTemp: '11°C', humidity: '55%', avgTime: '3:35',
    major: true, blurb: 'BQ-only · Heartbreak Hill at km 32',
  },
  {
    id: 'nyc', name: 'NYC Marathon', city: 'New York', country: 'United States', cc: 'US', flag: '🇺🇸',
    date: '1 Nov 2026', month: 'NOV', monthIdx: 10,
    distance: '42.195', elev: 500, coeff: 1.048, diff: 'Tough', diffKey: 'tough',
    avgTemp: '10°C', humidity: '65%', avgTime: '4:31',
    major: true, blurb: 'Five boroughs · Verrazzano + Queensboro',
  },
  {
    id: 'tokyo', name: 'Tokyo Marathon', city: 'Tokyo', country: 'Japan', cc: 'JP', flag: '🇯🇵',
    date: '1 Mar 2026', month: 'MAR', monthIdx: 2,
    distance: '42.195', elev: 185, coeff: 1.009, diff: 'Mid', diffKey: 'mid',
    avgTemp: '10°C', humidity: '50%', avgTime: '4:15',
    major: true, blurb: 'Imperial Palace · Tokyo Bay finish',
  },
  {
    id: 'valencia', name: 'Valencia Marathon', city: 'Valencia', country: 'Spain', cc: 'ES', flag: '🇪🇸',
    date: '6 Dec 2026', month: 'DEC', monthIdx: 11,
    distance: '42.195', elev: 65, coeff: 1.001, diff: 'Flat', diffKey: 'flat',
    avgTemp: '17°C', humidity: '60%', avgTime: '3:48',
    blurb: 'Fastest in Europe · PB territory',
  },
  {
    id: 'istanbul', name: 'Istanbul Marathon', city: 'Istanbul', country: 'Türkiye', cc: 'TR', flag: '🇹🇷',
    date: '8 Nov 2026', month: 'NOV', monthIdx: 10,
    distance: '42.195', elev: 380, coeff: 1.038, diff: 'Hilly', diffKey: 'hilly',
    avgTemp: '13°C', humidity: '65%', avgTime: '4:24',
    blurb: 'Spans two continents · Bosphorus Bridge',
  },
  {
    id: 'moscow', name: 'Moscow Marathon', city: 'Moscow', country: 'Russia', cc: 'RU', flag: '🇷🇺',
    date: '13 Sep 2026', month: 'SEP', monthIdx: 8,
    distance: '42.195', elev: 170, coeff: 1.014, diff: 'Mid', diffKey: 'mid',
    avgTemp: '12°C', humidity: '70%', avgTime: '4:08',
    blurb: 'Red Square start · Moskva river loop',
  },
];

// Custom GPX (Tiergarten Long Run) — for modal preview
const CUSTOM_GPX = {
  id: 'tiergarten', filename: 'tiergarten_long_run.gpx',
  name: 'Tiergarten Long Run', city: 'Berlin', country: 'Germany', cc: 'DE', flag: '🇩🇪',
  date: '13 Sep 2026', distance: '12.04', elev: 85, coeff: 1.012, diff: 'Flat',
};

// Tiergarten route — small park loop
const TIERGARTEN_ROUTE = '20,52 28,40 38,30 50,24 62,26 72,32 78,42 76,54 64,60 50,62 36,58 24,56 20,52';

// 13-point elevation for custom GPX
const TIERGARTEN_ELEV = [32,34,36,38,42,46,48,46,42,38,36,34,32];

Object.assign(window, { ROUTES, ELEVATION, RACES, CUSTOM_GPX, TIERGARTEN_ROUTE, TIERGARTEN_ELEV });
