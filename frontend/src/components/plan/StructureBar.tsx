import React from 'react';
import type { PlanWorkout } from '../../types/api';
import { WORKOUT_COLORS } from './WorkoutIcon';

// ── Segment shapes ────────────────────────────────────────────────────
export interface GenericSegment {
  kind: 'easy' | 'tempo' | 'long' | 'marathon_pace' | 'repetition';
  km: number;
  label?: string;
  pace?: string;
}

export interface IntervalSegment {
  kind: 'interval';
  km: number;
  reps: number;
  rep_m: number;
  recovery: string;
  pace?: string;
}

export type StructureSegment = GenericSegment | IntervalSegment;

// Convert backend JSON structure → display segments
export function parseStructure(workout: PlanWorkout): StructureSegment[] | null {
  const s = workout.structure as Record<string, unknown>;
  const wtype = workout.workout_type;
  const dist = Number(workout.distance_km ?? 0);

  if (wtype === 'tempo' && 'warmup_km' in s) {
    const warmup = Number(s['warmup_km'] ?? 2);
    const tempo  = Number(s['tempo_km']  ?? Math.max(0, dist - 4));
    const cd     = Number(s['cooldown_km'] ?? 2);
    return [
      { kind: 'easy',  km: warmup, label: 'Warmup',    pace: s['easy_pace'] as string | undefined },
      { kind: 'tempo', km: tempo,  label: 'Threshold', pace: s['tempo_pace'] as string | undefined },
      { kind: 'easy',  km: cd,     label: 'Cooldown',  pace: s['easy_pace'] as string | undefined },
    ];
  }

  if (wtype === 'interval' && 'intervals' in s) {
    const intervals = s['intervals'] as Array<{ reps: number; dist_m: number; pace: string }>;
    if (!intervals?.length) return null;
    const { reps, dist_m, pace } = intervals[0];
    const recovery = (s['recovery'] as string | undefined) ?? '90s jog';
    const warmup = 2, cd = 2;
    return [
      { kind: 'easy',     km: warmup, label: 'Warmup' },
      { kind: 'interval', km: (reps * dist_m) / 1000, reps, rep_m: dist_m, recovery, pace },
      { kind: 'easy',     km: cd,     label: 'Cooldown' },
    ];
  }

  if (wtype === 'long' && Array.isArray(s['zones']) && (s['zones'] as string[]).includes('M')) {
    const easyKm = Math.round(dist * 0.7);
    // Round to .1 to avoid IEEE-754 floating-point artifacts (e.g. 18.8 - 13 = 5.800000000000001)
    const mKm    = Math.round((dist - easyKm) * 10) / 10;
    return [
      { kind: 'easy',          km: easyKm, label: 'Easy' },
      { kind: 'marathon_pace', km: mKm,    label: 'Marathon pace' },
    ];
  }

  return null;
}

// ── Rendering ─────────────────────────────────────────────────────────
interface StructureBarProps {
  workout: PlanWorkout;
  segments?: StructureSegment[] | null;
  height?: number;
  totalKm?: number;
}

const StructureBar: React.FC<StructureBarProps> = ({ workout, segments, height = 8, totalKm }) => {
  const segs = segments ?? parseStructure(workout);
  if (!segs || segs.length === 0) return null;

  const total = totalKm ?? Number(workout.distance_km ?? 1);

  if (workout.workout_type === 'interval') {
    const [wu, repSeg, cd] = segs;
    if (!('reps' in repSeg)) return null;
    const middle = total - (wu.km ?? 0) - (cd?.km ?? 0);
    const repKm  = (repSeg.reps * repSeg.rep_m) / 1000;
    const recoveryKm = Math.max((middle - repKm) / Math.max(repSeg.reps - 1, 1), 0);
    return (
      <div style={{ display: 'flex', height, width: '100%', borderRadius: 4, overflow: 'hidden', background: '#F1EFEC' }}>
        <div style={{ flex: wu.km, background: WORKOUT_COLORS.easy, opacity: 0.35 }} />
        {Array.from({ length: repSeg.reps }, (_, i) => (
          <React.Fragment key={i}>
            <div style={{ flex: repSeg.rep_m / 1000, background: WORKOUT_COLORS.interval }} />
            {i < repSeg.reps - 1 && <div style={{ flex: recoveryKm, background: '#E7E5E4' }} />}
          </React.Fragment>
        ))}
        <div style={{ flex: cd?.km ?? 2, background: WORKOUT_COLORS.easy, opacity: 0.35 }} />
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height, width: '100%', borderRadius: 4, overflow: 'hidden', background: '#F1EFEC' }}>
      {segs.map((seg, i) => (
        <div key={i} style={{
          flex: seg.km,
          background: WORKOUT_COLORS[seg.kind as keyof typeof WORKOUT_COLORS] ?? '#94A3B8',
          opacity: seg.kind === 'easy' ? 0.35 : 0.95,
        }} />
      ))}
    </div>
  );
};

export default StructureBar;
