import React from 'react';
import { useT } from '../i18n/context';
import {
  useCurrentMetrics, useVdotHistory, useGoalProgress,
  useWeeklyVolume, useConsistency, useHrEfficiency, useZonesDist, useRecords,
  useBestEfforts, useBlockCompare, usePredictionAccuracy,
} from '../hooks/useMetrics';
import ComingSoon from '../components/ComingSoon';

const ZONE_META: { key: string; color: string }[] = [
  { key: 'E', color: '#10B981' },
  { key: 'M', color: '#1E1B4B' },
  { key: 'T', color: '#F59E0B' },
  { key: 'I', color: '#DC2626' },
  { key: 'R', color: '#F97066' },
];

// ── helpers ───────────────────────────────────────────────────────────
function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function signed(n: number, unit = ''): string {
  return `${n > 0 ? '+' : ''}${n}${unit}`;
}

const Sk: React.FC<{ h: number }> = ({ h }) => (
  <div style={{ height: h, borderRadius: 12, background: 'var(--border-soft)', border: '1px solid var(--border)' }} />
);

// ── generic mini line chart (responsive width via viewBox) ─────────────
interface LinePoint { label: string; value: number }
const LineChart: React.FC<{
  points: LinePoint[];
  color?: string;
  target?: number | null;     // optional flat reference line
  invertColor?: boolean;      // for time: lower = better (target line green)
  formatY?: (v: number) => string;
}> = ({ points, color = '#4F46E5', target = null, formatY }) => {
  const W = 560, H = 180, padX = 10, padTop = 14, padBot = 24;
  if (points.length === 0) return null;

  const ys = points.map(p => p.value).concat(target != null ? [target] : []);
  let lo = Math.min(...ys), hi = Math.max(...ys);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12;
  lo -= pad; hi += pad;

  const innerW = W - padX * 2;
  const innerH = H - padTop - padBot;
  const x = (i: number) => padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
  const y = (v: number) => padTop + innerH * (1 - (v - lo) / (hi - lo));

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const showEvery = Math.ceil(points.length / 6);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      {[0, 0.5, 1].map((tv, i) => (
        <line key={i} x1={padX} x2={W - padX} y1={padTop + innerH * tv} y2={padTop + innerH * tv}
              stroke="#F1EFEC" strokeWidth="1" />
      ))}
      {target != null && (
        <line x1={padX} x2={W - padX} y1={y(target)} y2={y(target)}
              stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 4" />
      )}
      <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r={i === points.length - 1 ? 4 : 2.5}
                fill={color} />
      ))}
      {points.map((p, i) => (
        (i % showEvery === 0 || i === points.length - 1) ? (
          <text key={`l${i}`} x={x(i)} y={H - 8} textAnchor="middle"
                fontFamily="Geist Mono, monospace" fontSize="9" fill="var(--muted)">
            {p.label.replace(/^\d{4}-/, '')}
          </text>
        ) : null
      ))}
      {formatY && (
        <text x={x(points.length - 1)} y={y(points[points.length - 1].value) - 8}
              textAnchor="end" fontFamily="Geist Mono, monospace" fontSize="10" fontWeight="600" fill={color}>
          {formatY(points[points.length - 1].value)}
        </text>
      )}
    </svg>
  );
};

