import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { IconLogo } from '../components/icons';
import LanguageSwitcher from '../components/LanguageSwitcher';
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

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const profile = await login({ email, password });
      navigate(profile.onboarding_completed ? '/dashboard' : '/onboarding', { replace: true });
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
            <div style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1 }}>{t.auth.signInToAccount}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.auth.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="runner@example.com"
              className="focus-input"
              style={{
                height: 40, border: '1px solid var(--border)', borderRadius: 8,
                padding: '0 12px', fontSize: 14, fontFamily: 'inherit',
                background: '#fff', color: 'var(--text)', outline: 'none',
                width: '100%', boxSizing: 'border-box',
                transition: 'border-color 120ms ease, box-shadow 120ms ease',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.auth.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="focus-input"
              style={{
                height: 40, border: '1px solid var(--border)', borderRadius: 8,
                padding: '0 12px', fontSize: 14, fontFamily: 'inherit',
                background: '#fff', color: 'var(--text)', outline: 'none',
                width: '100%', boxSizing: 'border-box',
                transition: 'border-color 120ms ease, box-shadow 120ms ease',
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: 13, color: 'var(--danger)', lineHeight: 1.45 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-coral"
            style={{ width: '100%', justifyContent: 'center', height: 40, fontSize: 14, marginTop: 4 }}
          >
            {submitting ? t.auth.signingIn : t.auth.signIn}
          </button>
        </form>

        <div style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
          {t.auth.noAccount}{' '}
          <Link to="/register" style={{ color: 'var(--primary-2)', fontWeight: 500, textDecoration: 'none' }}>
            {t.auth.registerLink}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
