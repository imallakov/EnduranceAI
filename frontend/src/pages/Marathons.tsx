import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMarathons } from '../hooks/usePredictions';
import { useSetTargetMarathon } from '../hooks/useMarathonsExtra';
import { useAuth } from '../hooks/useAuth';
import AddCustomGPXModal from '../components/marathons/AddCustomGPXModal';
import DifficultyBar from '../components/marathon/DifficultyBar';
import MiniElevation from '../components/marathon/MiniElevation';
import MarathonMiniMap from '../components/marathon/MarathonMiniMap';
import LazyMarathonMiniMap from '../components/marathon/LazyMarathonMiniMap';
import type { Marathon } from '../types/api';
import { useT, useLang } from '../i18n/context';
import {
  getDiffKey, getDiffDots,
  getMarathonMonth, MONTH_NAMES, getAvgTemp,
  getMonthName, makeSyntheticProfile,
} from '../lib/marathonUtils';

// (Removed RouteSilhouetteSVG / RouteGlowSVG — replaced by real Leaflet tiles
//  via MarathonMiniMap component. Polyline import is still used elsewhere.)

// ── Featured Hero ─────────────────────────────────────────────────────
function FeaturedHero({
  marathon, isTarget, onSetTarget, isSettingTarget,
}: {
  marathon: Marathon;
  isTarget: boolean;
  onSetTarget: () => void;
  isSettingTarget: boolean;
}) {
  const t = useT();
  const coeff = Number(marathon.difficulty_coefficient);
  const gain = Math.round(Number(marathon.elevation_gain_m) || 0);
  const avgTemp = getAvgTemp(marathon);
  const monthName = getMonthName(marathon);
  const getDiffLabel = (c: number) => {
    const k = getDiffKey(c);
    return k === 'flat' ? t.marathons.difficultyFlat
         : k === 'mid'  ? t.marathons.difficultyRolling
         : k === 'hilly' ? t.marathons.difficultyHilly
         : t.marathons.difficultyTough;
  };

  return (
    <div className="featured-hero" style={{
      position: 'relative', height: 320, borderRadius: 16, overflow: 'hidden',
      border: '1px solid #4F46E5',
      background: 'linear-gradient(180deg, #1E1B4B 0%, #2A2566 100%)',
      boxShadow: '0 24px 60px -20px rgba(30,27,75,0.35)',
      display: 'grid', gridTemplateColumns: '7fr 5fr',
    }}>
      {/* LEFT — visual: real dark-themed map tiles under the route.
          height='100%' so the Leaflet container exactly matches the parent's
          rendered size — desktop renders ~320px from the grid, mobile shrinks
          to 180px via @media, and the map follows automatically. */}
      <div className="featured-hero-visual" style={{
        position: 'relative', minWidth: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <MarathonMiniMap
            encodedPolyline={marathon.polyline}
            height="100%"
            theme="dark"
            weight={3.5}
          />
        </div>
        {/* Subtle indigo wash to keep brand colour identity on top of dark tiles */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(circle at 50% 55%, rgba(79,70,229,0.18) 0%, rgba(30,27,75,0) 65%)',
        }} />
        {/* Badge */}
        <div style={{
          position: 'absolute', top: 18, left: 22, height: 22, padding: '0 9px',
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: '#F97066', color: '#fff', borderRadius: 6,
          fontSize: 10.5, fontWeight: 700, letterSpacing: 0.7, textTransform: 'uppercase',
        }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: '#fff' }} />
          {marathon.major ? t.marathons.worldMarathonMajor : t.marathons.featured}
        </div>
        {/* Country code chip — flag emoji removed for cross-platform consistency
            (Windows can't render regional indicator characters as flags). */}
        <div style={{
          position: 'absolute', top: 16, right: 22,
          display: 'inline-flex', alignItems: 'center',
          height: 24, padding: '0 10px',
          background: 'rgba(255,255,255,0.14)',
          border: '1px solid rgba(255,255,255,0.20)',
          borderRadius: 12,
          color: '#fff', fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6,
          fontFamily: 'ui-monospace, monospace',
        }}>
          {marathon.country}
        </div>
        {/* Weather chip — NO backdrop-filter */}
        <div style={{
          position: 'absolute', left: 22, bottom: 18, display: 'inline-flex', alignItems: 'center', gap: 8,
          height: 26, padding: '0 10px', borderRadius: 13,
          background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)',
          color: '#fff', fontSize: 11.5,
        }}>
          <span style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: 0.2 }}>
            {monthName} · {avgTemp} {t.marathons.avgLabel}
          </span>
        </div>
      </div>

      {/* RIGHT — info */}
      <div className="featured-hero-info" style={{ display: 'flex', flexDirection: 'column', padding: '26px 30px 24px', color: '#fff', minWidth: 0 }}>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: '#F97066', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 10 }}>
          {t.marathons.featured}{marathon.major ? ` · ${t.marathons.worldMarathonMajor}` : ''}
        </div>
        <h2 style={{ margin: 0, fontSize: 36, fontWeight: 700, color: '#fff', letterSpacing: -1, lineHeight: 1.04 }}>
          {marathon.name.toUpperCase()}
        </h2>
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, color: 'rgba(255,255,255,0.7)', marginTop: 10, letterSpacing: 0.3 }}>
          {marathon.city} · {marathon.country} · {monthName}
        </div>

        {/* 4-cell mini stats — stronger background so the panel reads as a
            single unit, not as transparent overlay bleeding into CTA below */}
        <div className="featured-hero-stats" style={{
          marginTop: 22, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          border: '1px solid rgba(255,255,255,0.14)', borderRadius: 10, overflow: 'hidden',
          background: 'rgba(15,23,42,0.45)',
          backdropFilter: 'blur(4px)',
        }}>
          {[
            { l: t.marathons.distanceStat, v: Number(marathon.distance_km).toFixed(1), s: 'km', sub: t.marathons.officialCourse },
            { l: t.marathons.elevationStat, v: `+${gain}`, s: 'm', sub: t.marathons.totalGainLabel },
            { l: t.marathons.difficultyStat, v: getDiffLabel(coeff), s: '', sub: `coeff ${coeff.toFixed(3)}` },
            { l: t.marathons.monthStat, v: monthName, s: '', sub: `${t.marathons.avgLabel} ${avgTemp}` },
          ].map((c, i) => (
            <div key={i} style={{
              padding: '12px 12px 12px 14px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.7, color: 'rgba(255,255,255,0.55)' }}>{c.l}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 17, fontWeight: 600, color: '#fff', letterSpacing: -0.4, lineHeight: 1 }}>{c.v}</span>
                {c.s && <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10.5, color: 'rgba(255,255,255,0.55)' }}>{c.s}</span>}
              </div>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', lineHeight: 1.25 }}>{c.sub}</span>
            </div>
          ))}
        </div>

        {/* CTA — fixed gap from stats panel (was margin-top: auto, which could
            collapse to zero when content tall, making stats and button blur
            into one block). 18px gives clear separation. */}
        <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {isTarget ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#10B981' }}>
              <span style={{
                width: 16, height: 16, borderRadius: 8, background: '#10B981',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontSize: 10 }}>✓</span>
              </span>
              <span style={{ color: 'rgba(255,255,255,0.7)' }}>{t.marathons.currentTargetRace}</span>
            </div>
          ) : (
            <button onClick={onSetTarget} disabled={isSettingTarget}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                height: 44, padding: '0 18px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: isSettingTarget ? 'rgba(249,112,102,0.5)' : '#F97066', color: '#fff',
                fontSize: 13.5, fontWeight: 600, fontFamily: 'inherit',
                boxShadow: '0 16px 40px -8px rgba(249,112,102,0.55)',
              }}>
              {isSettingTarget ? t.marathons.settingTarget : t.marathons.setAsMyTarget(marathon.name)} →
            </button>
          )}
          {/* "View details" — was rgba(255,255,255,0.75) which disappears on the
              dark tile background. Bright indigo with underline-on-hover so it
              clearly reads as a link. */}
          <Link to={`/marathons/${marathon.id}`}
            className="featured-hero-details-link"
            style={{
              alignSelf: 'flex-start', fontSize: 12.5,
              color: '#A5B4FC',
              textDecoration: 'none', fontWeight: 600,
              letterSpacing: 0.2,
            }}>
            {t.marathonDetail.viewDetails} →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────
