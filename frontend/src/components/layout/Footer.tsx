import React from 'react';
import { Link } from 'react-router-dom';
import { useT } from '../../i18n/context';

const STRAVA_ORANGE = '#FC4C02';

function PoweredByStrava() {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: STRAVA_ORANGE, color: '#fff',
      padding: '3px 10px', borderRadius: 4,
      fontSize: 11, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase',
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
      </svg>
      Powered by Strava
    </div>
  );
}

const Footer: React.FC = () => {
  const t = useT();
  return (
    <footer className="app-footer" style={{
      background: 'var(--surface, #FAFAF9)',
      borderTop: '1px solid var(--border)',
      padding: '0 32px',
      flexShrink: 0,
    }}>
      <div className="app-footer-inner" style={{
        display: 'flex', alignItems: 'center', gap: 16, minHeight: 56,
      }}>
        <div className="app-footer-copy" style={{ flex: 1, fontSize: 12.5, color: 'var(--muted)' }}>
          {t.footer.copyright}
        </div>
        <div className="app-footer-strava" style={{ display: 'flex', justifyContent: 'center' }}>
          <PoweredByStrava />
        </div>
        <div className="app-footer-links" style={{
          flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 16,
          fontSize: 12.5, color: 'var(--muted)',
        }}>
          <Link to="/legal/privacy" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            {t.footer.privacy}
          </Link>
          <Link to="/legal/terms" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            {t.footer.terms}
          </Link>
          <Link to="/legal/cookies" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            {t.footer.cookies}
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
