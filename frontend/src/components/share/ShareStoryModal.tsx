import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import * as Dialog from '@radix-ui/react-dialog';
import type { ShareData, ShareFormat, ShareTemplate, ShareToggles } from '../../types/share';
import MinimalistTemplate from './templates/MinimalistTemplate';
import CinematicTemplate from './templates/CinematicTemplate';
import SplitsTemplate from './templates/SplitsTemplate';
import { IconClose, IconArrowDown, IconCheck } from '../icons';
import { useT } from '../../i18n/context';

// ── Format dimensions for export ─────────────────────────────────────
const EXPORT_SIZE: Record<ShareFormat, { w: number; h: number }> = {
  '9:16': { w: 1080, h: 1920 },
  '1:1':  { w: 1080, h: 1080 },
  '4:5':  { w: 1080, h: 1350 },
};

// ── Template preview size (displayed in phone frame) ─────────────────
const PREVIEW_NATIVE: Record<ShareFormat, { w: number; h: number }> = {
  '9:16': { w: 375, h: 667 },
  '1:1':  { w: 375, h: 375 },
  '4:5':  { w: 375, h: 469 },
};

// ── Template selector row ─────────────────────────────────────────────
function TemplateButton({ active, onClick, title }: { active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, height: 38, borderRadius: 8,
        border: `1px solid ${active ? '#4F46E5' : '#E7E5E4'}`,
        background: active ? '#EEF0FF' : '#fff',
        color: active ? '#4F46E5' : '#64748B',
        fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
        transition: 'all 150ms ease',
        fontFamily: 'inherit',
      }}
    >
      {title}
    </button>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, note }: { checked: boolean; onChange: () => void; label: string; note?: string }) {
  return (
    <label
      onClick={onChange}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '6px 0', cursor: 'pointer', fontSize: 12.5, color: '#0F172A',
      }}
    >
      <span style={{
        width: 15, height: 15, borderRadius: 4, flexShrink: 0,
        border: `1.5px solid ${checked ? '#4F46E5' : '#E7E5E4'}`,
        background: checked ? '#4F46E5' : '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 100ms ease',
      }}>
        {checked && <IconCheck size={10} style={{ color: '#fff' }} />}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      {note && <span style={{ fontSize: 11, color: '#94A3B8' }}>{note}</span>}
    </label>
  );
}

// ── Props ─────────────────────────────────────────────────────────────
export interface ShareStoryModalProps {
  open: boolean;
  onClose: () => void;
  data: ShareData;
}

