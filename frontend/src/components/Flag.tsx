import React from 'react';

/**
 * Country flag rendered as a flat image from the public flagcdn.com CDN.
 *
 * Why this and not Unicode emoji flags:
 *  Regional-indicator codepoints (🇩🇪 etc.) require a system font that has
 *  glyphs for them. macOS and iOS ship one; Windows and most Linux distros
 *  do not, so the OS falls back to rendering the literal letters "DE" — and
 *  when our UI also shows the ISO code text next to it (catalog cards, etc.),
 *  the user sees a duplicated "DE DE". An <img> from flagcdn.com is a flat
 *  PNG that renders identically on every platform.
 *
 *  flagcdn.com is a free, no-key CDN backed by Cloudflare. Each request
 *  reveals the user's IP to that origin — fine for our purposes (publicly
 *  visible marathon catalogue, no PII). Cached aggressively by the browser.
 */
interface FlagProps {
  code: string;
  /** Rendered width in CSS pixels. Height is derived from the 4:3 ratio
   *  flagcdn.com serves. */
  width?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Flag: React.FC<FlagProps> = ({ code, width = 20, className, style }) => {
  if (!code) return null;
  const c = code.toLowerCase();
  // flagcdn offers widths 20, 40, 80, 160, 320, 640, 1280, 2560. We pick the
  // 2× variant so it stays crisp on retina screens.
  const px1x = Math.max(20, width * 2);
  const px2x = px1x * 2;
  return (
    <img
      src={`https://flagcdn.com/w${px1x}/${c}.png`}
      srcSet={`https://flagcdn.com/w${px2x}/${c}.png 2x`}
      width={width}
      height={Math.round(width * 0.75)}
      alt={code.toUpperCase()}
      loading="lazy"
      decoding="async"
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
