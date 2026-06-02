import React, { useState } from 'react';

/**
 * Country flag rendered as a flat SVG from jsdelivr CDN (lipis/flag-icons
 * GitHub repo). Chosen over flagcdn.com because some ISPs (notably parts
 * of Russia, Turkey) blackhole flagcdn — jsdelivr sits on Cloudflare and
 * is reliable globally.
 *
 * Why this and not Unicode emoji flags:
 *  Regional-indicator codepoints (🇩🇪 etc.) require a system font that has
 *  glyphs for them. macOS and iOS ship one; Windows and most Linux distros
 *  do not, so the OS falls back to rendering the literal letters "DE" — and
 *  when our UI also shows the ISO code text next to it (catalog cards, etc.),
 *  the user sees a duplicated "DE DE".
 *
 * Fallback: if the image fails (offline, CDN blocked, etc.) we collapse to
 * a small monospace pill with the ISO code — never a broken-image icon.
 */
interface FlagProps {
  code: string;
  /** Rendered width in CSS pixels. Height = 0.75·width (4:3 aspect). */
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Flag: React.FC<FlagProps> = ({ code, width = 20, className, style }) => {
  const [errored, setErrored] = useState(false);
  if (!code) return null;
  const c = code.toLowerCase();
  const h = Math.round(width * 0.75);

  if (errored) {
    // Plain-text fallback so the layout doesn't collapse and we never show
    // a broken-image icon.
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width, height: h,
          fontSize: Math.max(8, width * 0.45),
          fontFamily: 'ui-monospace, monospace', fontWeight: 700,
          background: 'rgba(15,23,42,0.06)', color: 'var(--muted)',
          borderRadius: 2, letterSpacing: 0.2,
          ...style,
        }}
      >
        {code.toUpperCase().slice(0, 2)}
      </span>
    );
  }

  return (
    <img
      src={`https://cdn.jsdelivr.net/gh/lipis/flag-icons@main/flags/4x3/${c}.svg`}
      width={width}
      height={h}
      alt={code.toUpperCase()}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={className}
      style={{
        display: 'inline-block',
        borderRadius: 2,
        verticalAlign: 'middle',
        objectFit: 'cover',
        boxShadow: '0 0 0 0.5px rgba(15,23,42,0.10)',
        ...style,
      }}
    />
  );
};

export default Flag;