// ── Modal ─────────────────────────────────────────────────────────────
const ShareStoryModal: React.FC<ShareStoryModalProps> = ({ open, onClose, data }) => {
  const t = useT();
  const [template, setTemplate] = useState<ShareTemplate>('cinematic');
  const [format, setFormat] = useState<ShareFormat>('9:16');
  // Defaults: map/hr/pace on (most users want full context), date on (provides
  // chronological grounding). Watermark removed — always rendered (see template
  // comments). New users get a sane, complete share image without touching toggles.
  const [toggles, setToggles] = useState<ShareToggles>({ map: true, hr: true, pace: true, date: true });
  const [exporting, setExporting] = useState(false);

  const [maxPreviewH, setMaxPreviewH] = useState(520);
  const [maxPreviewW, setMaxPreviewW] = useState(300);

  React.useEffect(() => {
    const updateSize = () => {
      if (window.innerWidth <= 768) {
        // Reduce preview height to 40% to save vertical space
        setMaxPreviewH(window.innerHeight * 0.40);
        // Modal is 95vw. Padding is 16px*2=32px. Frame border is ~14px.
        // Set max width to safely fit inside the modal without overflowing.
        setMaxPreviewW(window.innerWidth * 0.95 - 46);
      } else {
        setMaxPreviewH(520);
        setMaxPreviewW(300);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const previewRef = useRef<HTMLDivElement>(null);

  const toggle = (key: keyof ShareToggles) =>
    setToggles(t => ({ ...t, [key]: !t[key] }));

  const templateComponents: Record<ShareTemplate, React.FC<{ data: ShareData; format: ShareFormat; toggles: ShareToggles }>> = {
    minimalist: MinimalistTemplate,
    cinematic: CinematicTemplate,
    splits: SplitsTemplate,
  };

  const TemplateEl = templateComponents[template];

  // The preview is rendered at native template size, scaled down via transform
  const native = PREVIEW_NATIVE[format];
  const scaleH = maxPreviewH / native.h;
  const scaleW = maxPreviewW / native.w;
  const scale = Math.min(scaleH, scaleW, 1);
  const previewW = native.w * scale;
  const previewH = native.h * scale;

  // Phone frame border-radius scales with height
  const frameBr = Math.round(28 * scale);
  const frameBorder = Math.round(7 * scale);

  const [exportError, setExportError] = useState<string | null>(null);

  // Build a filename — prefers activity date, falls back to predicted-time
  // (so prediction screenshots don't all collide as `share.png`).
  const filenameStem = useCallback(() => {
    if (data.start_time) return new Date(data.start_time).toISOString().slice(0, 10);
    if (data.predicted_time_formatted) return `prediction-${data.predicted_time_formatted.replace(/:/g, '')}`;
    return `share-${Date.now()}`;
  }, [data.start_time, data.predicted_time_formatted]);

  // Recognise the canvas-tainting failure that html-to-image throws when a map
  // tile lacks CORS headers. The message varies between browsers but always
  // mentions "tainted" or "SecurityError". When we see it, the actionable
  // advice is different from a generic export failure: tell the user to
  // disable the map or pick a no-map template.
  const isCorsTaintError = (e: unknown): boolean => {
    if (!e) return false;
    const msg = (e as Error).message || String(e);
    const name = (e as Error).name || '';
    return /tainted|SecurityError|cross-origin/i.test(msg) || name === 'SecurityError';
  };

  const handleDownload = useCallback(async () => {
    if (!previewRef.current) return;
    setExporting(true);
    setExportError(null);
    try {
      const exp = EXPORT_SIZE[format];
      const nat = PREVIEW_NATIVE[format];
      const pixelRatio = exp.w / nat.w;

      const dataUrl = await toPng(previewRef.current, {
        width: nat.w,
        height: nat.h,
        pixelRatio,
        skipFonts: false,
      });
      const link = document.createElement('a');
      link.download = `endurance-${template}-${filenameStem()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('PNG export failed:', e);
      setExportError(isCorsTaintError(e) ? t.share.errorMapCors : t.share.errorExport);
    } finally {
      setExporting(false);
    }
  }, [format, template, filenameStem, t]);

  const handleShare = useCallback(async () => {
    if (!previewRef.current || !navigator.share) return;
    setExporting(true);
    setExportError(null);
    try {
      const exp = EXPORT_SIZE[format];
      const nat = PREVIEW_NATIVE[format];
      const pixelRatio = exp.w / nat.w;
      const dataUrl = await toPng(previewRef.current, { width: nat.w, height: nat.h, pixelRatio });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File(
        [blob],
        `endurance-${template}-${filenameStem()}.png`,
        { type: 'image/png' },
      );
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'EnduranceAI' });
      } else {
        // iOS < 15 has navigator.share but canShare({files}) returns false.
        // Surface that clearly instead of failing silently.
        setExportError(t.share.errorShareNoFiles);
      }
    } catch (e) {
      // User-cancelled share is an AbortError — not a real error.
      if ((e as Error).name !== 'AbortError') {
        console.error('Share failed:', e);
        setExportError(isCorsTaintError(e) ? t.share.errorMapCors : t.share.errorShareFailed);
      }
    } finally {
      setExporting(false);
    }
  }, [format, template, filenameStem, t]);

  const canWebShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Wrapped in Radix Dialog so:
  //  - Portal escapes the parent stacking context — Leaflet's z-index:600+
  //    panes on Activity Detail no longer paint over us
  //  - Esc closes, focus is trapped, scroll lock applied, ARIA roles correct
  //  - aria-describedby satisfies a11y for the description text
  // Stop React synthetic events from bubbling out of the modal.
  // Radix Portal renders the dialog in document.body (escapes the DOM tree)
  // but React's synthetic event system bubbles through the COMPONENT tree.
  // On the mobile Activities page each card is wrapped in <Link>, so without
  // this guard a tap on any toggle/button inside the modal bubbles through
  // ShareActivityButton → ActivityMobileCard → <Link> and fires navigation
  // to the activity detail page. Desktop dodges this only because the Link
  // there wraps individual <td>s, not the share button.
  const stopBubble = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <Dialog.Root open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          onClick={stopBubble}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15, 23, 42, 0.60)',
            zIndex: 1000,
          }}
        />
        <Dialog.Content
          aria-describedby="share-story-desc"
          className="share-modal-content"
          onClick={stopBubble}
          onPointerDown={stopBubble}
          style={{
            position: 'fixed',
            top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            zIndex: 1001,
            background: '#fff', borderRadius: 16,
            border: '1px solid #E7E5E4',
            display: 'flex', overflow: 'hidden',
            boxShadow: '0 40px 80px -20px rgba(15,23,42,0.40)',
            maxHeight: '95vh',
            width: 'min(1060px, 96vw)',
          }}
        >
        {/* LEFT — Preview */}
        <div className="share-modal-preview" style={{
          flex: '0 0 560px',
          background: '#F0EEE9',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 16, padding: '32px 24px',
          borderRight: '1px solid #E7E5E4',
        }}>
          {/* Phone frame */}
          <div className="share-preview-frame" style={{
            width: previewW + frameBorder * 2,
            height: previewH + frameBorder * 2,
            maxWidth: '100%',
            maxHeight: '70vh',
            borderRadius: frameBr + frameBorder,
            background: '#0F172A',
            padding: frameBorder,
            boxShadow: '0 24px 50px -12px rgba(15,23,42,0.35)',
          }}>
            <div style={{
              width: previewW,
              height: previewH,
              borderRadius: frameBr,
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Actual template rendered at native size, scaled down */}
              <div style={{
                width: native.w,
                height: native.h,
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
              }}>
                <div ref={previewRef} style={{ width: native.w, height: native.h }}>
                  <TemplateEl data={data} format={format} toggles={toggles} />
                </div>
              </div>
            </div>
          </div>

          {/* Format chips — small social-network glyphs hint where each ratio
              is meant to be used. The label still drives the choice; icons are
              just affordance. */}
          <div style={{ display: 'flex', gap: 7 }}>
            {(['9:16', '1:1', '4:5'] as ShareFormat[]).map(f => {
              // Inline tiny SVGs (4 lines each) rather than importing icons —
              // these don't appear anywhere else and we want them as part of
              // the chip's visual identity, not as reusable icons.
              const glyph = f === '9:16' ? (
                // Stories — rounded vertical rectangle, evokes IG/TikTok story frame
                <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden="true">
                  <rect x="0.75" y="0.75" width="7.5" height="9.5" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              ) : f === '1:1' ? (
                // Square — IG feed post / Twitter image
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                  <rect x="0.75" y="0.75" width="8.5" height="8.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              ) : (
                // 4:5 portrait feed — IG portrait post
                <svg width="9" height="11" viewBox="0 0 9 11" fill="none" aria-hidden="true">
                  <rect x="0.75" y="0.75" width="7.5" height="9.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
                  <line x1="2.5" y1="3.5" x2="6.5" y2="3.5" stroke="currentColor" strokeWidth="0.8" />
                  <line x1="2.5" y1="5.5" x2="6.5" y2="5.5" stroke="currentColor" strokeWidth="0.8" />
                </svg>
              );
              return (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  style={{
                    height: 27, padding: '0 11px', borderRadius: 6,
                    border: `1px solid ${format === f ? '#4F46E5' : '#E7E5E4'}`,
                    background: format === f ? '#EEF0FF' : '#fff',
                    color: format === f ? '#4F46E5' : '#64748B',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'Geist Mono Variable, monospace',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {glyph}
                  {f === '9:16' ? t.share.formatStory : f === '1:1' ? t.share.formatSquare : t.share.formatFeed}
                </button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Controls */}
        <div className="share-modal-controls" style={{
          width: 400,
          padding: '26px 26px',
          display: 'flex', flexDirection: 'column', gap: 16,
          overflowY: 'auto',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Dialog.Title asChild>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#0F172A', letterSpacing: -0.3 }}>
                  {t.share.modalTitle}
                </h3>
              </Dialog.Title>
              <Dialog.Description asChild>
                <div id="share-story-desc" style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  {t.share.modalSubtitle}
                </div>
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                style={{
                  width: 28, height: 28, borderRadius: 7,
                  border: '1px solid #E7E5E4', background: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: '#64748B', flexShrink: 0,
                }}
                aria-label="Close"
              >
                <IconClose size={13} />
              </button>
            </Dialog.Close>
          </div>

          {/* Template selector */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#64748B', marginBottom: 8 }}>
              {t.share.sectionTemplate}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <TemplateButton active={template === 'minimalist'} onClick={() => setTemplate('minimalist')} title={t.share.templateMinimalist} />
              <TemplateButton active={template === 'cinematic'} onClick={() => setTemplate('cinematic')} title={t.share.templateCinematic} />
              <TemplateButton active={template === 'splits'} onClick={() => setTemplate('splits')} title={t.share.templateSplits} />
            </div>
          </div>

          {/* Toggles — watermark removed; brand always rendered on the image */}
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#64748B', marginBottom: 8 }}>
              {t.share.sectionOptions}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 12px' }}>
              <Toggle checked={toggles.map} onChange={() => toggle('map')} label={t.share.toggleMap} />
              <Toggle checked={toggles.hr} onChange={() => toggle('hr')} label={t.share.toggleHr} />
              <Toggle checked={toggles.pace} onChange={() => toggle('pace')} label={t.share.togglePace} />
              <Toggle checked={toggles.date} onChange={() => toggle('date')} label={t.share.toggleDate} />
            </div>
          </div>

          <div style={{ height: 1, background: '#E7E5E4' }} />

          {exportError && (
            <div role="alert" style={{
              background: '#FEF2F2', border: '1px solid #FECACA',
              color: '#B91C1C', fontSize: 12, padding: '8px 10px',
              borderRadius: 6, lineHeight: 1.4,
            }}>
              {exportError}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDownload}
              disabled={exporting}
              style={{
                flex: 1, height: 40, borderRadius: 8, border: 'none',
                background: exporting ? '#E7E5E4' : '#F97066',
                color: exporting ? '#64748B' : '#fff',
                fontSize: 13.5, fontWeight: 600, cursor: exporting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                transition: 'background 150ms ease',
              }}
            >
              {exporting ? (
                <>
                  <span style={{
                    width: 14, height: 14,
                    border: '2px solid rgba(0,0,0,0.15)',
                    borderTopColor: '#64748B',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 0.8s linear infinite',
                  }} />
                  {t.share.btnExporting}
                </>
              ) : (
                <>
                  <IconArrowDown size={14} />
                  {t.share.btnDownload}
                </>
              )}
            </button>

            <button
              onClick={handleShare}
              disabled={!canWebShare || exporting}
              title={!canWebShare ? 'Available on mobile' : undefined}
              style={{
                flex: 1, height: 40, borderRadius: 8,
                border: `1px solid ${canWebShare ? '#E7E5E4' : '#F1EFEC'}`,
                background: '#fff',
                color: canWebShare ? '#0F172A' : '#94A3B8',
                fontSize: 13.5, fontWeight: 600, cursor: canWebShare ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              {canWebShare ? t.share.btnShare : t.share.btnShareMobile}
            </button>
          </div>
        </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default ShareStoryModal;
