import React from 'react';
import { Link } from 'react-router-dom';
import { useActivePolicy } from '../../hooks/useLegal';
import { PolicyRenderer } from '../../components/legal/PolicyRenderer';
import { useLang } from '../../i18n/context';
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

  const title = POLICY_LABELS[type][lang] ?? POLICY_LABELS[type].en;
  // Backend has content_en + content_ru. TR falls back to EN with notice.
  const content = (lang === 'ru' && policy?.content_ru)
    ? policy.content_ru
    : policy?.content_en ?? '';
  const showFallback = (lang === 'ru' && !policy?.content_ru) || lang === 'tr';

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
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
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
    </div>
  );
};

export default LegalPage;
