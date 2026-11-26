// Stadia Maps basemaps (Alidade Smooth = the old CARTO Positron/Dark look).
//
// Prod: tiles go through our own nginx at /tiles/stadia/* which proxies Stadia
// AND caches on disk — so repeat tiles (same marathon, panning, other users)
// are served locally and don't burn Stadia credits. The API key lives only in
// the nginx config, not in this bundle.
// Dev (vite): no proxy, so hit Stadia directly with VITE_STADIA_KEY, or fall
// back to the no-key Esri gray canvas.
const KEY = import.meta.env.VITE_STADIA_KEY as string | undefined;
const PROD = import.meta.env.PROD;

const ESRI_DARK =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_LIGHT =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';

export const TILE_ATTR =
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

function stadia(style: string, esriFallback: string): string {
  if (PROD) return `/tiles/stadia/${style}/{z}/{x}/{y}{r}.png`;
  if (KEY) return `https://tiles.stadiamaps.com/tiles/${style}/{z}/{x}/{y}{r}.png?api_key=${KEY}`;
  return esriFallback;
}

export const darkTileUrl = (): string => stadia('alidade_smooth_dark', ESRI_DARK);
export const lightTileUrl = (): string => stadia('alidade_smooth', ESRI_LIGHT);
