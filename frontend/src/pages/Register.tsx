import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { IconLogo } from '../components/icons';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { getActivePolicy, acceptPolicy } from '../api/legal';
import { useT } from '../i18n/context';
import type { AxiosError } from 'axios';

function extractError(err: unknown, fallback: string): string {
  const e = err as AxiosError<Record<string, unknown>>;
  if (e.response?.data) {
    const d = e.response.data;
    if (typeof d.detail === 'string') return d.detail;
    const msgs = Object.values(d).flat();
    if (msgs.length) return msgs.join(' ');
  }
  return fallback;
}

const INPUT_STYLE: React.CSSProperties = {
  height: 40, border: '1px solid var(--border)', borderRadius: 8,
  padding: '0 12px', fontSize: 14, fontFamily: 'inherit',
  background: '#fff', color: 'var(--text)', outline: 'none',
  width: '100%', boxSizing: 'border-box',
  transition: 'border-color 120ms ease, box-shadow 120ms ease',
};

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', password: '', password2: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Pre-fetch active policy IDs so we can auto-accept on registration
  const [policyIds, setPolicyIds] = useState<{ privacy?: string; terms?: string }>({});
  useEffect(() => {
    Promise.all([
      getActivePolicy('privacy').catch(() => null),
      getActivePolicy('terms').catch(() => null),
    ]).then(([privacy, terms]) => {
      setPolicyIds({
        privacy: privacy?.id,
        terms: terms?.id,
      });
    });
  }, []);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setError(t.errors.mustAgreeToTerms);
      return;
    }
    setError('');
    if (form.password !== form.password2) {
      setError(t.errors.passwordsDoNotMatch);
      return;
    }
    setSubmitting(true);
    try {
      await register({ ...form, marketing_emails_consent: marketingConsent });

      // Auto-accept current active PP and ToS
      const accepts: Promise<unknown>[] = [];
      if (policyIds.privacy) accepts.push(acceptPolicy(policyIds.privacy).catch(() => null));
      if (policyIds.terms) accepts.push(acceptPolicy(policyIds.terms).catch(() => null));
      await Promise.all(accepts);

      navigate('/onboarding', { replace: true });  // new users always go through onboarding
    } catch (err) {
      setError(extractError(err, t.errors.anErrorOccurred));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F5F4F1',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <LanguageSwitcher variant="mini" />
      </div>
      <div className="card" style={{ width: '100%', maxWidth: 440, padding: 36 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <IconLogo size={26} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.3 }}>EnduranceAI</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 }}>{t.auth.createYourAccount}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.auth.firstName}</label>
              <input
                type="text" value={form.first_name} onChange={set('first_name')}
                required autoComplete="given-name" placeholder="Marcus"
                className="focus-input" style={INPUT_STYLE}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.auth.lastName}</label>
              <input
                type="text" value={form.last_name} onChange={set('last_name')}
                required autoComplete="family-name" placeholder="Schmidt"
                className="focus-input" style={INPUT_STYLE}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.auth.email}</label>
            <input
              type="email" value={form.email} onChange={set('email')}
              required autoComplete="email" placeholder="runner@example.com"
              className="focus-input" style={INPUT_STYLE}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.auth.password}</label>
            <input
              type="password" value={form.password} onChange={set('password')}
              required autoComplete="new-password" placeholder={t.auth.minChars}
              className="focus-input" style={INPUT_STYLE}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.auth.confirmPassword}</label>
            <input
              type="password" value={form.password2} onChange={set('password2')}
              required autoComplete="new-password" placeholder={t.auth.repeatPassword}
              className="focus-input" style={INPUT_STYLE}
            />
          </div>

          {/* Required: ToS + PP consent */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginTop: 4 }}>
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={e => setAgreedToTerms(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>
              {t.auth.iAgreeToThe}{' '}
              <Link to="/legal/terms" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                {t.legal.terms}
              </Link>
              {' '}{t.auth.and}{' '}
              <Link to="/legal/privacy" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--primary)', textDecoration: 'underline' }}>
                {t.legal.privacy}
              </Link>
              {' '}
              <span style={{ color: 'var(--danger)' }}>*</span>
            </span>
          </label>

          {/* Optional: marketing emails */}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={marketingConsent}
              onChange={e => setMarketingConsent(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--primary)' }}
            />
            <span style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
              {t.auth.marketingOptIn} {t.auth.marketingOptInHint}
            </span>
          </label>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--danger)', lineHeight: 1.45 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || !agreedToTerms}
            className="btn btn-coral"
            style={{ width: '100%', justifyContent: 'center', height: 40, fontSize: 14, marginTop: 4 }}
          >
            {submitting ? t.auth.creatingAccount : t.auth.register}
          </button>
        </form>

        <div style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          {t.auth.alreadyHaveAccount}{' '}
          <Link to="/login" style={{ color: 'var(--primary-2)', fontWeight: 500, textDecoration: 'none' }}>
            {t.auth.signInLink}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
