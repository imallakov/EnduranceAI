import React, { useState, useRef, useEffect } from 'react';
import { useLang } from '../i18n/context';
import { LANGUAGES } from '../i18n/types';

interface LanguageSwitcherProps {
  variant?: 'default' | 'mini';
  align?: 'left' | 'right';
  direction?: 'up' | 'down';
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'default', align = 'right', direction = 'down' }) => {
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const isMini = variant === 'mini';

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: isMini ? 4 : 6,
          height: isMini ? 28 : 36,
          padding: isMini ? '0 8px' : '0 12px',
          border: '1px solid var(--border)',
          borderRadius: 8,
          background: 'var(--surface)',
          color: 'var(--text)',
          cursor: 'pointer',
          fontSize: isMini ? 11 : 13,
          fontWeight: 500,
          fontFamily: 'inherit',
        }}
      >
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: isMini ? 18 : 22, height: isMini ? 14 : 17,
          borderRadius: 3,
          background: 'var(--primary)',
          color: '#fff',
          fontSize: isMini ? 9 : 10,
          fontWeight: 700,
          letterSpacing: 0.3,
          flexShrink: 0,
        }}>
          {current.flag}
        </span>
        {!isMini && <span>{current.label}</span>}
        <svg width={isMini ? 9 : 10} height={isMini ? 9 : 10} viewBox="0 0 10 10" fill="none" style={{ opacity: 0.5 }}>
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: direction === 'down' ? '100%' : 'auto',
          bottom: direction === 'up' ? '100%' : 'auto',
          marginTop: direction === 'down' ? 4 : 0,
          marginBottom: direction === 'up' ? 4 : 0,
          right: align === 'right' ? 0 : 'auto',
          left: align === 'left' ? 0 : 'auto',
          minWidth: 140,
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--surface)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 1000,
          overflow: 'hidden',
        }}>
          {LANGUAGES.map(l => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '9px 14px',
                background: l.code === lang ? 'rgba(79,70,229,0.07)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: 13,
                color: 'var(--text)',
                fontFamily: 'inherit',
                fontWeight: l.code === lang ? 600 : 400,
              }}
            >
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 22, height: 17,
                borderRadius: 3,
                background: l.code === lang ? 'var(--primary)' : 'var(--border)',
                color: l.code === lang ? '#fff' : 'var(--muted)',
                fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                flexShrink: 0,
              }}>
                {l.flag}
              </span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
