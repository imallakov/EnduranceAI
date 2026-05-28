import React from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  IconLogo, IconDashboard, IconActivity, IconPredict, IconPlan,
  IconRace, IconAnalytics, IconSettings, IconLogout, IconRefresh,
} from '../icons';
import { useAuth } from '../../hooks/useAuth';
import { useStravaStatus, useStravaSync } from '../../hooks/useStrava';
import LanguageSwitcher from '../LanguageSwitcher';
import { useT } from '../../i18n/context';

function formatAgo(iso: string | null): string {
  if (!iso) return '—';
  const ago = (Date.now() - new Date(iso).getTime()) / 1000;
  if (ago < 60) return `${Math.max(1, Math.round(ago))}s`;
  if (ago < 3600) return `${Math.round(ago / 60)}m`;
  if (ago < 86400) return `${Math.round(ago / 3600)}h`;
  return `${Math.round(ago / 86400)}d`;
}

interface NavItem {
  label: string;
  to: string;
  Icon: React.FC<{ size?: number; style?: React.CSSProperties; className?: string }>;
  badge?: string;
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ mobileOpen = false, onClose }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const NAV_ITEMS: NavItem[] = [
    { label: t.nav.dashboard, to: '/dashboard', Icon: IconDashboard },
    { label: t.nav.activities, to: '/activities', Icon: IconActivity },
    { label: t.nav.predictions, to: '/predictions', Icon: IconPredict },
    { label: t.nav.trainingPlan, to: '/plan', Icon: IconPlan, badge: 'NEW' },
    { label: t.nav.marathons, to: '/marathons', Icon: IconRace },
    { label: t.nav.analytics, to: '/analytics', Icon: IconAnalytics },
  ];

  const BOTTOM_ITEMS: NavItem[] = [
    { label: t.nav.settings, to: '/settings', Icon: IconSettings },
  ];

  const handleLogout = async () => {
    onClose?.();
    await logout();
    navigate('/login', { replace: true });
  };

  const marathonName = user?.target_marathon_name ?? 'No race set';

  return (
    <aside
      className={mobileOpen ? 'sidebar-wrap mob-open' : 'sidebar-wrap'}
      style={{
        width: 240, flexShrink: 0, background: '#FAFAF9',
        borderRight: '1px solid var(--border)', padding: '20px 14px',
        display: 'flex', flexDirection: 'column',
        position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px 22px' }}>
        <IconLogo size={22} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--primary)', letterSpacing: -0.2 }}>EnduranceAI</span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)', letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            Pro · {marathonName}
          </span>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ marginBottom: 18 }}>
        <div className="label-sm" style={{ padding: '4px 10px 8px', fontSize: 10.5 }}>{t.plan.workspace}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(({ label, to, Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) => `nav-row${isActive ? ' active' : ''}`}
              onClick={onClose}
            >
              <Icon size={15} />
              <span style={{ flex: 1 }}>{label}</span>
              {badge && (
                <span className="pill pill-soft-indigo" style={{ height: 17, padding: '0 6px', fontSize: 10 }}>
                  {badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '0 6px 14px' }} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {BOTTOM_ITEMS.map(({ label, to, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `nav-row${isActive ? ' active' : ''}`} onClick={onClose}>
            <Icon size={15} />
            <span style={{ flex: 1 }}>{label}</span>
          </NavLink>
        ))}
        <div className="nav-row" style={{ cursor: 'pointer' }} onClick={() => void handleLogout()}>
          <IconLogout size={15} />
          <span style={{ flex: 1 }}>{t.nav.signOut}</span>
        </div>
      </div>

      {/* Language switcher — mini */}
      <div style={{ marginTop: 'auto', marginBottom: 10, padding: '0 6px' }}>
        <LanguageSwitcher variant="mini" align="left" direction="up" />
      </div>

      {/* Strava sync widget — real connection status, not the old hardcoded "Garmin live" mock */}
      <StravaSyncWidget t={t} />
    </aside>
  );
};

interface StravaSyncWidgetProps {
  t: ReturnType<typeof useT>;
}

const StravaSyncWidget: React.FC<StravaSyncWidgetProps> = ({ t }) => {
  const { data: status, isLoading } = useStravaStatus();
  const syncMut = useStravaSync();
  const connected = status?.connected === true;
  const broken = status?.is_broken === true;
  const indicatorColor = broken ? 'var(--warning)' : 'var(--success)';

  return (
    <div>
      <div style={{
        border: '1px solid var(--border)', borderRadius: 10, padding: 12,
        background: '#fff', display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="label-sm" style={{ fontSize: 10 }}>STRAVA</span>
          {connected && (
            <span className="mono" style={{ fontSize: 10, color: indicatorColor }}>
              ● {broken ? 'broken' : 'live'}
            </span>
          )}
        </div>

        {isLoading ? (
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>…</div>
        ) : !connected ? (
          <Link to="/settings" style={{ fontSize: 12, color: 'var(--primary-2)', textDecoration: 'none', fontWeight: 500 }}>
            Connect →
          </Link>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status?.athlete_username ? `@${status.athlete_username}` : 'connected'} · last <span className="mono" style={{ color: 'var(--text)' }}>{formatAgo(status?.last_sync_at ?? null)}</span> ago
          </div>
        )}

        {connected && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="btn btn-ghost"
              style={{ height: 28, padding: '0 10px', fontSize: 12, flex: 1 }}
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
            >
              <IconRefresh size={12} /> {syncMut.isPending ? '…' : t.strava.syncNow}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
