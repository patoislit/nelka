import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useDark } from '../../store/themeStore';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const maxWidths = { sm: 440, md: 540, lg: 700 };

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  const dark = useDark();

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    // Prevent body scroll when modal open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const bg     = dark ? '#161618' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.09)' : '#e5e7eb';
  const titleC = dark ? '#ffffff' : '#111827';
  const closeC = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
      />

      {/* Panel — bottom sheet on mobile, centered on desktop */}
      <div style={{
        position: 'relative',
        width: '100%',
        maxWidth: maxWidths[size],
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: '20px 20px 0 0',
        boxShadow: dark
          ? '0 -8px 64px rgba(0,0,0,0.7)'
          : '0 -8px 64px rgba(0,0,0,0.12)',
      }}
        // On larger screens, make it centered
        className="modal-panel"
      >
        {/* Drag handle (mobile hint) */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 2, flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: dark ? 'rgba(255,255,255,0.15)' : '#e5e7eb' }} />
        </div>

        {title && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 24px 14px',
            borderBottom: `1px solid ${border}`,
            flexShrink: 0,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: titleC, letterSpacing: '-0.02em', margin: 0 }}>
              {title}
            </h2>
            <button
              onClick={onClose}
              style={{
                padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: 'transparent', color: closeC, display: 'flex', alignItems: 'center',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'; e.currentTarget.style.color = titleC; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = closeC; }}
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div style={{ padding: '20px 24px 32px', overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
      <style>{`
        @media (min-width: 640px) {
          .modal-panel {
            border-radius: 20px !important;
            margin: auto;
            max-height: calc(100vh - 64px) !important;
            position: absolute !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%,-50%) !important;
            bottom: auto !important;
          }
        }
      `}</style>
    </div>
  );
}
