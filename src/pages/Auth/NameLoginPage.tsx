import { useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { setDisplayName } from '../../lib/firebase';
import { useThemeStore, useDark } from '../../store/themeStore';
import { Logo } from '../../components/common/Logo';

interface Props { onDone: () => void; }

export function NameLoginPage({ onDone }: Props) {
  const dark    = useDark();
  const setMode = useThemeStore((s) => s.setMode);
  const [name, setName] = useState('');

  const bg      = dark ? '#0c0c0e' : '#f8f9fb';
  const cardBg  = dark ? '#111113' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const text     = dark ? '#ffffff' : '#0c0c0e';
  const muted    = dark ? 'rgba(255,255,255,0.4)' : '#9ca3af';
  const inputBg  = dark ? '#1c1c1f' : '#f9fafb';

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setDisplayName(name.trim());
    onDone();
  }

  return (
    <div style={{ minHeight: '100vh', background: bg, fontFamily: "'Inter', system-ui, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* Navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, borderBottom: `1px solid ${border}` }}>
        <Logo variant="full" size={26} dark={dark} />
        <button
          onClick={() => setMode(dark ? 'light' : 'dark')}
          style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: muted, display: 'flex', alignItems: 'center' }}
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </nav>

      {/* Card */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{
          width: '100%', maxWidth: 380,
          background: cardBg, border: `1px solid ${border}`,
          borderRadius: 24, padding: '36px 28px',
          boxShadow: dark ? '0 24px 64px rgba(0,0,0,0.5)' : '0 8px 40px rgba(0,0,0,0.07)',
          textAlign: 'center',
        }}>
          {/* Icon */}
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
            background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed',
            border: '1px solid rgba(249,115,22,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>

          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: text, marginBottom: 6 }}>
            Vitaj v Nelke
          </h1>
          <p style={{ fontSize: 13, color: muted, marginBottom: 28, lineHeight: 1.5 }}>
            Zadaj svoje meno aby sme ťa spoznali
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <input
              autoFocus
              type="text"
              placeholder="Napr. Jozef"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '13px 16px', borderRadius: 12,
                border: `1px solid ${name.trim() ? '#f97316' : border}`,
                background: inputBg, color: text,
                fontSize: 16, fontFamily: 'inherit', outline: 'none',
                textAlign: 'center', fontWeight: 600,
                transition: 'border-color 0.15s',
              }}
            />
            <button
              type="submit"
              disabled={!name.trim()}
              style={{
                padding: '13px', borderRadius: 12, border: 'none',
                cursor: name.trim() ? 'pointer' : 'not-allowed',
                background: name.trim() ? '#f97316' : (dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'),
                color: name.trim() ? '#fff' : muted,
                fontSize: 15, fontWeight: 700, fontFamily: 'inherit',
                boxShadow: name.trim() ? '0 4px 14px rgba(249,115,22,0.3)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              Vstúpiť →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
