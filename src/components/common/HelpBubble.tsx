import { useState, useRef, useEffect } from 'react';
import { useDark } from '../../store/themeStore';

interface Props {
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpBubble({ text, position = 'top' }: Props) {
  const dark = useDark();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Vypočítaj pozíciu bubliny relatívne k viewportu (fixed positioning)
  function calcCoords() {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const bubbleW = Math.min(230, vw - 32);

    let top = 0;
    let left = 0;

    if (position === 'bottom' || r.top < 80) {
      // Pod tlačidlom
      top = r.bottom + 10;
      left = r.left + r.width / 2 - bubbleW / 2;
    } else if (position === 'top') {
      // Nad tlačidlom — ale ak by presiahlo hore, daj dole
      top = r.top - 10; // translateY(-100%) sa rieši neskôr
      left = r.left + r.width / 2 - bubbleW / 2;
    } else if (position === 'right') {
      top = r.top + r.height / 2;
      left = r.right + 10;
    } else {
      // left
      top = r.top + r.height / 2;
      left = r.left - bubbleW - 10;
    }

    // Zabráň presahovaniu z obrazovky
    left = Math.max(16, Math.min(left, vw - bubbleW - 16));

    setCoords({ top, left });
  }

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) calcCoords();
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

  const bubbleBg   = dark ? '#1e1e22' : '#ffffff';
  const bubbleBd   = dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb';
  const bubbleText = dark ? 'rgba(255,255,255,0.82)' : '#374151';
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const bubbleW = Math.min(230, vw - 32);

  // Pre "top" bublinu — posunieme hore o výšku (translateY(-100%))
  const isAbove = position === 'top' && coords && coords.top > 80;

  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', flexShrink: 0 }}>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        style={{
          width: 17, height: 17,
          borderRadius: '50%',
          border: `1.5px solid ${open ? '#f97316' : (dark ? 'rgba(255,255,255,0.25)' : '#d1d5db')}`,
          background: open ? 'rgba(249,115,22,0.15)' : (dark ? 'rgba(255,255,255,0.06)' : '#f9fafb'),
          color: open ? '#f97316' : (dark ? 'rgba(255,255,255,0.4)' : '#9ca3af'),
          fontSize: 10,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          flexShrink: 0,
          transition: 'all 0.15s',
          padding: 0,
          fontFamily: 'serif',
        }}
        aria-label="Pomoc"
      >
        ?
      </button>

      {open && coords && (
        <span
          style={{
            position: 'fixed',
            top: isAbove ? coords.top : coords.top,
            left: coords.left,
            transform: isAbove ? 'translateY(-100%)' : undefined,
            zIndex: 9999,
            background: bubbleBg,
            border: `1px solid ${bubbleBd}`,
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 12,
            lineHeight: 1.55,
            color: bubbleText,
            width: bubbleW,
            boxShadow: dark
              ? '0 8px 32px rgba(0,0,0,0.55)'
              : '0 8px 32px rgba(0,0,0,0.14)',
            whiteSpace: 'normal',
            fontFamily: "'Inter', sans-serif",
            fontWeight: 400,
            pointerEvents: 'none',
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
