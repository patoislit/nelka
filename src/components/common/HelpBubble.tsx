import { useState, useRef, useEffect } from 'react';
import { useDark } from '../../store/themeStore';

interface Props {
  text: string;
  /** Where to show the bubble relative to the trigger. Default: 'top' */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function HelpBubble({ text, position = 'top' }: Props) {
  const dark = useDark();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [open]);

  const bubbleBg    = dark ? '#1e1e22' : '#ffffff';
  const bubbleBd    = dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb';
  const bubbleText  = dark ? 'rgba(255,255,255,0.82)' : '#374151';

  // Position styles for the bubble
  const bubbleStyle: React.CSSProperties = {
    position: 'absolute',
    zIndex: 999,
    background: bubbleBg,
    border: `1px solid ${bubbleBd}`,
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 12,
    lineHeight: 1.55,
    color: bubbleText,
    width: 230,
    boxShadow: dark
      ? '0 8px 32px rgba(0,0,0,0.5)'
      : '0 8px 32px rgba(0,0,0,0.12)',
    whiteSpace: 'normal',
    fontFamily: "'Inter', sans-serif",
    fontWeight: 400,
    pointerEvents: 'none',
  };

  // Tail (triangle) base style
  const tailBase: React.CSSProperties = {
    position: 'absolute',
    width: 0,
    height: 0,
  };

  let posStyle: React.CSSProperties = {};
  let tailStyle: React.CSSProperties = {};

  switch (position) {
    case 'top':
      posStyle = { bottom: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' };
      tailStyle = {
        ...tailBase,
        bottom: -7, left: '50%', transform: 'translateX(-50%)',
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderTop: `7px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
      };
      break;
    case 'bottom':
      posStyle = { top: 'calc(100% + 10px)', left: '50%', transform: 'translateX(-50%)' };
      tailStyle = {
        ...tailBase,
        top: -7, left: '50%', transform: 'translateX(-50%)',
        borderLeft: '7px solid transparent',
        borderRight: '7px solid transparent',
        borderBottom: `7px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
      };
      break;
    case 'right':
      posStyle = { top: '50%', left: 'calc(100% + 10px)', transform: 'translateY(-50%)' };
      tailStyle = {
        ...tailBase,
        left: -7, top: '50%', transform: 'translateY(-50%)',
        borderTop: '7px solid transparent',
        borderBottom: '7px solid transparent',
        borderRight: `7px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
      };
      break;
    case 'left':
      posStyle = { top: '50%', right: 'calc(100% + 10px)', transform: 'translateY(-50%)' };
      tailStyle = {
        ...tailBase,
        right: -7, top: '50%', transform: 'translateY(-50%)',
        borderTop: '7px solid transparent',
        borderBottom: '7px solid transparent',
        borderLeft: `7px solid ${dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'}`,
      };
      break;
  }

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', flexShrink: 0 }}
    >
      {/* Trigger button */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          width: 16, height: 16,
          borderRadius: '50%',
          border: `1.5px solid ${open
            ? '#f97316'
            : (dark ? 'rgba(255,255,255,0.25)' : '#d1d5db')}`,
          background: open
            ? 'rgba(249,115,22,0.15)'
            : (dark ? 'rgba(255,255,255,0.06)' : '#f9fafb'),
          color: open ? '#f97316' : (dark ? 'rgba(255,255,255,0.4)' : '#9ca3af'),
          fontSize: 9,
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

      {/* Bubble */}
      {open && (
        <span style={{ ...bubbleStyle, ...posStyle }}>
          {text}
          <span style={tailStyle} />
        </span>
      )}
    </span>
  );
}
