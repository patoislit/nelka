import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const pageTitles: Record<string, string> = {
  '/dashboard': 'nav.dashboard',
  '/transactions': 'nav.transactions',
  '/reports': 'nav.reports',
  '/companies': 'nav.companies',
  '/settings': 'nav.settings',
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { t } = useTranslation();
  const location = useLocation();
  const titleKey = pageTitles[location.pathname];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-[#0d0d0d] overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} title={titleKey ? t(titleKey) : undefined} />
        <main className="flex-1 overflow-y-auto" style={{ width: '100%' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
