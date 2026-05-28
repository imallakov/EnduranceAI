import React from 'react';
import { IconPlan } from '../icons';
import { PHASES } from './PhaseStrip';
import { useT } from '../../i18n/context';

interface EmptyPlanStateProps {
  onGenerate: () => void;
}

const EmptyPlanState: React.FC<EmptyPlanStateProps> = ({ onGenerate }) => {
  const t = useT();
  const ratios = [0, 0.20, 0.45, 0.75, 1].map(r => 40 + r * 640);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 720, padding: '40px 40px 64px', borderRadius: 16,
        background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
        color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 24px 60px -20px rgba(30,27,75,0.45)',
      }}>
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.9, textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>
            {t.plan.emptyBadge}
          </div>
          <h2 style={{ margin: '10px 0 0', fontSize: 34, fontWeight: 600, letterSpacing: -0.8, lineHeight: 1.15 }}>
            {t.plan.emptyTitle}
          </h2>
          <p style={{ margin: '14px 0 0', fontSize: 13.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55, maxWidth: 520 }}>
            {t.plan.emptyDescription}
          </p>

          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <button
              className="btn btn-coral"
              style={{ height: 42, padding: '0 18px', fontSize: 13.5 }}
              onClick={onGenerate}
            >
              <IconPlan size={14} /> {t.plan.generateYourPlan}
            </button>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
              {t.plan.takes8seconds} <span className="mono" style={{ color: '#fff' }}>8 {t.plan.seconds}</span> · {t.plan.adjustableAnyTime}
            </span>
          </div>
        </div>

        {/* Decorative mini phase strip — at the bottom, BELOW the CTA row */}
        <svg viewBox="0 0 720 24" preserveAspectRatio="none" style={{
          position: 'absolute', left: 0, right: 0, bottom: 22,
          width: '100%', height: 24, opacity: 0.85, pointerEvents: 'none',
        }}>
          {PHASES.map((p, i) => (
            <rect key={p.id}
                  x={ratios[i]} y="9"
                  width={ratios[i + 1] - ratios[i] - 2} height="6" rx="3"
                  fill={p.color} opacity="0.85" />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <circle key={i} cx={40 + ((i + 0.5) / 16) * 640} cy="12" r="1.5" fill="rgba(255,255,255,0.55)" />
          ))}
        </svg>
      </div>
    </div>
  );
};

export default EmptyPlanState;
