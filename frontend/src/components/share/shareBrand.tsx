import React from 'react';

/**
 * Single source of truth for everything brand-related that appears inside
 * shared images (story cards, predictions, splits).
 *
 * Changing the brand name / domain after rebrand: edit ONLY these two
 * constants. No grep across template files, no risk of stale "enduranceai.com"
 * watermarks slipping through one template.
 *
 * Why `endurance.yuzapp.space` and not `enduranceai.com`: the latter is
 * unowned — users following the watermark would hit a parked domain. The
 * former is the actual deployed product.
 */
export const SHARE_BRAND_NAME = 'EnduranceAI';
export const SHARE_BRAND_DOMAIN = 'endurance.yuzapp.space';

interface BrandMarkProps {
  /** Visual size in CSS pixels. */
  size?: number;
  /** Render in 'dark' (white stroke, for dark backgrounds) or 'light'
   *  (deep indigo stroke, for white backgrounds). */
  variant?: 'dark' | 'light';
}

/**
 * Wordmark glyph used in every share template. Was inlined 3× before —
 * extracting kills duplication and lets us swap the icon project-wide in
 * one place. Two colour variants because templates have both dark (cinematic)
 * and light (minimalist/splits) themes.
 */
export const ShareBrandMark: React.FC<BrandMarkProps> = ({ size = 16, variant = 'light' }) => {
  const stroke = variant === 'dark' ? '#fff' : '#1E1B4B';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 18 C 7 6, 13 6, 17 14" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="19.5" cy="16" r="2.2" fill="#F97066" />
    </svg>
  );
};
