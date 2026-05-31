import React, { createContext, useCallback, useContext, useState, useRef } from 'react';

/**
 * Global, app-wide toast notification system.
 *
 * Why a dedicated provider instead of inline `setError(string)` states inside
 * each page:
 *  - Visual consistency — every error/success/warn looks the same across the
 *    app instead of one being a small red footer, another a banner, another
 *    a modal-shaped div
 *  - Position-stable — top-right corner, so the user always knows where
 *    feedback shows up
 *  - Stacking — multiple toasts queue cleanly instead of overwriting each
 *    other when the user triggers two actions in quick succession
 *  - Auto-dismiss with optional manual close
 *
 * Persistent notifications (the bell-icon centre on the navbar) are a separate
 * surface for things the user should be able to come back to. Toasts are for
 * transient feedback that vanishes after a few seconds.
 */

export type ToastKind = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  /** Show a transient toast. Returns the id so the caller can dismiss early
   *  if they need to (rare — usually auto-dismiss is fine). */
  showToast: (message: string, kind?: ToastKind, durationMs?: number) => number;
  /** Imperative dismiss (e.g. after a long-running action completes) */
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Soft fallback: in tests or storybook stories without provider, log
    // instead of crashing the whole tree.
    return {
      showToast: (msg, kind) => { console.warn(`[Toast/${kind}] ${msg}`); return -1; },
      dismissToast: () => { /* noop */ },
    };
  }
  return ctx;
}

const KIND_STYLES: Record<ToastKind, { bg: string; border: string; text: string; icon: string }> = {
  success: { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', icon: '#10B981' },
  error:   { bg: '#FEF2F2', border: '#FCA5A5', text: '#991B1B', icon: '#DC2626' },
  warning: { bg: '#FFFBEB', border: '#FCD34D', text: '#92400E', icon: '#F59E0B' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', icon: '#2563EB' },
};

const KIND_ICON: Record<ToastKind, React.ReactNode> = {
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  warning: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idCounter = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    kind: ToastKind = 'info',
    durationMs: number = 5000,
  ): number => {
    const id = ++idCounter.current;
    setToasts(prev => [...prev, { id, message, kind }]);
    if (durationMs > 0) {
      window.setTimeout(() => dismissToast(id), durationMs);
    }
    return id;
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ showToast, dismissToast }}>
      {children}
      {/* Toast viewport — fixed top-right, vertically stacked, doesn't take
          interaction unless hovered. Sits above modals (zIndex 1100 > 1000). */}
      <div
        role="region"
        aria-label="Notifications"
        style={{
          position: 'fixed', top: 16, right: 16, zIndex: 1100,
          display: 'flex', flexDirection: 'column', gap: 8,
          maxWidth: 'min(360px, calc(100vw - 32px))',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => {
          const s = KIND_STYLES[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === 'error' ? 'alert' : 'status'}
              style={{
                pointerEvents: 'auto',
                background: s.bg, border: `1px solid ${s.border}`, color: s.text,
                borderRadius: 10, padding: '10px 12px',
                boxShadow: '0 8px 20px -8px rgba(15,23,42,0.18)',
                fontSize: 13, lineHeight: 1.4,
                display: 'flex', alignItems: 'flex-start', gap: 9,
                animation: 'toast-in 180ms ease-out',
              }}
            >
              <span style={{ color: s.icon, flexShrink: 0, marginTop: 1, display: 'inline-flex' }}>
                {KIND_ICON[t.kind]}
              </span>
              <span style={{ flex: 1, wordBreak: 'break-word' }}>{t.message}</span>
              <button
                onClick={() => dismissToast(t.id)}
                aria-label="Dismiss"
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: s.text, opacity: 0.5, padding: 2, lineHeight: 0, flexShrink: 0,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
