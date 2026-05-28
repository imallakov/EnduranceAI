import React from 'react';
import { IconChevRight } from '../icons';
import { exportPlanPDF, exportPlanCSV } from '../../api/plans';

const ITEMS = [
  { label: 'Export as PDF',  sub: 'Print-ready, week-per-page',  icon: 'PDF', accent: '#DC2626', action: 'pdf' },
  { label: 'Export as CSV',  sub: 'Raw workouts · 16 weeks',     icon: 'CSV', accent: '#10B981', action: 'csv' },
  { label: 'Sync to Garmin', sub: 'Push as structured workouts', icon: '↗',   accent: '#4F46E5', action: null },
  { label: 'Calendar (.ics)',sub: 'Subscribe in Apple / Google', icon: 'ICS', accent: '#F59E0B', action: null },
] as const;

interface ExportMenuProps {
  planId: string;
  onClose: () => void;
}

const ExportMenu: React.FC<ExportMenuProps> = ({ planId, onClose }) => {
  const handle = async (action: string | null) => {
    if (!action) return;
    if (action === 'pdf') await exportPlanPDF(planId);
    if (action === 'csv') await exportPlanCSV(planId);
    onClose();
  };

  return (
    <div style={{
      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
      width: 280, background: '#fff', border: '1px solid var(--border)',
      borderRadius: 10, padding: 6,
      boxShadow: '0 12px 32px -8px rgba(15,23,42,0.14), 0 4px 12px -4px rgba(15,23,42,0.08)',
      zIndex: 20,
    }}>
      {ITEMS.map((it, i) => {
        const disabled = !it.action;
        return (
          <div
            key={i}
            onClick={() => void handle(it.action)}
            style={{
              display: 'grid', gridTemplateColumns: '36px 1fr auto', alignItems: 'center', columnGap: 10,
              padding: '9px 10px', borderRadius: 7,
              cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.45 : 1,
            }}
            onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLElement).style.background = 'var(--bg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 7,
              background: `${it.accent}14`, color: it.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10.5, fontWeight: 700, fontFamily: 'Geist Mono, monospace', letterSpacing: 0.4,
            }}>
              {it.icon}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{it.label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                {disabled ? <>{it.sub} <span style={{ color: 'var(--muted-2)' }}>· Coming soon</span></> : it.sub}
              </div>
            </div>
            <IconChevRight size={12} style={{ color: 'var(--muted-2)' }} />
          </div>
        );
      })}
    </div>
  );
};

export default ExportMenu;