interface FilterState {
  search: string;
  activeDiff: 'all' | 'flat' | 'mid' | 'hilly' | 'tough';
  activeMonths: number[];
  onlyCustom: boolean;
  sort: 'difficulty' | 'name' | 'elevation';
}
interface FilterBarProps {
  state: FilterState;
  onChange: (s: FilterState) => void;
  countries: string[];
  selectedCountries: string[];
  onCountryToggle: (code: string) => void;
}

function FilterBar({ state, onChange, countries, selectedCountries, onCountryToggle }: FilterBarProps) {
  const t = useT();
  const months = ['Any', ...MONTH_NAMES];
  const diffs: Array<[FilterState['activeDiff'], string]> = [
    ['all', t.marathons.difficultyAll],
    ['flat', t.marathons.difficultyFlat],
    ['mid', t.marathons.difficultyRolling],
    ['hilly', t.marathons.difficultyHilly],
    ['tough', t.marathons.difficultyTough],
  ];
  const [countryOpen, setCountryOpen] = useState(false);

  return (
    <div className="filter-bar-wrap" style={{
      padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10,
      background: '#fff', borderRadius: 12, border: '1px solid #E2E8F0', minWidth: 0,
      flexWrap: 'wrap', rowGap: 10,
    }}>
      {/* Search */}
      <div className="filter-bar-search" style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px',
        border: '1px solid #E2E8F0', borderRadius: 8, background: '#F8FAFC',
        width: 200, flexShrink: 0,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input value={state.search} onChange={e => onChange({ ...state, search: e.target.value })}
          placeholder={t.marathons.searchPlaceholder} style={{
            border: 'none', background: 'transparent', outline: 'none', flex: 1,
            fontSize: 12.5, color: '#0F172A', fontFamily: 'inherit',
          }} />
      </div>

      {/* Country dropdown */}
      <div className="filter-bar-country" style={{ position: 'relative', flexShrink: 0 }}>
        <button onClick={() => setCountryOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7, height: 34, padding: '0 11px',
            border: '1px solid #E2E8F0', borderRadius: 8, background: '#fff',
            fontSize: 12.5, cursor: 'pointer', color: '#0F172A', fontFamily: 'inherit',
          }}>
          {t.marathons.filterCountry}
          {selectedCountries.length > 0 && (
            <span style={{
              height: 18, padding: '0 6px', borderRadius: 4,
              background: '#EEF2FF', color: '#4F46E5', fontSize: 10, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center',
            }}>{selectedCountries.length}</span>
          )}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {countryOpen && (
          <div style={{
            // zIndex must be above Leaflet panes (which top out at 700 for
            // popups). Map tiles + polylines start at 200, so anything below
            // ~750 risks getting overlapped by a card map rendered later in
            // the DOM. 1000 is a safe ceiling shared with our toast/modal layer.
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 1000,
            background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10,
            boxShadow: '0 8px 24px -4px rgba(15,23,42,0.15)',
            padding: 8, minWidth: 180, maxHeight: 280, overflowY: 'auto',
          }}>
            {countries.map(code => (
              <label key={code} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px',
                borderRadius: 6, cursor: 'pointer', fontSize: 12.5, color: '#0F172A',
              }}>
                <input type="checkbox" checked={selectedCountries.includes(code)}
                  onChange={() => onCountryToggle(code)}
                  style={{ accentColor: '#4F46E5', width: 13, height: 13 }} />
                {/* Emoji flag intentionally omitted — on Windows/Linux without
                    an emoji-flag font it falls back to literal "DE", which
                    duplicates the ISO code shown next to it. */}
                <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, letterSpacing: 0.3 }}>{code}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="filter-bar-divider" style={{ width: 1, height: 22, background: '#E2E8F0', flexShrink: 0 }} />

      {/* Difficulty chips */}
      <div className="filter-bar-difficulty" style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
        {diffs.map(([k, l]) => {
          const isActive = state.activeDiff === k;
          return (
            <button key={k} onClick={() => onChange({ ...state, activeDiff: k })}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, height: 28, padding: '0 10px',
                borderRadius: 7, border: `1px solid ${isActive ? '#4F46E5' : '#E2E8F0'}`,
                background: isActive ? '#EEF2FF' : '#fff',
                color: isActive ? '#4F46E5' : '#0F172A',
                fontSize: 12, fontWeight: isActive ? 600 : 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              <span style={{
                width: 8, height: 8, borderRadius: 4,
                border: `1.5px solid ${isActive ? '#4F46E5' : '#CBD5E1'}`,
                background: isActive ? '#4F46E5' : 'transparent',
              }} />
              {l}
            </button>
          );
        })}
      </div>

      <div className="filter-bar-divider" style={{ width: 1, height: 22, background: '#E2E8F0', flexShrink: 0 }} />

      {/* Month chips — wrap to multiple rows if not enough horizontal space.
          Previously overflow: hidden hard-clipped to ~Jan-Apr + "M" of May.
          flex-basis: 360 prevents chips collapsing into a vertical column when
          the outer bar wraps; full row goes to next line instead. */}
      <div className="filter-bar-months" style={{ display: 'flex', gap: 4, alignItems: 'center', flex: '1 1 360px', minWidth: 0, flexWrap: 'wrap', rowGap: 6 }}>
        {months.map((m, i) => {
          const isActive = i === 0 ? state.activeMonths.length === 0 : state.activeMonths.includes(i - 1);
          return (
            <button key={m}
              onClick={() => {
                if (i === 0) {
                  onChange({ ...state, activeMonths: [] });
                } else {
                  const idx = i - 1;
                  const next = state.activeMonths.includes(idx)
                    ? state.activeMonths.filter(x => x !== idx)
                    : [...state.activeMonths, idx];
                  onChange({ ...state, activeMonths: next });
                }
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                height: 26, padding: '0 8px', borderRadius: 6, flexShrink: 0,
                border: `1px solid ${isActive ? '#4F46E5' : '#E2E8F0'}`,
                background: isActive ? '#4F46E5' : '#fff',
                color: isActive ? '#fff' : '#94A3B8',
                fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              {m}
            </button>
          );
        })}
      </div>

      <div className="filter-bar-divider" style={{ width: 1, height: 22, background: '#E2E8F0', flexShrink: 0 }} />

      {/* Custom toggle */}
      <button className="filter-bar-custom" onClick={() => onChange({ ...state, onlyCustom: !state.onlyCustom })}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#64748B', flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        <div style={{
          width: 28, height: 16, borderRadius: 8,
          background: state.onlyCustom ? '#4F46E5' : '#E2E8F0',
          position: 'relative',
        }}>
          <span style={{
            position: 'absolute', top: 2, left: state.onlyCustom ? 14 : 2,
            width: 12, height: 12, borderRadius: 6, background: '#fff',
            boxShadow: '0 1px 2px rgba(0,0,0,0.15)', transition: 'left 100ms',
          }} />
        </div>
        {t.marathons.customOnly}
      </button>

      {/* Sort */}
      <select className="filter-bar-sort" value={state.sort} onChange={e => onChange({ ...state, sort: e.target.value as FilterState['sort'] })}
        style={{
          height: 34, padding: '0 10px', border: '1px solid #E2E8F0', borderRadius: 8,
          background: '#fff', fontSize: 12.5, cursor: 'pointer', color: '#0F172A',
          fontFamily: 'inherit', flexShrink: 0,
        }}>
        <option value="difficulty">{t.marathons.sortDifficulty}</option>
        <option value="name">{t.marathons.sortName}</option>
        <option value="elevation">{t.marathons.sortElevation}</option>
      </select>
    </div>
  );
}

