import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useActivePolicy, useUserAcceptances, useAcceptPolicy } from '../../hooks/useLegal';
import { PolicyRenderer } from '../../components/legal/PolicyRenderer';
import { useLang, useT } from '../../i18n/context';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ToastProvider';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import type { PolicyType } from '../../types/api';

const POLICY_LABELS: Record<PolicyType, Record<string, string>> = {
  privacy: { en: 'Privacy Policy', ru: 'Политика конфиденциальности', tr: 'Gizlilik Politikası' },
  terms:   { en: 'Terms of Service', ru: 'Условия использования', tr: 'Kullanım Şartları' },
  cookies: { en: 'Cookie Policy', ru: 'Политика cookies', tr: 'Çerez Politikası' },
};

const FALLBACK_NOTICES: Record<string, string> = {
  ru: 'Перевод скоро будет доступен — показывается английская версия.',
  tr: 'Çeviri yakında — şimdilik İngilizce gösteriliyor.',
};

const LEGAL_BREADCRUMB: Record<string, string> = {
  en: 'Legal', ru: 'Документы', tr: 'Yasal',
};

interface LegalPageProps {
  type: PolicyType;
}

const LegalPage: React.FC<LegalPageProps> = ({ type }) => {
  const { data: policy, isLoading, isError } = useActivePolicy(type);
  const { lang } = useLang();
  const t = useT();
  const { user } = useAuth();
  const { data: acceptances } = useUserAcceptances();
  const acceptMutation = useAcceptPolicy();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const title = POLICY_LABELS[type][lang] ?? POLICY_LABELS[type].en;
  // Backend has content_en + content_ru. TR falls back to EN with notice.
  const content = (lang === 'ru' && policy?.content_ru)
    ? policy.content_ru
    : policy?.content_en ?? '';
  const showFallback = (lang === 'ru' && !policy?.content_ru) || lang === 'tr';

  // Re-acceptance gate: only surface the sticky bottom CTA for an authenticated
  // user who has accepted an OLDER version of this exact policy type. Anonymous
  // visitors and up-to-date users see the page in pure read mode (no CTA).
  const myAcceptance = acceptances?.find(a => a.policy_type === type);
  const isOutdated = Boolean(
    user && policy && myAcceptance && myAcceptance.policy_version !== policy.version
  );

  const handleAccept = async () => {
    if (!policy) return;
    try {
      await acceptMutation.mutateAsync(policy.id);
      // Invalidate the list so the badge in Settings disappears immediately
      // instead of waiting on the 5-min staleTime.
      qc.invalidateQueries({ queryKey: ['legal', 'acceptances'] });
      showToast(t.legal.acceptanceRecorded, 'success');
      // Send user back to Settings — that's where they came from and the
      // updated badge state is most visible there.
      navigate('/settings');
    } catch {
      showToast(t.legal.acceptanceFailed, 'error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F4F1' }}>
      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          <Link to="/" style={{ color: 'var(--muted)', textDecoration: 'none' }}>EnduranceAI</Link>
          <span>›</span>
          <span>{LEGAL_BREADCRUMB[lang] ?? LEGAL_BREADCRUMB.en}</span>
          <span>›</span>
          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{title}</span>
        </div>
        <LanguageSwitcher variant="mini" />
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px', paddingBottom: isOutdated ? 180 : 80 }}>
        {isLoading && (
          <div style={{ height: 400, background: 'var(--border-soft)', borderRadius: 12, animation: 'pulse 1.5s ease-in-out infinite' }} />
        )}

        {isError && (
          <div style={{ padding: '20px 24px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, color: 'var(--danger)', fontSize: 14 }}>
            Failed to load policy. Please try again.
          </div>
        )}

        {policy && (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
                Version {policy.version} · Effective {new Date(policy.effective_date).toLocaleDateString(lang, { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>

            {/* Outdated-acceptance banner shown at the TOP so the user knows
                why we're prompting them, even before they scroll. */}
            {isOutdated && myAcceptance && (
              <div style={{
                marginBottom: 20, padding: '14px 16px',
                background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10,
                fontSize: 13.5, color: '#92400E', lineHeight: 1.5,
              }}>
                <strong style={{ display: 'block', marginBottom: 2 }}>
                  {t.legal.outdatedTitle}
                </strong>
                {t.legal.outdatedBody(myAcceptance.policy_version, policy.version)}
              </div>
            )}

            {showFallback && (
              <div style={{ marginBottom: 20, padding: '10px 14px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: 13, color: '#92400E' }}>
                {FALLBACK_NOTICES[lang] ?? 'Translation coming soon — displaying English instead.'}
              </div>
            )}

            <PolicyRenderer content={content} />

            {/* Footer contact */}
            <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border)', fontSize: 13, color: 'var(--muted)' }}>
              Questions? Contact{' '}
              <a href="mailto:privacy@endurance.yuzapp.space" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                privacy@endurance.yuzapp.space
              </a>
            </div>
          </>
        )}
      </div>

      {/* Sticky bottom CTA — only for logged-in users with an outdated
          acceptance. Sits above the cookie consent banner (zIndex 1100). */}
      {isOutdated && policy && (
        <div
          role="region"
          aria-label={t.legal.acceptanceRegionLabel}
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 900,
            background: '#fff', borderTop: '1px solid var(--border)',
            boxShadow: '0 -8px 24px -8px rgba(15,23,42,0.12)',
            padding: '16px 24px',
          }}
        >
          <div style={{
            maxWidth: 720, margin: '0 auto',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13.5,
              color: 'var(--text)', cursor: 'pointer', lineHeight: 1.5,
            }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{ marginTop: 3, accentColor: 'var(--primary)', width: 16, height: 16 }}
              />
              <span>{t.legal.acceptanceCheckbox(policy.version)}</span>
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
              <Link to="/settings" style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}>
                {t.legal.acceptanceCancel}
              </Link>
              <button
                type="button"
                onClick={handleAccept}
                disabled={!agreed || acceptMutation.isPending}
                className="btn btn-coral"
                style={{ minWidth: 180, justifyContent: 'center', opacity: !agreed ? 0.55 : 1 }}
              >
                {acceptMutation.isPending
                  ? t.legal.acceptanceSubmitting
                  : t.legal.acceptanceButton(policy.version)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalPage;
