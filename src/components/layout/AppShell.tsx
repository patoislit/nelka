import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { CommandPalette } from '../common/CommandPalette';

const pageTitles: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/transactions': 'nav.transactions',
  '/reports': 'nav.reports',
  '/companies': 'nav.companies',
  '/settings': 'nav.settings',
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const titleKey = pageTitles[location.pathname];

  // Klávesové skratky
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+K alebo Ctrl+F — command palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'f')) {
        // Ctrl+F len ak nie je fokus v input/textarea
        if (e.key === 'f' && (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        setPaletteOpen(p => !p);
      }
      // Ctrl+N — nová transakcia (dispatch event, stránka ho zachytí)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('nelka:new-income'));
      }
      // Escape — zatvoriť paletu
      if (e.key === 'Escape') setPaletteOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0d0d0d] overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          title={titleKey ? t(titleKey) : undefined}
          onSearch={() => setPaletteOpen(true)}
        />
        <main className="flex-1 overflow-y-auto" style={{ width: '100%' }}>
          <Outlet />
        </main>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
