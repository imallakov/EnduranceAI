import React from 'react';
import { IconArrowRight } from './icons';

interface ComingSoonProps {
  title: string;
  tagline: string;
  bullets: string[];
  cta?: { label: string; to: string };
}

/**
 * Generic "in development" placeholder for pages not yet wired up.
 * Should look like a feature preview, NOT like a broken page.
 */
const ComingSoon: React.FC<ComingSoonProps> = ({ title, tagline, bullets, cta }) => (
  <div style={{ padding: '24px 32px 40px' }}>
    <h1 style={{
      margin: 0, fontSize: 22, fontWeight: 600,
      letterSpacing: -0.4, color: 'var(--text)',
    }}>
      {title}
    </h1>

    <div className="card" style={{
      marginTop: 22, padding: '40px 32px',
      maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="pill pill-soft-indigo" style={{ letterSpacing: 0.3 }}>
          IN DEVELOPMENT
        </span>
      </div>

      <p style={{
        margin: 0, fontSize: 15, color: 'var(--text)',
        lineHeight: 1.5, fontWeight: 500,
      }}>
        {tagline}
      </p>

      <ul style={{
        margin: 0, paddingLeft: 0, listStyle: 'none',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        {bullets.map((b) => (
          <li key={b} style={{
            fontSize: 13.5, color: 'var(--muted)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{
              width: 5, height: 5, borderRadius: 3,
              background: 'var(--primary-2)',
              marginTop: 7, flexShrink: 0,
            }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {cta && (
        <a href={cta.to} className="btn btn-ghost" style={{
          alignSelf: 'flex-start', marginTop: 8, textDecoration: 'none',
        }}>
          {cta.label} <IconArrowRight size={13} />
        </a>
      )}
    </div>
  </div>
);

export default ComingSoon;