// ── Marathon card ─────────────────────────────────────────────────────
function MarathonCard({
  marathon, isTarget, onSetTarget, isSettingTarget, cardRef,
}: {
  marathon: Marathon;
  isTarget: boolean;
  onSetTarget: () => void;
  isSettingTarget: boolean;
  cardRef?: React.Ref<HTMLDivElement>;
}) {
  const t = useT();
  const coeff = Number(marathon.difficulty_coefficient);
  const gain = Number(marathon.elevation_gain_m) || 0;
  const getDiffLabel = (c: number) => {
    const k = getDiffKey(c);
    return k === 'flat' ? t.marathons.difficultyFlat
         : k === 'mid'  ? t.marathons.difficultyRolling
         : k === 'hilly' ? t.marathons.difficultyHilly
         : t.marathons.difficultyTough;
  };
  const elevProfile = useMemo(
    () => makeSyntheticProfile(gain, Number(marathon.elevation_loss_m) || 0, marathon.name),
    [gain, marathon.elevation_loss_m, marathon.name]
  );

  return (
    <div ref={cardRef} className="marathon-card" style={{
      borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: '#fff', border: isTarget ? '1px solid rgba(249,112,102,0.45)' : '1px solid #E2E8F0',
      minHeight: 360,
      transition: 'box-shadow 150ms, transform 150ms',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 12px 32px -8px rgba(15,23,42,0.15)';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.transform = 'none';
      }}>
      <Link to={`/marathons/${marathon.id}`}
        style={{ display: 'flex', flexDirection: 'column', flex: 1, textDecoration: 'none', color: 'inherit' }}>
      {/* Top strip */}
      <div style={{
        height: 36, padding: '0 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#FAFAF9', borderBottom: '1px solid #F1F5F9',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Emoji flag removed to avoid Windows fallback "DE DE" duplication
              with the ISO code below. Keep just the country code; FeaturedHero
              still shows a large standalone flag at the top. */}
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, fontWeight: 600, color: '#0F172A', letterSpacing: 0.4 }}>
            {marathon.country}
          </span>
          {marathon.is_custom && (
            <span style={{
              height: 17, padding: '0 6px', borderRadius: 4, marginLeft: 4,
              background: '#EEF2FF', color: '#4F46E5', fontSize: 9.5, fontWeight: 700,
              display: 'inline-flex', alignItems: 'center',
            }}>{t.marathons.customBadge}</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#94A3B8', fontSize: 10.5 }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {getMonthName(marathon)}
        </div>
      </div>

      {/* Route preview — real map tiles (dark theme), interactions disabled.
          Lazy-mounted via IntersectionObserver so all 16 cards don't fire up
          Leaflet + tile requests on first paint. Clicks pass through to the
          parent <Link> so the whole card stays a navigation target.
          height='100%' lets mobile @media flip card to row layout (100px
          square thumbnail) without breaking the Leaflet container size. */}
      <div className="marathon-card-image" style={{
        height: 132, position: 'relative',
        borderBottom: '1px solid #1E1B4B',
        pointerEvents: 'none',
      }}>
        <LazyMarathonMiniMap encodedPolyline={marathon.polyline} height="100%" theme="dark" weight={2.5} />
        {marathon.major && (
          <span style={{
            position: 'absolute', top: 10, right: 10,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            height: 18, padding: '0 7px', borderRadius: 5,
            background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
            color: '#fff', fontSize: 9.5, fontWeight: 700, letterSpacing: 0.7,
          }}>★ MAJOR</span>
        )}
        {isTarget && (
          <span style={{
            position: 'absolute', top: 12, right: 12,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', borderRadius: 6,
            background: 'rgba(249,112,102,0.12)', color: '#F97066',
            fontSize: 11, fontWeight: 700, letterSpacing: 0.4, textTransform: 'uppercase',
          }}>⭐ {t.marathons.currentTargetRace}</span>
        )}
      </div>

      {/* Body */}
      <div className="marathon-card-content" style={{ padding: '12px 16px 0', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div>
          <div style={{ fontSize: 15.5, fontWeight: 600, color: '#0F172A', letterSpacing: -0.2, lineHeight: 1.15 }}>
            {marathon.name}
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 2 }}>
            {marathon.city}{marathon.city ? ', ' : ''}{marathon.country}
          </div>
        </div>

        {/* Elevation */}
        <div style={{ marginTop: 2, marginRight: -4, marginLeft: -4 }}>
          {marathon.elevation_profile && marathon.elevation_profile.length > 1 ? (
            <MiniElevation profile={marathon.elevation_profile} maxLabel={`+${Math.round(gain)}m`} />
          ) : (
            <MiniElevation data={elevProfile} maxLabel={`+${Math.round(gain)}m`} />
          )}
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: 0, paddingTop: 2 }}>
          {[
            { l: 'DIST', v: Number(marathon.distance_km).toFixed(1), s: 'km' },
            { l: 'ELEV ↑', v: `+${Math.round(gain)}`, s: 'm' },
            { l: 'DIFFICULTY', v: getDiffLabel(coeff), s: getDiffDots(coeff) },
          ].map((c, i) => (
            <div key={i} style={{
              borderLeft: i > 0 ? '1px solid #F1F5F9' : 'none',
              paddingLeft: i > 0 ? 10 : 0,
              display: 'flex', flexDirection: 'column', gap: 2,
            }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, color: '#94A3B8' }}>{c.l}</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5, fontWeight: 600, color: '#0F172A', letterSpacing: -0.2 }}>{c.v}</span>
                <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, color: '#94A3B8' }}>{c.s}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Difficulty bar */}
        <div style={{ paddingTop: 4 }}>
          <DifficultyBar coeff={coeff} />
        </div>
      </div>
      </Link>

      {/* Action row — outside the Link so clicks don't navigate */}
      <div style={{ borderTop: '1px solid #F1F5F9', padding: '10px 14px', marginTop: 10 }}>
        {isTarget ? (
          <div style={{
            width: '100%', height: 32, borderRadius: 7,
            background: '#F97066', color: '#fff', fontSize: 12, fontWeight: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <span>✓</span> {t.marathons.currentTargetRace}
          </div>
        ) : (
          <button onClick={e => { e.stopPropagation(); onSetTarget(); }} disabled={isSettingTarget}
            style={{
              width: '100%', height: 32, borderRadius: 7,
              border: '1px solid #E2E8F0', background: '#fff', cursor: 'pointer',
              fontSize: 12, fontWeight: 500, color: '#0F172A', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
            {isSettingTarget ? t.marathons.settingTarget : `${t.marathons.setAsTarget} →`}
          </button>
        )}
      </div>
    </div>
  );
}

// ── No results ────────────────────────────────────────────────────────
function NoResultsEmpty({ onClear }: { onClear: () => void }) {
  const t = useT();
  return (
    <div style={{
      marginTop: 32, padding: '64px 24px',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: '#fff', border: '1px dashed #CBD5E1', borderRadius: 14,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 36, background: '#F1F5F9',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6" />
        </svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
        {t.marathons.noResults}
      </div>
      <div style={{ fontSize: 12.5, color: '#64748B', maxWidth: 360, textAlign: 'center', lineHeight: 1.5 }}>
        {t.marathons.noResultsHint}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
        <button onClick={onClear}
          style={{
            height: 34, padding: '0 16px', borderRadius: 8, border: '1px solid #E2E8F0',
            background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#0F172A', fontFamily: 'inherit',
          }}>{t.marathons.clearFilters}</button>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────────────
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  React.useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div style={{
      position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
      background: '#0F172A', color: '#fff', borderRadius: 10, padding: '12px 20px',
      fontSize: 13.5, fontWeight: 500, zIndex: 600, display: 'flex', alignItems: 'center', gap: 8,
      boxShadow: '0 8px 24px -4px rgba(15,23,42,0.45)',
    }}>
      <span style={{ color: '#10B981' }}>✓</span> {message}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────
function CardSkeleton() {
  return (
    <div style={{ height: 360, borderRadius: 14, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <div style={{ height: 36, background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }} />
      <div style={{ height: 132, background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }} />
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ height: 16, background: '#E2E8F0', borderRadius: 4, width: '70%' }} />
        <div style={{ height: 12, background: '#E2E8F0', borderRadius: 4, width: '40%' }} />
        <div style={{ height: 42, background: '#F1F5F9', borderRadius: 4, marginTop: 8 }} />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────
const Marathons: React.FC = () => {
  const t = useT();
  const { lang } = useLang();
  const { data: marathons, isLoading } = useMarathons();
  const { user, setUser } = useAuth();
  const setTargetMut = useSetTargetMarathon();
  const targetCardRef = useRef<HTMLDivElement>(null);
  const [settingTargetId, setSettingTargetId] = useState<string | null>(null);
  const [gpxOpen, setGpxOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedCountries, setSelectedCountries] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterState>({
    search: '', activeDiff: 'all', activeMonths: [], onlyCustom: false, sort: 'difficulty',
  });

  // Distinct country codes for filter dropdown
  const countries = useMemo(() => {
    if (!marathons) return [];
    return [...new Set(marathons.map(m => m.country).filter(Boolean))].sort();
  }, [marathons]);

  // Featured marathon selection
  const featuredMarathon = useMemo(() => {
    if (!marathons?.length) return null;
    const targetId = user?.target_marathon;
    if (targetId) {
      const t = marathons.find(m => m.id === targetId);
      if (t?.major) return t;
    }
    return marathons.find(m => m.major) ?? marathons[0];
  }, [marathons, user?.target_marathon]);

  // Filter + sort
  const filtered = useMemo(() => {
    if (!marathons) return [];
    let result = [...marathons];
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        m.city.toLowerCase().includes(q) ||
        m.country.toLowerCase().includes(q)
      );
    }
    if (filter.activeDiff !== 'all') {
      result = result.filter(m => getDiffKey(Number(m.difficulty_coefficient)) === filter.activeDiff);
    }
    if (filter.activeMonths.length > 0) {
      result = result.filter(m => {
        const mo = getMarathonMonth(m);
        return mo !== null && filter.activeMonths.includes(mo);
      });
    }
    if (filter.onlyCustom) {
      result = result.filter(m => m.is_custom);
    }
    if (selectedCountries.length > 0) {
      result = result.filter(m => selectedCountries.includes(m.country));
    }
    result.sort((a, b) => {
      if (filter.sort === 'difficulty') return Number(a.difficulty_coefficient) - Number(b.difficulty_coefficient);
      if (filter.sort === 'elevation') return (Number(a.elevation_gain_m) || 0) - (Number(b.elevation_gain_m) || 0);
      return a.name.localeCompare(b.name);
    });
    return result;
  }, [marathons, filter, selectedCountries]);

  const handleSetTarget = (marathon: Marathon) => {
    setSettingTargetId(marathon.id);
    setTargetMut.mutate(
      { marathonId: marathon.id, raceDate: user?.target_race_date ?? null },
      {
        onSuccess: () => {
          setSettingTargetId(null);
          setToast(t.marathons.targetSetToast(marathon.name));
          if (user) setUser({ ...user, target_marathon: marathon.id, target_marathon_name: marathon.name });
        },
        onError: () => setSettingTargetId(null),
      },
    );
  };

  const clearFilters = () => {
    setFilter({ search: '', activeDiff: 'all', activeMonths: [], onlyCustom: false, sort: 'difficulty' });
    setSelectedCountries([]);
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const total = marathons?.length ?? 36;

  return (
    <div className="page-pad" style={{ padding: '24px 32px 40px', fontFamily: 'Inter, system-ui, sans-serif', color: '#0F172A' }}>
      {/* Page header */}
      <div className="page-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 6 }}>
            {t.marathons.catalog}
          </div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: -0.4, color: '#0F172A' }}>
            {t.marathons.title}
          </h1>
          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
            <span style={{ fontFamily: 'ui-monospace, monospace' }}>{total}</span>{' '}
            {t.marathons.racesWorldwideDesc}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setGpxOpen(true)}
            style={{
              height: 40, padding: '0 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: '#F97066', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              boxShadow: '0 4px 16px -4px rgba(249,112,102,0.5)',
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.78A7 7 0 1 0 6 18h11.5z" />
              <path d="M12 12v7M9 15l3-3 3 3" />
            </svg>
            {t.marathons.addCustomGpx}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Featured hero */}
        {isLoading ? (
          <div style={{ height: 320, borderRadius: 16, background: '#F1F5F9' }} />
        ) : featuredMarathon ? (
          <FeaturedHero
            marathon={featuredMarathon}
            isTarget={user?.target_marathon === featuredMarathon.id}
            onSetTarget={() => handleSetTarget(featuredMarathon)}
            isSettingTarget={settingTargetId === featuredMarathon.id}
          />
        ) : null}

        {/* Target pill — shown only when user has a target marathon set */}
        {user?.target_marathon && (() => {
          const targetM = marathons?.find(m => m.id === user.target_marathon);
          if (!targetM) return null;
          const dateLabel = user.target_race_date
            ? new Date(user.target_race_date).toLocaleDateString(lang, { day: 'numeric', month: 'short', year: 'numeric' })
            : null;
          return (
            <div style={{
              padding: '14px 18px', borderRadius: 12,
              background: '#FFFFFF', border: '1px solid #F1EFEC',
              display: 'flex', alignItems: 'center', gap: 10,
              marginBottom: -4,
            }}>
              <span style={{ fontSize: 16, lineHeight: 1 }}>⭐</span>
              <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 500 }}>
                {t.marathons.yourTarget}: <strong>{targetM.name}</strong>
                {` · ${Number(targetM.distance_km).toFixed(1)} km`}
                {dateLabel && <span style={{ color: '#64748B' }}> · {dateLabel}</span>}
              </span>
              <button
                onClick={() => targetCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                style={{
                  marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 12.5, fontWeight: 600, color: '#4F46E5', padding: 0, fontFamily: 'inherit',
                }}
              >
                {t.marathons.goToCardArrow}
              </button>
            </div>
          );
        })()}

        {/* Filter bar */}
        <FilterBar
          state={filter}
          onChange={setFilter}
          countries={countries}
          selectedCountries={selectedCountries}
          onCountryToggle={toggleCountry}
        />

        {/* Result count + legend. flexWrap + rowGap so the legend drops to a
            new line on narrow viewports instead of jamming against the count. */}
        <div className="marathon-count-row" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: -8, marginBottom: -4,
          flexWrap: 'wrap', rowGap: 8, columnGap: 12,
        }}>
          <div style={{ fontSize: 12, color: '#64748B' }}>
            {t.marathons.showing(filtered.length, total)}
          </div>
          <div style={{
            fontSize: 12, color: '#64748B',
            display: 'inline-flex', alignItems: 'center',
            flexWrap: 'wrap', gap: 12,
          }}>
            {([[`#10B981`, t.marathons.difficultyFlat], [`#F59E0B`, t.marathons.rollingHillyLegend], [`#DC2626`, t.marathons.difficultyTough]] as [string, string][]).map(([c, l]) => (
              <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: 3, background: c }} /> {l}
              </span>
            ))}
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="marathon-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <NoResultsEmpty onClear={clearFilters} />
        ) : (
          <div className="marathon-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {filtered.map(m => (
              <MarathonCard
                key={m.id}
                marathon={m}
                isTarget={user?.target_marathon === m.id}
                onSetTarget={() => handleSetTarget(m)}
                isSettingTarget={settingTargetId === m.id}
                cardRef={user?.target_marathon === m.id ? targetCardRef : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* GPX modal */}
      <AddCustomGPXModal
        open={gpxOpen}
        onClose={() => setGpxOpen(false)}
        currentTargetId={user?.target_marathon}
        onSaved={() => setToast('Custom marathon saved!')}
      />

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
};

export default Marathons;
