import { useState, useRef, useEffect } from 'react';
import { useDark } from '../../store/themeStore';

interface Props {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpBubble({ text, position = 'top' }: Props) {
  const dark = useDark();
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, above: false });
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  function openBubble(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const BUBBLE_W = 260;
      let left = r.left + r.width / 2 - BUBBLE_W / 2;
      left = Math.max(12, Math.min(left, vw - BUBBLE_W - 12));
      const above = position === 'top' || (r.top > 160 && position !== 'bottom');
      setCoords({ top: above ? r.top - 8 : r.bottom + 8, left, width: BUBBLE_W, above });
    }
    setOpen(o => !o);
  }

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (btnRef.current && !btnRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
    };
  }, [open]);

  // ── Farby ──────────────────────────────────────────────────────────────────
  const iconColor = open ? '#f97316' : (dark ? 'rgba(255,255,255,0.3)' : '#9ca3af');
  const iconBorder = open ? '#f97316' : (dark ? 'rgba(255,255,255,0.15)' : '#d1d5db');
  const iconBg = open
    ? (dark ? 'rgba(249,115,22,0.18)' : 'rgba(249,115,22,0.08)')
    : (dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6');

  const bubbleBg = dark ? '#1a1a1e' : '#ffffff';
  const bubbleBorder = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const bubbleText = dark ? 'rgba(255,255,255,0.78)' : '#374151';

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', flexShrink: 0 }}>

      {/* ── Trigger ── */}
      <button
        ref={btnRef}
        type="button"
        onClick={openBubble}
        aria-label="Informácia"
        style={{
          width: 18, height: 18,
          borderRadius: '50%',
          border: `1.5px solid ${iconBorder}`,
          background: iconBg,
          color: iconColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, padding: 0,
          transition: 'border-color 0.15s, background 0.15s, color 0.15s',
          outline: 'none',
        }}
      >
        {/* Inline SVG info icon */}
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="5.5" r="1.25" fill="currentColor"/>
          <rect x="7" y="8" width="2" height="5.5" rx="1" fill="currentColor"/>
        </svg>
      </button>

      {/* ── Desktop tooltip (fixed) ── */}
      {open && !isMobile && (
        <span
          style={{
            position: 'fixed',
            top: coords.above ? coords.top : coords.top,
            left: coords.left,
            transform: coords.above ? 'translateY(calc(-100% - 4px))' : undefined,
            width: coords.width,
            zIndex: 9999,
            background: bubbleBg,
            border: `1px solid ${bubbleBorder}`,
            borderRadius: 14,
            padding: '12px 16px',
            fontSize: 12.5,
            lineHeight: 1.6,
            color: bubbleText,
            boxShadow: dark
              ? '0 16px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)'
              : '0 16px 40px rgba(0,0,0,0.13), 0 2px 6px rgba(0,0,0,0.06)',
            whiteSpace: 'normal',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            pointerEvents: 'none',
            letterSpacing: '-0.01em',
          }}
        >
          {text}
        </span>
      )}

      {/* ── Mobile bottom sheet + overlay ── */}
      {open && isMobile && (
        <>
          {/* Overlay */}
          <span
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 9998,
              pointerEvents: 'all',
            }}
          />
          {/* Sheet */}
          <span
            style={{
              position: 'fixed',
              bottom: 0, left: 0, right: 0,
              zIndex: 9999,
              background: bubbleBg,
              borderTop: `1px solid ${bubbleBorder}`,
              borderRadius: '20px 20px 0 0',
              padding: '20px 24px 32px',
              boxShadow: '0 -8px 40px rgba(0,0,0,0.25)',
              pointerEvents: 'all',
            }}
          >
            {/* Handle bar */}
            <span style={{
              display: 'block',
              width: 36, height: 4, borderRadius: 2,
              background: dark ? 'rgba(255,255,255,0.15)' : '#e5e7eb',
              margin: '0 auto 16px',
            }} />
            {/* Info badge */}
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed',
              color: '#f97316',
              padding: '4px 10px', borderRadius: 8,
              fontSize: 11, fontWeight: 700,
              marginBottom: 12,
              letterSpacing: '0.03em',
            }}>
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="5.5" r="1.25" fill="currentColor"/>
                <rect x="7" y="8" width="2" height="5.5" rx="1" fill="currentColor"/>
              </svg>
              Info
            </span>
            <p style={{
              fontSize: 14, lineHeight: 1.65,
              color: bubbleText,
              margin: 0,
              fontFamily: "'Inter', sans-serif",
            }}>
              {text}
            </p>
          </span>
        </>
      )}

    </span>
  );
}
