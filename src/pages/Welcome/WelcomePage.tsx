import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sun, Moon, ArrowUpRight } from 'lucide-react';
import { useThemeStore, useDark } from '../../store/themeStore';
import { Logo } from '../../components/common/Logo';

export function WelcomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setMode = useThemeStore((s) => s.setMode);
  const dark = useDark();

  function select(type: 'simple' | 'double') {
    sessionStorage.setItem('nelka_selected_type', type);
    navigate('/companies');
  }

  function toggleLang() {
    const next = i18n.language === 'sk' ? 'en' : 'sk';
    i18n.changeLanguage(next);
    localStorage.setItem('nelka_lang', next);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: dark ? '#0c0c0e' : '#ffffff',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>

      {/* ── NAVBAR ── */}
      <nav style={{
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 60,
        borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
      }}>
        <Logo variant="mark" size={30} dark={dark} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={toggleLang}
            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', fontSize: 12, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af', fontFamily: 'inherit' }}
            onMouseEnter={e => (e.currentTarget.style.color = dark ? '#fff' : '#374151')}
            onMouseLeave={e => (e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af')}
          >
            {i18n.language === 'sk' ? 'EN' : 'SK'}
          </button>
          <button
            onClick={() => setMode(dark ? 'light' : 'dark')}
            style={{ padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af', display: 'flex', alignItems: 'center' }}
          >
            {dark ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </nav>

      {/* ── MAIN – scrollable, NO justify-content center ── */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 24px 64px',
      }}>

        {/* Logo – full size, always fully visible */}
        <div style={{ marginBottom: 48 }}>
          <Logo variant="full" size={96} dark={dark} />
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 60px)',
          fontWeight: 800, letterSpacing: '-0.035em', lineHeight: 1.06,
          textAlign: 'center', margin: '0 0 18px', maxWidth: 660,
          color: dark ? '#ffffff' : '#0c0c0e',
        }}>
          Nelka Economics<br />and Logistics
        </h1>

        <div style={{ marginBottom: 40 }} />

        {/* Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
          gap: 14, width: '100%', maxWidth: 600, marginBottom: 48,
        }}>
          <Card dark={dark} label="Jednoduché" title={t('welcome.simple')} onClick={() => select('simple')} />
          <Card dark={dark} label="Podvojné"    title={t('welcome.double')} onClick={() => select('double')} recommended />
        </div>

        {/* Trust strip */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px', justifyContent: 'center' }}>
          {['Dáta zostávajú u vás', 'SK legislatíva', 'Žiadna registrácia karty'].map((item) => (
            <span key={item} style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.18)' : '#d1d5db' }}>{item}</span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer style={{
        flexShrink: 0, textAlign: 'center', padding: '14px 0', fontSize: 12,
        borderTop: dark ? '1px solid rgba(255,255,255,0.04)' : '1px solid #f0f0f0',
        color: dark ? 'rgba(255,255,255,0.1)' : '#d1d5db',
      }}>
        © 2026 Nelka
      </footer>
    </div>
  );
}

function Card({ dark, label, title, onClick, recommended }: {
  dark: boolean; label: string; title: string; onClick: () => void; recommended?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
        padding: '26px 26px 22px', borderRadius: 20, textAlign: 'left', cursor: 'pointer',
        border: dark ? '1px solid rgba(255,255,255,0.09)' : '1px solid #e5e7eb',
        background: dark ? 'rgba(255,255,255,0.03)' : '#ffffff',
        boxShadow: dark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.18s ease', fontFamily: 'inherit',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.borderColor = '#f97316';
        e.currentTarget.style.boxShadow = dark
          ? '0 0 0 1px rgba(249,115,22,0.3), 0 20px 40px rgba(249,115,22,0.08)'
          : '0 0 0 1px #f97316, 0 16px 40px rgba(249,115,22,0.10)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = dark ? 'rgba(255,255,255,0.09)' : '#e5e7eb';
        e.currentTarget.style.boxShadow = dark ? 'none' : '0 1px 4px rgba(0,0,0,0.04)';
      }}
    >
      {recommended && (
        <span style={{
          position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 700,
          padding: '3px 8px', borderRadius: 999,
          background: dark ? 'rgba(249,115,22,0.15)' : '#fff7ed',
          color: '#f97316', border: '1px solid rgba(249,115,22,0.25)',
        }}>Odporúčané</span>
      )}

      <div style={{
        width: 34, height: 34, borderRadius: 9,
        background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed',
        border: '1px solid rgba(249,115,22,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
      }}>
        <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#f97316' }} />
      </div>

      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f97316', marginBottom: 7, opacity: 0.8 }}>
        {label}
      </span>
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: 24, color: dark ? '#ffffff' : '#0c0c0e' }}>
        {title}
      </span>
      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: '#f97316' }}>
        Začať <ArrowUpRight size={13} />
      </div>
    </button>
  );
}
