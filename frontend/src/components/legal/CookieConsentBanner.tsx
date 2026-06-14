import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useT } from '../../i18n/context';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'cookie_consent';

function getStoredConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

function saveConsent(analytics: boolean) {
  const state: ConsentState = {
    essential: true,
    analytics,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const t = useT();

  // Don't show on legal pages — user is already reading about cookies
  const isLegalPage = location.pathname.startsWith('/legal/');

  useEffect(() => {
    if (!getStoredConsent()) {
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible || isLegalPage) return null;

  const accept = (analytics: boolean) => {
    saveConsent(analytics);
    setVisible(false);
  };

  return (
    <div role="dialog" aria-label="Cookie consent" className="cookie-banner">
      {/* Icon + text */}
      <div className="cookie-banner__body">
        <div style={{ fontSize: 22, flexShrink: 0, marginTop: 1 }}>🍪</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
            {t.cookies.bannerTitle}
          </div>
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
            {t.cookies.bannerBody}{' '}
            <Link to="/legal/cookies" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 500 }}>
              {t.common.learnMore}
            </Link>
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="cookie-banner__actions">
        <Link
          to="/legal/cookies"
          className="cookie-banner__settings-link"
          style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'none', whiteSpace: 'nowrap' }}
        >
          {t.cookies.cookieSettings} →
        </Link>
        <button
          className="btn btn-ghost"
          style={{ height: 34, padding: '0 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}
          onClick={() => accept(false)}
        >
          {t.cookies.necessaryOnly}
        </button>
        <button
          className="btn btn-coral"
          style={{ height: 34, padding: '0 14px', fontSize: 12.5, whiteSpace: 'nowrap' }}
          onClick={() => accept(true)}
        >
          {t.cookies.acceptAll}
        </button>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
