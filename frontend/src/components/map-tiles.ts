// Stadia Maps basemaps (Alidade Smooth = the old CARTO Positron/Dark look).
// Key is domain-restricted, not secret, so it's fine in the bundle. Falls back
// to no-key Esri gray canvas when VITE_STADIA_KEY is unset (e.g. local dev).
const KEY = import.meta.env.VITE_STADIA_KEY as string | undefined;

export const TILE_ATTR =
  '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>';

export const darkTileUrl = (): string =>
  KEY
    ? `https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png?api_key=${KEY}`
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';

export const lightTileUrl = (): string =>
  KEY
    ? `https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png?api_key=${KEY}`
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
