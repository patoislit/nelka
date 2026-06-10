import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { t } = useTranslation();
  const location = useLocation();
  const titleKey = pageTitles[location.pathname];

  // Klávesové skratky
  useEffect(() => {
    const inInput = () => {
      const tag = document.activeElement?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };

    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      // Ctrl+K — command palette
      if (ctrl && e.key === 'k') { e.preventDefault(); setPaletteOpen(p => !p); return; }

      // Escape — zatvoriť paletu
      if (e.key === 'Escape') { setPaletteOpen(false); return; }

      // Ostatné skratky ignoruj ak je fokus v inpute
      if (inInput()) return;

      // Ctrl+N — nová transakcia
      if (ctrl && e.key === 'n') { e.preventDefault(); window.dispatchEvent(new CustomEvent('nelka:new-income')); return; }

      // Ctrl+Shift+N — nová faktúra
      if (ctrl && e.shiftKey && e.key === 'N') { e.preventDefault(); window.dispatchEvent(new CustomEvent('nelka:new-invoice')); return; }

      // Ctrl+S — uložiť (dispatch, modal ho zachytí)
      if (ctrl && e.key === 's') { e.preventDefault(); window.dispatchEvent(new CustomEvent('nelka:save')); return; }

      // Ctrl+D — Dashboard
      if (ctrl && e.key === 'd') { e.preventDefault(); navigate('/dashboard'); return; }

      // Ctrl+T — Transakcie
      if (ctrl && e.key === 't') { e.preventDefault(); navigate('/transactions'); return; }

      // Ctrl+I — Faktúry (Invoices)
      if (ctrl && e.key === 'i') { e.preventDefault(); navigate('/invoices'); return; }

      // Ctrl+W — Sklad (Warehouse)
      if (ctrl && e.key === 'w') { e.preventDefault(); navigate('/warehouse'); return; }

      // Ctrl+R — Reporty
      if (ctrl && e.key === 'r') { e.preventDefault(); navigate('/reports'); return; }

      // Ctrl+1 až Ctrl+8 — rýchla navigácia
      const numMap: Record<string, string> = {
        '1': '/dashboard', '2': '/transactions', '3': '/invoices',
        '4': '/warehouse', '5': '/tax', '6': '/reports',
        '7': '/companies', '8': '/settings',
      };
      if (ctrl && numMap[e.key]) { e.preventDefault(); navigate(numMap[e.key]); return; }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);

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
