import { useEffect, useState } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useDark } from '../../store/themeStore';
import { Logo } from '../common/Logo';

interface ElectronAPI {
  isElectron?: boolean;
  platform?: string;
  minimize?: () => void;
  maximize?: () => void;
  close?: () => void;
  onMaximized?: (cb: (v: boolean) => void) => void;
}

/** Vlastný titlebar v štýle Claude desktop — len v Electron appke. */
export function TitleBar() {
  const dark = useDark();
  const api = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  const isElectron = !!api?.isElectron;
  const isMac = api?.platform === 'darwin';
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    api?.onMaximized?.(setMaximized);
  }, [api]);

  if (!isElectron) return null;

  const bg = dark ? '#0c0c0e' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : '#ececec';
  const fg = dark ? 'rgba(255,255,255,0.6)' : '#9ca3af';
  const titleColor = dark ? '#ffffff' : '#0c0c0e';

  return (
    <div
      className="titlebar"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 36, zIndex: 1000,
        display: 'flex', alignItems: 'center',
        background: bg, borderBottom: `1px solid ${border}`,
        userSelect: 'none', fontFamily: "'Inter', system-ui, sans-serif",
        paddingLeft: isMac ? 78 : 12,
      }}
    >
      <Logo variant="mark" size={16} dark={dark} />
      <span style={{ marginLeft: 8, fontSize: 12.5, fontWeight: 700, color: titleColor, letterSpacing: '-0.02em' }}>
        Nelka
      </span>

      <div style={{ flex: 1 }} />

      {/* Windows / Linux — vlastné ovládacie tlačidlá (Mac používa natívne traffic lights) */}
      {!isMac && (
        <div className="tb-controls" style={{ display: 'flex', height: '100%' }}>
          <button className="tb-btn" style={{ color: fg }} onClick={() => api?.minimize?.()} aria-label="Minimalizovať">
            <Minus size={15} />
          </button>
          <button className="tb-btn" style={{ color: fg }} onClick={() => api?.maximize?.()} aria-label="Maximalizovať">
            {maximized ? <Copy size={12} /> : <Square size={12} />}
          </button>
          <button className="tb-btn tb-close" style={{ color: fg }} onClick={() => api?.close?.()} aria-label="Zavrieť">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
