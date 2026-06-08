import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDark, useThemeStore } from './store/themeStore';
import { useCompanyStore } from './store/companyStore';
import { useTransactionStore } from './store/transactionStore';
import { useInvoiceStore } from './store/invoiceStore';
import { useWarehouseStore } from './store/warehouseStore';
import { getLocalUserId, getDisplayName } from './lib/firebase';
import { useAuthStore } from './store/authStore';
import { NameLoginPage } from './pages/Auth/NameLoginPage';
import { AppShell } from './components/layout/AppShell';
import { WelcomePage } from './pages/Welcome/WelcomePage';
import { CompaniesPage } from './pages/Companies/CompaniesPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { TransactionsPage } from './pages/Transactions/TransactionsPage';
import { ReportsPage } from './pages/Reports/ReportsPage';
import { InvoicesPage } from './pages/Invoices/InvoicesPage';
import { WarehousePage } from './pages/Warehouse/WarehousePage';

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const dark = useDark();
  const mode = useThemeStore((s) => s.mode);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }, [dark]);
  useEffect(() => {
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => document.documentElement.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [mode]);
  return <>{children}</>;
}

function Splash() {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0c0c0e', gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <path d="M4 24V4l8 10 8-10v20" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316', animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`, opacity: 0.7 }} />
        ))}
      </div>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>Načítavam dáta…</p>
      <style>{`@keyframes pulse { 0%,100%{transform:scale(0.7);opacity:0.4} 50%{transform:scale(1);opacity:1} }`}</style>
    </div>
  );
}

function AppLoader() {
  const [ready,      setReady]      = useState(false);
  const [hasName,    setHasName]    = useState(() => !!getDisplayName());
  const [firebaseErr, setFirebaseErr] = useState('');
  const { updateProfile } = useAuthStore();

  useEffect(() => {
    const userId = getLocalUserId();
    Promise.all([
      useCompanyStore.getState().loadForUser(userId),
      useTransactionStore.getState().loadForUser(userId),
      useInvoiceStore.getState().loadForUser(userId),
      useWarehouseStore.getState().loadForUser(userId),
    ]).catch((e) => {
      setFirebaseErr(String(e?.message ?? e));
    }).finally(() => setReady(true));
  }, []);

  // Sync display name into authStore so DashboardPage can show it
  useEffect(() => {
    const name = getDisplayName();
    if (name) updateProfile({ name });
  }, [hasName]);

  if (!ready) return <Splash />;

  if (firebaseErr) return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0c0c0e', padding: 24, gap: 16 }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/></svg>
      </div>
      <p style={{ color: '#fff', fontWeight: 700, fontSize: 16, margin: 0 }}>Chyba pripojenia na Firebase</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', maxWidth: 400 }}>
        Skontroluj Firestore pravidlá — nastav ich na <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>allow read, write: if true</code>
      </p>
      <p style={{ color: '#ef4444', fontSize: 12, textAlign: 'center', maxWidth: 480, fontFamily: 'monospace', background: 'rgba(239,68,68,0.1)', padding: '10px 16px', borderRadius: 8 }}>
        {firebaseErr}
      </p>
      <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', borderRadius: 10, background: '#f97316', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
        Skúsiť znova
      </button>
    </div>
  );

  if (!hasName) {
    return (
      <NameLoginPage onDone={() => {
        const name = getDisplayName();
        if (name) updateProfile({ name });
        setHasName(true);
      }} />
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"          element={<WelcomePage />} />
        <Route path="/companies" element={<CompaniesPage />} />

        <Route element={<AppShell />}>
          <Route path="/dashboard"    element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/reports"      element={<ReportsPage />} />
          <Route path="/settings"     element={<SettingsPage />} />
          <Route path="/invoices"     element={<InvoicesPage />} />
          <Route path="/warehouse"    element={<WarehousePage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppLoader />
    </ThemeProvider>
  );
}
