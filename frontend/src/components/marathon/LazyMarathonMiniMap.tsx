import React, { useState, useEffect, useRef } from 'react';
import MarathonMiniMap from './MarathonMiniMap';

interface Props {
  encodedPolyline: string;
  height?: number | string;
  theme?: 'light' | 'dark';
  weight?: number;
  /** rootMargin for the observer — start loading this far before the card
   *  scrolls into view. Default 250px gives smooth scrolling without loading
   *  16 maps at once on first paint. */
  preloadMargin?: number;
}

/**
 * IntersectionObserver-gated MarathonMiniMap.
 *
 * Why: rendering 16 Leaflet instances on mount means 16 map containers,
 * ~200+ tile network requests, and a hefty pile of DOM listeners — noticeable
 * jank on mobile. With this wrapper each card stays a cheap placeholder div
 * until it's about to scroll into view, then it mounts the real map and stays
 * mounted (no unmount on scroll-out, so coming back doesn't re-fetch tiles).
 *
 * Server-rendered fallback: when IntersectionObserver isn't available (very
 * old browsers, SSR), we just mount immediately — degrades to the previous
 * behaviour without breaking.
 */
const LazyMarathonMiniMap: React.FC<Props> = ({ preloadMargin = 250, ...props }) => {
  const [visible, setVisible] = useState(false);
  const placeholderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visible) return;
    const el = placeholderRef.current;
    if (!el) return;

    // Fallback: no IO support → mount immediately.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: `${preloadMargin}px 0px` },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, preloadMargin]);

  if (visible) {
    return <MarathonMiniMap {...props} />;
  }

  // Placeholder matches the eventual map's background so the swap is seamless.
  const height = props.height ?? 132;
  return (
    <div
      ref={placeholderRef}
      style={{
        width: '100%', height: height as React.CSSProperties['height'],
        background: props.theme === 'dark' ? '#1E1B4B' : '#FAFAF9',
        // Subtle indication that something will load here, without distracting.
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Faint pulse to hint at incoming content */}
      <div className="map-skeleton-pulse" style={{
        position: 'absolute', inset: 0,
        background: props.theme === 'dark'
          ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)'
          : 'linear-gradient(90deg, transparent, rgba(15,23,42,0.04), transparent)',
      }} />
    </div>
  );
};

export default LazyMarathonMiniMap;
