import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconChevRight, IconBell, IconMenu } from '../icons';
import { useAuth } from '../../hooks/useAuth';
import { useT } from '../../i18n/context';

interface TopBarProps {
  onBurgerClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onBurgerClick }) => {
  const { user } = useAuth();
  const t = useT();
  const location = useLocation();
  const navigate = useNavigate();

  const marathonName = user?.target_marathon_name || t.plan.noTargetRaceSet;
  const initials = user?.first_name && user?.last_name 
    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    : 'U';

  let pageName = t.nav.dashboard;
  if (location.pathname.startsWith('/activities')) pageName = t.nav.activities;
  else if (location.pathname.startsWith('/predictions')) pageName = t.nav.predictions;
  else if (location.pathname.startsWith('/plan')) pageName = t.nav.trainingPlan;
  else if (location.pathname.startsWith('/marathons')) pageName = t.nav.marathons;
  else if (location.pathname.startsWith('/analytics')) pageName = t.nav.analytics;
  else if (location.pathname.startsWith('/settings')) pageName = t.nav.settings;

  return (
    <div style={{
      height: 56, borderBottom: '1px solid var(--border)', background: '#fff',
      display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16,
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      {/* Burger — shown on mobile via CSS, hidden on desktop */}
      <button
        className="topbar-burger"
        onClick={onBurgerClick}
        aria-label="Open navigation"
      >
        <IconMenu size={20} />
      </button>

      {/* Breadcrumb — hidden on mobile via CSS */}
      <div className="topbar-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, color: 'var(--muted)' }}>
        <span>{t.plan.workspace}</span>
        <IconChevRight size={12} />
        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{marathonName}</span>
        <IconChevRight size={12} />
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{pageName}</span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Notifications */}
      <button className="btn btn-ghost" aria-label="Notifications" style={{ width: 32, padding: 0, justifyContent: 'center', position: 'relative' }}>
        <IconBell size={15} />
      </button>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 4 }}>
        <div 
          onClick={() => navigate('/settings')}
          style={{
            width: 30, height: 30, borderRadius: 15,
            background: 'linear-gradient(135deg, #1E1B4B, #4F46E5)',
            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11.5, fontWeight: 600, letterSpacing: 0.4, cursor: 'pointer',
          }}
          title={t.nav.settings}
        >
          {initials}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
