import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Globe, Palette, Building2, HardDrive, Bell, BellOff, BellRing, HelpCircle, Info, Sun, Moon, Monitor, Download, Upload, Smartphone } from 'lucide-react';
import { requestNotificationPermission, getNotificationPermission } from '../../utils/browserNotifications';
import { ensurePushSubscription, removePushSubscription } from '../../lib/push';
import { writeBatch, doc as fsDoc } from 'firebase/firestore';
import { db, getLocalUserId } from '../../lib/firebase';
import { useThemeStore, useDark } from '../../store/themeStore';
import type { ThemeMode } from '../../store/themeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useCompanyStore } from '../../store/companyStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useInvoiceStore } from '../../store/invoiceStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import { Button } from '../../components/common/Button';

/* ── Toggle switch ──────────────────────────────────────────── */
function ToggleSwitch({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  const dark = useDark();
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <p style={{ fontSize: 13, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.85)' : '#1a1a2e', margin: 0 }}>{label}</p>
        {desc && <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af', margin: '2px 0 0' }}>{desc}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
          background: checked ? '#f97316' : (dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'),
          position: 'relative', transition: 'background 0.2s ease', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: checked ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%', background: '#fff',
          transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </button>
    </div>
  );
}

/* ── Section card ───────────────────────────────────────────── */
function Card({ icon, iconBg, iconColor, title, desc, children }: {
  icon: React.ReactNode; iconBg: string; iconColor: string;
  title: string; desc: string; children: React.ReactNode;
}) {
  const dark = useDark();
  return (
    <div style={{
      borderRadius: 20,
      border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
      background: dark ? 'rgba(255,255,255,0.02)' : '#ffffff',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '18px 22px',
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}`,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 12,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, color: iconColor,
        }}>
          {icon}
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 600, color: dark ? '#fff' : '#111827', margin: 0 }}>{title}</p>
          <p style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.35)' : '#9ca3af', margin: '2px 0 0' }}>{desc}</p>
        </div>
      </div>
      <div style={{ padding: '20px 22px' }}>
        {children}
      </div>
    </div>
  );
}

/* ── PWA install prompt ─────────────────────────────────────── */
type BeforeInstallPromptEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };

/* ── Page ───────────────────────────────────────────────────── */
export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const dark = useDark();
  const { mode, setMode } = useThemeStore();
  const { showTooltips, notifyErrors, notifyDeadlines, notifyBrowser, setShowTooltips, setNotifyErrors, setNotifyDeadlines, setNotifyBrowser, resetHints } = useSettingsStore();
  const { getActiveCompany, setActiveCompany } = useCompanyStore();
  const { simpleTransactions, journalEntries } = useTransactionStore();
  const { invoices } = useInvoiceStore();
  const { items: warehouseItems, movements: stockMovements } = useWarehouseStore();

  const activeCompany = getActiveCompany();
  const allCompanies = useCompanyStore((s) => s.companies);
  const importRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notifPermission, setNotifPermission] = useState<string>(() => getNotificationPermission());

  async function handleRequestPermission() {
    const result = await requestNotificationPermission();
    setNotifPermission(result);
    if (result === 'granted') {
      setNotifyBrowser(true);
      ensurePushSubscription();
    } else {
      setNotifyBrowser(false);
    }
  }

  function handleToggleBrowser(v: boolean) {
    setNotifyBrowser(v);
    if (v) ensurePushSubscription();
    else removePushSubscription();
  }

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener('beforeinstallprompt', handler);
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') setInstallPrompt(null);
  };

  const bg = dark ? '#0c0c0e' : '#f8f9fb';
  const text = dark ? '#ffffff' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  function changeLang(lang: string) {
    i18n.changeLanguage(lang);
    localStorage.setItem('nelka_lang', lang);
  }

  function exportData() {
    const data = {
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      companies: allCompanies,
      simpleTransactions,
      journalEntries,
      invoices,
      warehouseItems,
      stockMovements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `nelka-backup-${new Date().toISOString().split('T')[0]}.json`,
    });
    a.click();
    URL.revokeObjectURL(a.href);
  }

  /** Zapíše obnovené záznamy aj do Firestore — bez toho by obnova zmizla po refreshi. */
  async function persistToFirestore(col: string, records: { id: string }[]) {
    const userId = getLocalUserId();
    // po dávkach max 400 (limit writeBatch je 500)
    for (let i = 0; i < records.length; i += 400) {
      const batch = writeBatch(db);
      for (const rec of records.slice(i, i + 400)) {
        if (!rec.id) continue;
        const { ownerId: _ownerId, ...rest } = rec as { id: string; ownerId?: string };
        batch.set(fsDoc(db, col, rec.id), { userId, ...rest });
      }
      await batch.commit();
    }
  }

  function importBackup(file: File) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const raw = e.target?.result as string;
        const data = JSON.parse(raw);
        if (data.version === undefined) throw new Error('Neplatny format suboru (chyba verzia)');

        const companies = Array.isArray(data.companies) ? data.companies : [];
        const simple = Array.isArray(data.simpleTransactions) ? data.simpleTransactions : [];
        const journal = Array.isArray(data.journalEntries) ? data.journalEntries : [];
        const invs = Array.isArray(data.invoices) ? data.invoices : [];
        const whItems = Array.isArray(data.warehouseItems) ? data.warehouseItems : [];
        const whMoves = Array.isArray(data.stockMovements) ? data.stockMovements : [];

        // 1. Trvalý zápis do cloudu
        await persistToFirestore('companies', companies);
        await persistToFirestore('simple_transactions', simple);
        await persistToFirestore('journal_entries', journal);
        await persistToFirestore('invoices', invs);
        await persistToFirestore('warehouse_items', whItems);
        await persistToFirestore('stock_movements', whMoves);

        // 2. Okamžitá aktualizácia UI
        if (companies.length) useCompanyStore.setState({ companies });
        if (simple.length || journal.length) {
          useTransactionStore.setState({ simpleTransactions: simple, journalEntries: journal });
        }
        if (invs.length) useInvoiceStore.setState({ invoices: invs });
        if (whItems.length || whMoves.length) {
          useWarehouseStore.setState((s) => ({
            items: whItems.length ? whItems : s.items,
            movements: whMoves.length ? whMoves : s.movements,
          }));
        }

        setImportMsg({ type: 'success', text: 'Zaloha bola obnovena a ulozena do cloudu.' });
        setTimeout(() => setImportMsg(null), 5000);
      } catch (err) {
        setImportMsg({ type: 'error', text: `Chyba: ${err instanceof Error ? err.message : 'Neplatny subor'}` });
        setTimeout(() => setImportMsg(null), 6000);
      }
    };
    reader.readAsText(file);
  }

  // Data stats
  const totalTx = simpleTransactions.length + journalEntries.length;
  const totalInv = invoices.length;
  const totalWh = warehouseItems.length;

  const themeModes: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('settings.appearance.light'), icon: <Sun size={16} /> },
    { value: 'dark', label: t('settings.appearance.dark'), icon: <Moon size={16} /> },
    { value: 'system', label: t('settings.appearance.system'), icon: <Monitor size={16} /> },
  ];

  return (
    <div style={{ minHeight: '100%', background: bg, fontFamily: "'Inter', system-ui, sans-serif", padding: '28px 24px' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: text, marginBottom: 4, letterSpacing: '-0.02em' }}>
          {t('settings.title')}
        </h2>

        {/* Install as app */}
        {!isInstalled && (
          <div style={{
            borderRadius: 20, padding: '18px 22px',
            background: dark ? 'rgba(249,115,22,0.08)' : '#fff7ed',
            border: `1px solid ${dark ? 'rgba(249,115,22,0.2)' : '#fed7aa'}`,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Smartphone size={20} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: text, margin: 0 }}>Nainštalovať aplikáciu</p>
              <p style={{ fontSize: 12, color: muted, margin: '2px 0 0' }}>Pridajte Nelka na plochu pre rýchlejší prístup</p>
            </div>
            {installPrompt ? (
              <button onClick={handleInstall} style={{ padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                Nainštalovať
              </button>
            ) : (
              <span style={{ fontSize: 11, color: muted }}>Otvorte cez Chrome</span>
            )}
          </div>
        )}

        {/* Database stats */}
        <div style={{
          borderRadius: 20, padding: '18px 22px',
          background: dark ? 'rgba(255,255,255,0.02)' : '#fff',
          border: `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
          display: 'flex', gap: 0,
        }}>
          {[
            { label: 'Firmy', value: allCompanies.length, color: '#f97316' },
            { label: 'Transakcie', value: totalTx, color: '#3b82f6' },
            { label: 'Faktúry', value: totalInv, color: '#10b981' },
            { label: 'Sklad', value: totalWh, color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={s.label} style={{ flex: 1, textAlign: 'center', borderRight: i < 3 ? `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}` : 'none' }}>
              <p style={{ fontSize: 22, fontWeight: 800, color: s.color, margin: 0, letterSpacing: '-0.03em' }}>{s.value}</p>
              <p style={{ fontSize: 10, color: muted, margin: '2px 0 0', fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Language */}
        <Card icon={<Globe size={18} />} iconBg={dark ? 'rgba(59,130,246,0.15)' : '#eff6ff'} iconColor="#3b82f6"
          title={t('settings.language.title')} desc={t('settings.language.desc')}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[{ code: 'sk', flag: '🇸🇰', label: 'Slovenčina' }, { code: 'en', flag: '🇬🇧', label: 'English' }].map(({ code, flag, label }) => {
              const active = i18n.language === code;
              return (
                <button key={code} onClick={() => changeLang(code)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '14px 16px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: active ? (dark ? 'rgba(249,115,22,0.15)' : '#fff7ed') : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                  outline: active ? '2px solid #f97316' : `1px solid ${inputBorder}`,
                  outlineOffset: active ? -2 : -1,
                  transition: 'all 0.15s ease', fontFamily: 'inherit',
                }}>
                  <span style={{ fontSize: 26, lineHeight: 1 }}>{flag}</span>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: active ? '#f97316' : text, margin: 0 }}>{label}</p>
                    <p style={{ fontSize: 10, color: muted, margin: 0 }}>{code.toUpperCase()}</p>
                  </div>
                  {active && <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#f97316', flexShrink: 0 }} />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Appearance */}
        <Card icon={<Palette size={18} />} iconBg={dark ? 'rgba(139,92,246,0.15)' : '#f5f3ff'} iconColor="#8b5cf6"
          title={t('settings.appearance.title')} desc={t('settings.appearance.desc')}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {themeModes.map((m) => {
              const active = mode === m.value;
              return (
                <button key={m.value} onClick={() => setMode(m.value)} style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  padding: '16px 12px', borderRadius: 14, border: 'none', cursor: 'pointer',
                  background: active ? (dark ? 'rgba(249,115,22,0.15)' : '#fff7ed') : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                  outline: active ? '2px solid #f97316' : `1px solid ${inputBorder}`,
                  outlineOffset: active ? -2 : -1,
                  transition: 'all 0.15s ease', fontFamily: 'inherit',
                }}>
                  <span style={{ color: active ? '#f97316' : muted }}>{m.icon}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: active ? '#f97316' : text }}>{m.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Companies */}
        <Card icon={<Building2 size={18} />} iconBg={dark ? 'rgba(249,115,22,0.15)' : '#fff7ed'} iconColor="#f97316"
          title={t('settings.companies.title')} desc={t('settings.companies.desc')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {allCompanies.length === 0
              ? <p style={{ fontSize: 13, color: muted }}>{t('companies.empty')}</p>
              : allCompanies.map((c) => {
                const active = activeCompany?.id === c.id;
                return (
                  <button key={c.id} onClick={() => setActiveCompany(c.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '11px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: active ? (dark ? 'rgba(249,115,22,0.12)' : '#fff7ed') : (dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'),
                    outline: active ? '1.5px solid rgba(249,115,22,0.4)' : `1px solid ${inputBorder}`,
                    outlineOffset: -1, textAlign: 'left', fontFamily: 'inherit',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: active ? '#f97316' : (dark ? 'rgba(255,255,255,0.2)' : '#d1d5db') }} />
                    <span style={{ fontSize: 13, fontWeight: 500, color: text, flex: 1 }}>{c.name}</span>
                    {active && <span style={{ fontSize: 11, color: '#f97316', fontWeight: 600 }}>{t('settings.companies.active')}</span>}
                  </button>
                );
              })
            }
          </div>
          <Button variant="secondary" size="sm" onClick={() => navigate('/companies')}>{t('settings.companies.manage')}</Button>
        </Card>

        {/* Backup & Export */}
        <Card icon={<HardDrive size={18} />} iconBg={dark ? 'rgba(245,158,11,0.15)' : '#fffbeb'} iconColor="#f59e0b"
          title={t('settings.backup.title')} desc={t('settings.backup.desc')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            <button onClick={exportData} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: `1px solid ${inputBorder}`, cursor: 'pointer', background: 'transparent', color: text, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              <Download size={13} /> {t('settings.backup.export_json')}
            </button>
            <button
              onClick={() => importRef.current?.click()}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 10, border: `1px solid ${inputBorder}`, cursor: 'pointer', background: 'transparent', color: text, fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}
            >
              <Upload size={13} /> Importovat zalohu
            </button>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) { importBackup(f); e.target.value = ''; } }}
            />
          </div>
          {importMsg && (
            <div style={{
              padding: '9px 14px', borderRadius: 10, marginBottom: 10,
              background: importMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
              border: `1px solid ${importMsg.type === 'success' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
              color: importMsg.type === 'success' ? '#10b981' : '#ef4444',
              fontSize: 12, fontWeight: 500,
            }}>
              {importMsg.text}
            </div>
          )}
          <p style={{ fontSize: 11, color: muted }}>
            Zaloha obsahuje vsetky firmy, transakcie, faktury a sklad. Data su synchronizovane s Firebase Firestore.
          </p>
        </Card>

        {/* Notifications */}
        <Card icon={<Bell size={18} />} iconBg={dark ? 'rgba(236,72,153,0.15)' : '#fdf2f8'} iconColor="#ec4899"
          title={t('settings.notifications.title')} desc={t('settings.notifications.desc')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ToggleSwitch checked={notifyErrors} onChange={setNotifyErrors} label={t('settings.notifications.errors')} />
            <ToggleSwitch checked={notifyDeadlines} onChange={setNotifyDeadlines} label={t('settings.notifications.deadlines')} />

            <div style={{ height: 1, background: dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }} />

            {/* Browser / OS notifications */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {notifPermission === 'granted'
                    ? <BellRing size={15} color="#10b981" />
                    : notifPermission === 'denied'
                    ? <BellOff size={15} color="#ef4444" />
                    : <Bell size={15} color={muted} />}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.85)' : '#1a1a2e', margin: 0 }}>
                      {t('settings.notifications.browser')}
                    </p>
                    <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>
                      {notifPermission === 'granted'
                        ? t('settings.notifications.browser_granted')
                        : notifPermission === 'denied'
                        ? t('settings.notifications.browser_denied')
                        : t('settings.notifications.browser_desc')}
                    </p>
                  </div>
                </div>

                {notifPermission === 'granted' ? (
                  <button
                    onClick={() => handleToggleBrowser(!notifyBrowser)}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', flexShrink: 0,
                      background: notifyBrowser ? '#f97316' : (dark ? 'rgba(255,255,255,0.12)' : '#e5e7eb'),
                      position: 'relative', transition: 'background 0.2s ease',
                    }}
                  >
                    <span style={{
                      position: 'absolute', top: 3, left: notifyBrowser ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                ) : notifPermission === 'unsupported' ? (
                  <span style={{ fontSize: 11, color: muted }}>{t('settings.notifications.browser_unsupported')}</span>
                ) : notifPermission === 'denied' ? (
                  <span style={{ fontSize: 11, color: '#ef4444' }}>{t('settings.notifications.browser_denied_hint')}</span>
                ) : (
                  <button
                    onClick={handleRequestPermission}
                    style={{
                      padding: '7px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                      background: '#ec4899', color: '#fff', fontSize: 12, fontWeight: 600,
                      fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    {t('settings.notifications.browser_grant')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Help */}
        <Card icon={<HelpCircle size={18} />} iconBg={dark ? 'rgba(14,165,233,0.15)' : '#f0f9ff'} iconColor="#0ea5e9"
          title={t('settings.help.title')} desc={t('settings.help.desc')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <ToggleSwitch checked={showTooltips} onChange={setShowTooltips} label={t('settings.help.tooltips')} />
            <Button variant="secondary" size="sm" onClick={resetHints}>{t('settings.help.reset')}</Button>
          </div>
        </Card>

        {/* About */}
        <Card icon={<Info size={18} />} iconBg={dark ? 'rgba(255,255,255,0.08)' : '#f3f4f6'} iconColor={muted}
          title={t('settings.about.title')} desc={t('settings.about.desc')}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              ['Verzia', '1.2.0'],
              ['Databáza', 'Firebase Firestore'],
              ['Licencia', 'Furiel'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'}` }}>
                <span style={{ fontSize: 12, color: muted }}>{k}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: text }}>{v}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
