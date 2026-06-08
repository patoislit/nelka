import { useState, useRef, useEffect } from 'react';
import { Menu, Sun, Moon, Bell } from 'lucide-react';
import { useThemeStore, useDark } from '../../store/themeStore';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../../store/notificationStore';
import { useCompanyStore } from '../../store/companyStore';

interface HeaderProps { onMenuToggle: () => void; title?: string; }

export function Header({ onMenuToggle, title }: HeaderProps) {
  const setMode = useThemeStore((s) => s.setMode);
  const { t, i18n } = useTranslation();
  const dark = useDark();
  const { getUnread, getAll, markRead, clearAll } = useNotificationStore();
  const { getActiveCompany } = useCompanyStore();
  const company = getActiveCompany();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const companyId = company?.id ?? '';
  const unread = companyId ? getUnread(companyId) : [];
  const allNotifs = companyId ? getAll(companyId).slice(0, 5) : [];

  const sk = i18n.language === 'sk';

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleBellOpen = () => {
    setBellOpen((v) => !v);
    // mark all as read on open
    if (!bellOpen && companyId) {
      allNotifs.forEach((n) => markRead(n.id));
    }
  };

  const typeColor = (type: string) => {
    if (type === 'error') return '#ef4444';
    if (type === 'warning') return '#f97316';
    if (type === 'success') return '#10b981';
    return '#3b82f6';
  };

  const cardBg = dark ? '#1a1a1f' : '#fff';
  const cardBorder = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const textColor = dark ? 'rgba(255,255,255,0.85)' : '#111827';
  const mutedColor = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 30,
      height: 60,
      display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px',
      background: dark ? 'rgba(12,12,14,0.9)' : 'rgba(255,255,255,0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: dark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #f0f0f0',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <button
        onClick={onMenuToggle}
        className="lg:hidden"
        style={{
          padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
          color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af', display: 'flex', alignItems: 'center',
        }}
      >
        <Menu size={17} />
      </button>

      <div style={{ flex: 1 }}>
        {title && (
          <h1 style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: dark ? '#fff' : '#0c0c0e' }}>
            {title}
          </h1>
        )}
      </div>

      {/* Bell icon */}
      <div ref={bellRef} style={{ position: 'relative' }}>
        <button
          onClick={handleBellOpen}
          title={t('notifications.title')}
          style={{
            padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
            color: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af', display: 'flex', alignItems: 'center',
            position: 'relative',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = dark ? '#fff' : '#374151'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af'; }}
        >
          <Bell size={16} />
          {unread.length > 0 && (
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 16, height: 16, borderRadius: '50%',
              background: '#ef4444', color: '#fff',
              fontSize: 9, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {unread.length > 9 ? '9+' : unread.length}
            </span>
          )}
        </button>

        {bellOpen && (
          <div style={{
            position: 'absolute', top: '110%', right: 0,
            width: 320, background: cardBg,
            border: `1px solid ${cardBorder}`, borderRadius: 12,
            boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 8px 32px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderBottom: `1px solid ${cardBorder}`,
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: textColor }}>{t('notifications.title')}</span>
              {allNotifs.length > 0 && (
                <button
                  onClick={() => { clearAll(companyId); }}
                  style={{ fontSize: 11, color: mutedColor, background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  {t('notifications.clear_all')}
                </button>
              )}
            </div>

            {allNotifs.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: mutedColor, fontSize: 13 }}>
                {t('notifications.empty')}
              </div>
            ) : (
              <div>
                {allNotifs.map((n) => (
                  <div key={n.id} style={{
                    padding: '10px 16px',
                    borderBottom: `1px solid ${cardBorder}`,
                    opacity: n.read ? 0.65 : 1,
                  }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: '50%', background: typeColor(n.type),
                        marginTop: 5, flexShrink: 0,
                      }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: textColor }}>
                          {sk ? n.title : n.titleEn}
                        </div>
                        <div style={{ fontSize: 11, color: mutedColor, marginTop: 2, lineHeight: 1.4 }}>
                          {sk ? n.body : n.bodyEn}
                        </div>
                        <div style={{ fontSize: 10, color: mutedColor, marginTop: 4 }}>
                          {new Date(n.createdAt).toLocaleDateString(sk ? 'sk-SK' : 'en-GB')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={() => setMode(dark ? 'light' : 'dark')}
        title={dark ? t('settings.appearance.light') : t('settings.appearance.dark')}
        style={{
          padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer',
          color: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af', display: 'flex', alignItems: 'center',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = dark ? '#fff' : '#374151'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af'; }}
      >
        {dark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </header>
  );
}