// ── weekly volume bars ─────────────────────────────────────────────────
const VolumeBars: React.FC<{ points: { week: string; km: number }[] }> = ({ points }) => {
  const W = 560, H = 180, padX = 10, padTop = 14, padBot = 24;
  if (points.length === 0) return null;
  const max = Math.max(...points.map(p => p.km), 1);
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBot;
  const bw = innerW / points.length - 4;
  const showEvery = Math.ceil(points.length / 6);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} style={{ display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((tv, i) => (
        <line key={i} x1={padX} x2={W - padX} y1={padTop + innerH * (1 - tv)} y2={padTop + innerH * (1 - tv)}
              stroke="#F1EFEC" strokeWidth="1" />
      ))}
      {points.map((p, i) => {
        const barH = (p.km / max) * innerH;
        const x = padX + i * (innerW / points.length);
        const last = i === points.length - 1;
        return (
          <g key={p.week}>
            <rect x={x + 2} y={padTop + innerH - barH} width={bw} height={barH} rx="2"
                  fill="#4F46E5" opacity={last ? 1 : 0.55} />
            {(i % showEvery === 0 || last) && (
              <text x={x + 2 + bw / 2} y={H - 8} textAnchor="middle"
                    fontFamily="Geist Mono, monospace" fontSize="9" fill="var(--muted)">
                {p.week.replace(/^\d{4}-/, '')}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ── intensity-zone stacked bar ─────────────────────────────────────────
const ZoneBar: React.FC<{ dist: Record<string, number> }> = ({ dist }) => {
  const total = ZONE_META.reduce((s, z) => s + (dist[z.key] || 0), 0);
  if (total <= 0) return null;
  return (
    <div>
      <div style={{ display: 'flex', height: 18, borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {ZONE_META.map(z => {
          const pct = dist[z.key] || 0;
          return pct > 0
            ? <div key={z.key} title={`${z.key} ${pct}%`} style={{ width: `${pct}%`, background: z.color }} />
            : null;
        })}
      </div>
      <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap' }}>
        {ZONE_META.map(z => (
          <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: z.color }} />
            <span className="mono" style={{ fontSize: 11, color: 'var(--muted)' }}>
              {z.key} {Math.round(dist[z.key] || 0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const Tile: React.FC<{ label: string; value: React.ReactNode; sub?: string; accent?: string }> =
  ({ label, value, sub, accent }) => (
  <div className="card" style={{ padding: 16, flex: 1, minWidth: 130 }}>
    <div className="label-sm">{label}</div>
    <div className="mono" style={{ fontSize: 26, fontWeight: 600, color: accent ?? 'var(--text)', marginTop: 6, lineHeight: 1 }}>
      {value}
    </div>
    {sub && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
  </div>
);

const CardShell: React.FC<{ title: string; sub?: string; children: React.ReactNode }> =
  ({ title, sub, children }) => (
  <div className="card" style={{ padding: 18 }}>
    <div style={{ marginBottom: 10 }}>
      <div className="label-sm">{title}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{sub}</div>}
    </div>
    {children}
  </div>
);

const Analytics: React.FC = () => {
  const t = useT();
  const a = t.analytics;
  const [weeks, setWeeks] = React.useState(12);
  const current = useCurrentMetrics();
  const vdot = useVdotHistory();
  const goal = useGoalProgress();
  const volume = useWeeklyVolume(weeks);
  const consistency = useConsistency();
  const hr = useHrEfficiency();
  const zones = useZonesDist(weeks);
  const records = useRecords();
  const bestEfforts = useBestEfforts();
  const blocks = useBlockCompare(4);
  const predAcc = usePredictionAccuracy();

  const zonesTotal = zones.data
    ? ZONE_META.reduce((s, z) => s + (zones.data![z.key] || 0), 0) : 0;

  const loading = current.isLoading || vdot.isLoading || volume.isLoading;
  const hasData = (vdot.data?.length ?? 0) > 0 || (volume.data?.length ?? 0) > 0;

  // Freshness label from TSB
  const tsb = current.data?.tsb ?? null;
  const freshness = tsb == null ? null
    : tsb > 5 ? { label: a.freshFresh, color: '#10B981' }
    : tsb < -10 ? { label: a.freshFatigued, color: '#F59E0B' }
    : { label: a.freshNeutral, color: 'var(--muted)' };

  const goalStatusLabel: Record<string, string> = {
    ahead: a.statusAhead, on_track: a.statusOnTrack,
    slightly_behind: a.statusSlightlyBehind, behind: a.statusBehind,
  };

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Sk h={64} /><Sk h={200} /><Sk h={200} />
      </div>
    );
  }

  // No activities yet → keep the aspirational ComingSoon-style empty state
  if (!hasData) {
    return (
      <ComingSoon
        title={a.title}
        tagline={a.needData}
        bullets={[a.fitnessSub, a.goalSub, a.volumeSub, a.consistencyTitle]}
        cta={{ label: t.nav.activities, to: '/activities' }}
      />
    );
  }

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{a.title}</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{a.subtitle}</div>
        </div>
        {/* Period selector — controls weekly volume + intensity mix windows */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="label-sm">{a.periodLabel}</span>
          <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            {[8, 12, 26].map(n => (
              <button key={n} onClick={() => setWeeks(n)}
                style={{
                  border: 'none', cursor: 'pointer', padding: '6px 12px', fontSize: 12.5, fontWeight: 600,
                  background: weeks === n ? '#4F46E5' : '#fff',
                  color: weeks === n ? '#fff' : 'var(--muted)',
                }}>
                {n} {a.weeksShort}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Tile label={a.fitnessTitle}
              value={current.data?.vdot != null ? Math.round(current.data.vdot) : '—'}
              accent="#4F46E5" />
        {freshness && (
          <Tile label={a.freshnessTitle} value={freshness.label}
                sub={tsb != null ? `TSB ${tsb > 0 ? '+' : ''}${Math.round(tsb)}` : undefined}
                accent={freshness.color} />
        )}
        <Tile label={a.runsPerWeek}
              value={consistency.data?.runs_per_week ?? '—'} />
        <Tile label={a.streak}
              value={consistency.data?.current_week_streak ?? 0}
              sub={a.streakUnit} accent="#10B981" />
        {consistency.data?.adherence_pct != null && (
          <Tile label={a.adherence} value={`${consistency.data.adherence_pct}%`} />
        )}
      </div>

      {/* Fitness trend */}
      <CardShell title={a.fitnessTitle} sub={a.fitnessSub}>
        {vdot.data && vdot.data.length > 0
          ? <LineChart points={vdot.data.map(p => ({ label: p.week, value: p.vdot }))} color="#4F46E5" />
          : <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{a.needData}</div>}
      </CardShell>

      {/* Goal progress */}
      {goal.data?.available && goal.data.series && goal.data.series.length > 0 ? (
        <CardShell
          title={a.goalTitle}
          sub={goal.data.status ? `${a.goalSub} · ${goalStatusLabel[goal.data.status] ?? ''}` : a.goalSub}
        >
          <LineChart
            points={goal.data.series.map(p => ({ label: p.week, value: p.projected_sec }))}
            color="#1E1B4B"
            target={goal.data.target_sec ?? null}
            formatY={fmtTime}
          />
          <div style={{ display: 'flex', gap: 18, marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
            <span><span style={{ color: '#10B981', fontWeight: 600 }}>—— </span>{a.goalTarget}: <span className="mono">{goal.data.target_sec ? fmtTime(goal.data.target_sec) : '—'}</span></span>
            <span><span style={{ color: '#1E1B4B', fontWeight: 600 }}>—— </span>{a.goalProjected}</span>
          </div>
        </CardShell>
      ) : (
        <CardShell title={a.goalTitle} sub={a.goalSub}>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{a.noTarget}</div>
        </CardShell>
      )}

      {/* Weekly volume */}
      <CardShell title={a.volumeTitle} sub={a.volumeSub}>
        {volume.data && volume.data.length > 0
          ? <VolumeBars points={volume.data.map(p => ({ week: p.week, km: p.km }))} />
          : <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{a.needData}</div>}
      </CardShell>

      {/* Intensity mix (zones) — only when there's HR-zone data */}
      {zonesTotal > 0 && zones.data && (
        <CardShell title={a.zonesTitle} sub={a.zonesSub}>
          <ZoneBar dist={zones.data} />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
            {a.zoneEasyLabel}: <span className="mono" style={{ color: '#10B981', fontWeight: 600 }}>{Math.round(zones.data.E || 0)}%</span> <span style={{ color: 'var(--muted-2)' }}>(~80%)</span>
          </div>
        </CardShell>
      )}

      {/* Aerobic efficiency — only when the runner logs heart rate */}
      {hr.data && hr.data.length > 1 && (
        <CardShell title={a.hrTitle} sub={a.hrSub}>
          <LineChart points={hr.data.map(p => ({ label: p.week, value: p.efficiency }))} color="#DC2626" />
        </CardShell>
      )}

      {/* Personal bests — best efforts (from splits) + milestones */}
      {records.data && records.data.total_runs > 0 && (
        <div>
          <div className="label-sm" style={{ marginBottom: 10 }}>{a.recordsTitle}</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {bestEfforts.data?.['5k'] && (
              <Tile label="5 km" value={fmtTime(bestEfforts.data['5k']!.time_sec)}
                    sub={bestEfforts.data['5k']!.date} accent="#4F46E5" />
            )}
            {bestEfforts.data?.['10k'] && (
              <Tile label="10 km" value={fmtTime(bestEfforts.data['10k']!.time_sec)}
                    sub={bestEfforts.data['10k']!.date} accent="#4F46E5" />
            )}
            {bestEfforts.data?.half && (
              <Tile label={a.halfLabel} value={fmtTime(bestEfforts.data.half!.time_sec)}
                    sub={bestEfforts.data.half!.date} accent="#4F46E5" />
            )}
            <Tile label={a.recLongest} value={`${records.data.longest_run_km} km`} />
            <Tile label={a.recTotal} value={`${records.data.total_distance_km} km`} />
            <Tile label={a.recRuns} value={records.data.total_runs} accent="#10B981" />
          </div>
        </div>
      )}

      {/* Block comparison — current 4-wk block vs the previous one */}
      {blocks.data && (blocks.data.current.runs > 0 || blocks.data.previous.runs > 0) && (
        <CardShell title={a.blockTitle} sub={a.blockSub}>
          {([
            { label: a.blockKm, cur: blocks.data.current.km, prev: blocks.data.previous.km, unit: '' },
            { label: a.blockRuns, cur: blocks.data.current.runs, prev: blocks.data.previous.runs, unit: '' },
            { label: a.blockLongest, cur: blocks.data.current.longest_km, prev: blocks.data.previous.longest_km, unit: '' },
            { label: a.fitnessTitle, cur: blocks.data.current.avg_vdot ?? 0, prev: blocks.data.previous.avg_vdot ?? 0, unit: '' },
          ]).map((r) => {
            const d = Math.round((r.cur - r.prev) * 10) / 10;
            const color = d > 0 ? '#10B981' : d < 0 ? '#DC2626' : 'var(--muted)';
            return (
              <div key={r.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, padding: '7px 0', borderTop: '1px solid var(--border-soft)', alignItems: 'baseline' }}>
                <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{r.label}</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', minWidth: 48, textAlign: 'right' }}>{r.cur}</span>
                <span className="mono" style={{ fontSize: 12, color: 'var(--muted-2)', minWidth: 48, textAlign: 'right' }}>{r.prev}</span>
                <span className="mono" style={{ fontSize: 12, fontWeight: 600, color, minWidth: 48, textAlign: 'right' }}>{signed(d)}</span>
              </div>
            );
          })}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, marginTop: 6, fontSize: 10.5, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            <span /><span style={{ textAlign: 'right', minWidth: 48 }}>{a.blockCurrent}</span><span style={{ textAlign: 'right', minWidth: 48 }}>{a.blockPrev}</span><span style={{ textAlign: 'right', minWidth: 48 }}>Δ</span>
          </div>
        </CardShell>
      )}

      {/* Prediction vs actual — only once a race has been completed */}
      {predAcc.data && predAcc.data.length > 0 && (
        <CardShell title={a.predTitle} sub={a.predSub}>
          {predAcc.data.map((row, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border-soft)', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.marathon_name ?? '—'}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--muted-2)' }}>{row.race_date}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'baseline' }}>
                <div style={{ textAlign: 'right' }}>
                  <div className="label-sm" style={{ fontSize: 9.5 }}>{a.predPredicted}</div>
                  <div className="mono" style={{ fontSize: 12.5 }}>{row.predicted_sec != null ? fmtTime(row.predicted_sec) : '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="label-sm" style={{ fontSize: 9.5 }}>{a.predActual}</div>
                  <div className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{fmtTime(row.actual_sec)}</div>
                </div>
                {row.delta_sec != null && (
                  <div className="mono" style={{ fontSize: 12, fontWeight: 600, minWidth: 56, textAlign: 'right', color: row.delta_sec <= 0 ? '#10B981' : '#DC2626' }}>
                    {row.delta_sec > 0 ? '+' : '−'}{fmtTime(Math.abs(row.delta_sec))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardShell>
      )}
    </div>
  );
};

export default Analytics;
