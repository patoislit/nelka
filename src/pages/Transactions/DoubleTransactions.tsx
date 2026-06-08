import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, AlertCircle, CheckCircle2, HelpCircle, X, BookOpen } from 'lucide-react';
import { useTransactionStore, centsToEur, eurToCents, isBalanced } from '../../store/transactionStore';
import type { JournalLine } from '../../store/transactionStore';
import { DEFAULT_ACCOUNTS } from '../../store/chartOfAccountsStore';
import { useDark } from '../../store/themeStore';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useSettingsStore } from '../../store/settingsStore';
import { GuideBar } from '../../components/common/GuideBar';
import { useNotificationStore } from '../../store/notificationStore';
import { checkDphAndNotify } from '../../utils/dphNotifications';

interface Props { companyId: string; userId: string; }

function newLine(): JournalLine {
  return { id: crypto.randomUUID(), accountCode: '', accountName: '', debitCents: 0, creditCents: 0 };
}

type ActiveTab = 'journal' | 'accounts';

export function DoubleTransactions({ companyId, userId }: Props) {
  const { t } = useTranslation();
  const dark = useDark();
  const { addJournalEntry, deleteJournalEntry, getJournalEntries } = useTransactionStore();
  const { showTooltips } = useSettingsStore();
  const { addNotification } = useNotificationStore();

  const entries = getJournalEntries(companyId);

  const [tab, setTab] = useState<ActiveTab>('journal');
  const [open, setOpen] = useState(false);
  const [hintOpen, setHintOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [desc, setDesc] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([newLine(), newLine()]);
  // Raw string values for debit/credit inputs – avoids type="number" quirks
  const [rawValues, setRawValues] = useState<Record<string, { md: string; d: string }>>({});
  const [saveError, setSaveError] = useState('');

  const totalDebit = lines.reduce((s, l) => s + l.debitCents, 0);
  const totalCredit = lines.reduce((s, l) => s + l.creditCents, 0);
  const balanced = isBalanced(lines);
  const diff = totalDebit - totalCredit;

  const bg = dark ? '#0c0c0e' : '#f8f9fb';
  const cardBg = dark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const text = dark ? '#ffffff' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af';
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : '#f9fafb';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 10,
    border: `1px solid ${inputBorder}`, background: inputBg,
    color: text, fontSize: 12, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };

  function openModal() {
    const initLines = [newLine(), newLine()];
    setDate(new Date().toISOString().split('T')[0]);
    setDesc('');
    setLines(initLines);
    setRawValues({});
    setSaveError('');
    setOpen(true);
  }

  function setLine(idx: number, patch: Partial<JournalLine>) {
    setLines((ls) => ls.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }

  function setAccountForLine(idx: number, code: string) {
    const acc = DEFAULT_ACCOUNTS.find((a) => a.code === code);
    setLine(idx, { accountCode: code, accountName: acc?.name ?? '' });
  }

  function getRaw(id: string, side: 'md' | 'd'): string {
    return rawValues[id]?.[side] ?? '';
  }

  function handleDebitChange(idx: number, id: string, val: string) {
    // Allow free typing: only numbers, comma, period
    const clean = val.replace(/[^0-9.,]/g, '');
    setRawValues((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { md: '', d: '' }), md: clean, d: '' } }));
    setLine(idx, { debitCents: eurToCents(clean), creditCents: 0 });
  }

  function handleCreditChange(idx: number, id: string, val: string) {
    const clean = val.replace(/[^0-9.,]/g, '');
    setRawValues((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { md: '', d: '' }), d: clean, md: '' } }));
    setLine(idx, { creditCents: eurToCents(clean), debitCents: 0 });
  }

  function addLine() {
    setLines((ls) => [...ls, newLine()]);
  }

  function removeLine(idx: number, id: string) {
    setLines((ls) => ls.filter((_, i) => i !== idx));
    setRawValues((prev) => { const n = { ...prev }; delete n[id]; return n; });
  }

  function handleSave() {
    if (!balanced) { setSaveError(t('journal.balance_error')); return; }
    if (!desc.trim()) { setSaveError('Zadajte popis zápisu.'); return; }
    const result = addJournalEntry({ companyId, date, description: desc, lines, createdBy: userId });
    if (!result) { setSaveError(t('journal.balance_error')); return; }
    // Check DPH after saving
    const updatedEntries = getJournalEntries(companyId);
    checkDphAndNotify(companyId, updatedEntries, addNotification);
    setOpen(false);
  }

  // Derive account balances directly from journal entries — no dependency on chartStore
  const accountsWithBalance = useMemo(() => {
    const map: Record<string, { code: string; name: string; type: string; debitCents: number; creditCents: number }> = {};
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (!map[line.accountCode]) {
          const cls = parseInt(line.accountCode[0] ?? '0', 10);
          let type = 'asset';
          if (cls === 5) type = 'expense';
          else if (cls === 6) type = 'revenue';
          else if (cls === 4) type = 'equity';
          else if (cls === 3) type = parseInt(line.accountCode, 10) < 320 ? 'asset' : 'liability';
          map[line.accountCode] = { code: line.accountCode, name: line.accountName, type, debitCents: 0, creditCents: 0 };
        }
        map[line.accountCode].debitCents  += line.debitCents;
        map[line.accountCode].creditCents += line.creditCents;
      }
    }
    return Object.values(map).sort((a, b) => a.code.localeCompare(b.code));
  }, [entries]);

  return (
    <div style={{ minHeight: '100%', background: bg, fontFamily: "'Inter', system-ui, sans-serif", padding: '28px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <GuideBar
          id="double-tx-guide"
          icon={<BookOpen size={15} />}
          title={t('guide.double_tx_title')}
          body={t('guide.double_tx_body')}
          type="info"
        />

        {/* Helper hint */}
        {showTooltips && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            padding: '16px 18px', borderRadius: 16, marginBottom: 20,
            background: dark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
            border: `1px solid ${dark ? 'rgba(59,130,246,0.2)' : '#bfdbfe'}`,
          }}>
            <HelpCircle size={18} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: dark ? '#93c5fd' : '#1d4ed8', margin: 0 }}>{t('journal.hint_title')}</p>
              <p style={{ fontSize: 12, color: dark ? 'rgba(147,197,253,0.7)' : '#3b82f6', margin: '3px 0 0', lineHeight: 1.5 }}>{t('journal.hint_body')}</p>
            </div>
            <button
              onClick={() => setHintOpen(true)}
              style={{ fontSize: 12, color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, flexShrink: 0, padding: 0 }}
            >
              Príklad
            </button>
          </div>
        )}

        {/* Tabs */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2, marginBottom: 24,
          background: dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6',
          borderRadius: 12, padding: 4, width: 'fit-content',
        }}>
          {(['journal', 'accounts'] as ActiveTab[]).map((t_) => (
            <button key={t_} onClick={() => setTab(t_)} style={{
              padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s',
              background: tab === t_ ? (dark ? '#1a1a2e' : '#fff') : 'transparent',
              color: tab === t_ ? text : muted,
              boxShadow: tab === t_ ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
              {t_ === 'journal' ? t('journal.title') : t('accounts.title')}
            </button>
          ))}
        </div>

        {tab === 'journal' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: text, margin: 0 }}>{t('journal.title')}</h3>
                <p style={{ fontSize: 12, color: muted, margin: '3px 0 0' }}>{entries.length} zápis{entries.length !== 1 ? 'ov' : ''}</p>
              </div>
              <button onClick={openModal} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600,
                fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
              }}>
                <Plus size={15} /> {t('journal.add')}
              </button>
            </div>

            {entries.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '64px 24px',
                borderRadius: 20, background: cardBg, border: `1px solid ${cardBorder}`, textAlign: 'center',
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 16,
                  background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
                }}>
                  <BookOpen size={22} color="#f97316" />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: text, margin: 0 }}>{t('journal.empty')}</p>
                <p style={{ fontSize: 13, color: muted, marginTop: 4, marginBottom: 20 }}>{t('journal.empty_desc')}</p>
                <button onClick={openModal} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                  background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                }}>
                  <Plus size={14} /> {t('journal.add')}
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {entries.map((entry) => {
                  const entryDebit = entry.lines.reduce((s, l) => s + l.debitCents, 0);
                  return (
                    <div key={entry.id} style={{ borderRadius: 18, background: cardBg, border: `1px solid ${cardBorder}`, overflow: 'hidden' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 18px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'}`,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, color: '#f97316',
                            background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed',
                            padding: '2px 8px', borderRadius: 999,
                          }}>#{entry.entryNo}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: text }}>{entry.description}</span>
                          <span style={{ fontSize: 12, color: muted }}>{entry.date}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: text, fontVariantNumeric: 'tabular-nums' }}>{centsToEur(entryDebit)} €</span>
                          <button
                            onClick={() => deleteJournalEntry(entry.id)}
                            style={{ padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: muted, display: 'flex', alignItems: 'center' }}
                            onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.1)' : '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ background: dark ? 'rgba(255,255,255,0.02)' : '#fafafa' }}>
                            <th style={{ textAlign: 'left', padding: '8px 18px', color: muted, fontWeight: 500, width: 80 }}>Účet</th>
                            <th style={{ textAlign: 'left', padding: '8px 10px', color: muted, fontWeight: 500 }}>Názov</th>
                            <th style={{ textAlign: 'right', padding: '8px 18px', color: muted, fontWeight: 500, width: 120 }}>MD</th>
                            <th style={{ textAlign: 'right', padding: '8px 18px', color: muted, fontWeight: 500, width: 120 }}>D</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.lines.map((line) => (
                            <tr key={line.id} style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}` }}>
                              <td style={{ padding: '10px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#f97316', fontSize: 13 }}>{line.accountCode}</td>
                              <td style={{ padding: '10px 10px', color: dark ? 'rgba(255,255,255,0.7)' : '#374151' }}>{line.accountName}</td>
                              <td style={{ padding: '10px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: text, fontWeight: 500 }}>
                                {line.debitCents > 0 ? centsToEur(line.debitCents) : ''}
                              </td>
                              <td style={{ padding: '10px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: text, fontWeight: 500 }}>
                                {line.creditCents > 0 ? centsToEur(line.creditCents) : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table></div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'accounts' && (
          <div style={{ borderRadius: 20, background: cardBg, border: `1px solid ${cardBorder}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBorder}`, background: dark ? 'rgba(255,255,255,0.02)' : '#fafafa' }}>
                  <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', width: 70 }}>Kód</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Názov</th>
                  <th style={{ textAlign: 'left', padding: '12px 10px', fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Typ</th>
                  <th style={{ textAlign: 'right', padding: '12px 18px', fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}>MD</th>
                  <th style={{ textAlign: 'right', padding: '12px 18px', fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', width: 110 }}>D</th>
                </tr>
              </thead>
              <tbody>
                {accountsWithBalance.map((a) => (
                  <tr key={a.code} style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'}` }}>
                    <td style={{ padding: '11px 18px', fontFamily: 'monospace', fontWeight: 600, color: '#f97316', fontSize: 12 }}>{a.code}</td>
                    <td style={{ padding: '11px 10px', fontWeight: 500, color: dark ? 'rgba(255,255,255,0.8)' : '#1f2937' }}>{a.name}</td>
                    <td style={{ padding: '11px 10px' }}><AccountTypeBadge type={a.type} dark={dark} /></td>
                    <td style={{ padding: '11px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: muted }}>
                      {a.debitCents > 0 ? centsToEur(a.debitCents) : '—'}
                    </td>
                    <td style={{ padding: '11px 18px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: 12, color: muted }}>
                      {a.creditCents > 0 ? centsToEur(a.creditCents) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Journal entry modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={t('journal.add')} size="lg">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, fontFamily: "'Inter', system-ui, sans-serif" }}>

          {/* Date + Description */}
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dátum</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Popis zápisu</label>
              <input placeholder="Napr. Úhrada faktúry od dodávateľa..." value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Lines table */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Účtovné riadky
            </label>

            {/* Column headers */}
            <div style={{
              display: 'grid', gridTemplateColumns: '130px 1fr 110px 110px 28px',
              gap: 8, paddingBottom: 6, paddingLeft: 2,
              borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#f0f0f0'}`,
              marginBottom: 8,
            }}>
              {['Kód účtu', 'Názov', 'Má Dať (MD)', 'Dal (D)', ''].map((h, i) => (
                <span key={i} style={{
                  fontSize: 10, fontWeight: 600, color: muted,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  textAlign: i >= 2 && i < 4 ? 'right' : 'left',
                }}>
                  {h}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {lines.map((line, idx) => (
                <div key={line.id} style={{
                  display: 'grid', gridTemplateColumns: '140px 1fr 120px 120px 28px',
                  gap: 8, alignItems: 'center',
                  padding: '10px 14px', borderRadius: 14,
                  background: dark ? 'rgba(255,255,255,0.025)' : '#fafafa',
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : '#efefef'}`,
                }}>

                  {/* Account selector */}
                  <select
                    value={line.accountCode}
                    onChange={(e) => setAccountForLine(idx, e.target.value)}
                    style={{
                      ...inputStyle, padding: '9px 10px',
                      fontFamily: "'Courier New', monospace", fontWeight: 700,
                      color: line.accountCode ? '#f97316' : muted, fontSize: 13,
                      // Solid background so dropdown options are readable in dark mode
                      background: dark ? '#1c1c1f' : '#f9fafb',
                    }}
                  >
                    <option value="" style={{ background: dark ? '#1c1c1f' : '#fff', color: dark ? '#9ca3af' : '#374151' }}>— účet —</option>
                    {[0, 1, 2, 3, 4, 5, 6].map((cls) => {
                      const grp = DEFAULT_ACCOUNTS.filter((a) => a.class === cls);
                      if (!grp.length) return null;
                      return (
                        <optgroup key={cls} label={`Trieda ${cls}`} style={{ background: dark ? '#1c1c1f' : '#fff', color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280' }}>
                          {grp.map((a) => (
                            <option key={a.code} value={a.code} style={{ background: dark ? '#1c1c1f' : '#fff', color: dark ? '#f4f4f5' : '#111827' }}>
                              {a.code} – {a.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>

                  {/* Account name */}
                  <input
                    readOnly value={line.accountName}
                    placeholder="Automaticky doplnené"
                    style={{ ...inputStyle, padding: '9px 10px', background: 'transparent', border: 'none', color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af', fontSize: 12 }}
                  />

                  {/* MD – text input, free typing */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={getRaw(line.id, 'md')}
                      onChange={(e) => handleDebitChange(idx, line.id, e.target.value)}
                      style={{
                        ...inputStyle, padding: '9px 28px 9px 10px',
                        textAlign: 'right', fontFamily: "'Courier New', monospace",
                        fontWeight: 600, fontSize: 13,
                        color: line.debitCents > 0 ? '#10b981' : muted,
                        background: line.debitCents > 0
                          ? (dark ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.05)')
                          : inputStyle.background,
                        borderColor: line.debitCents > 0 ? 'rgba(16,185,129,0.3)' : inputStyle.borderColor as string,
                      }}
                    />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: muted, pointerEvents: 'none' }}>€</span>
                  </div>

                  {/* D – text input, free typing */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={getRaw(line.id, 'd')}
                      onChange={(e) => handleCreditChange(idx, line.id, e.target.value)}
                      style={{
                        ...inputStyle, padding: '9px 28px 9px 10px',
                        textAlign: 'right', fontFamily: "'Courier New', monospace",
                        fontWeight: 600, fontSize: 13,
                        color: line.creditCents > 0 ? '#3b82f6' : muted,
                        background: line.creditCents > 0
                          ? (dark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.05)')
                          : inputStyle.background,
                        borderColor: line.creditCents > 0 ? 'rgba(59,130,246,0.3)' : inputStyle.borderColor as string,
                      }}
                    />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: muted, pointerEvents: 'none' }}>€</span>
                  </div>

                  {/* Remove */}
                  <button
                    onClick={() => removeLine(idx, line.id)}
                    disabled={lines.length <= 2}
                    style={{
                      width: 28, height: 28, borderRadius: 7, border: 'none', cursor: lines.length <= 2 ? 'not-allowed' : 'pointer',
                      background: 'transparent', color: muted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: lines.length <= 2 ? 0.2 : 1, transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (lines.length > 2) { e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.12)' : '#fef2f2'; e.currentTarget.style.color = '#ef4444'; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addLine}
              style={{
                marginTop: 10, fontSize: 12, color: '#f97316', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                padding: '6px 0', fontFamily: 'inherit',
              }}
            >
              <Plus size={13} /> Pridať riadok
            </button>
          </div>

          {/* Balance bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px', borderRadius: 14,
            background: balanced
              ? (dark ? 'rgba(16,185,129,0.08)' : '#f0fdf4')
              : (dark ? 'rgba(239,68,68,0.08)' : '#fff5f5'),
            border: `1.5px solid ${balanced
              ? (dark ? 'rgba(16,185,129,0.2)' : '#bbf7d0')
              : (dark ? 'rgba(239,68,68,0.2)' : '#fecaca')}`,
            transition: 'all 0.25s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {balanced
                ? <CheckCircle2 size={17} color="#10b981" />
                : <AlertCircle size={17} color="#ef4444" />
              }
              <span style={{ fontSize: 13, fontWeight: 600, color: balanced ? '#10b981' : '#ef4444' }}>
                {balanced ? 'Zápis je vyrovnaný ✓' : 'MD ≠ D – zápis musí byť vyrovnaný'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ color: muted }}>MD: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>{centsToEur(totalDebit)} €</strong></span>
              <span style={{ color: muted }}>D: <strong style={{ color: '#3b82f6', fontFamily: 'monospace' }}>{centsToEur(totalCredit)} €</strong></span>
              {!balanced && diff !== 0 && (
                <span style={{ color: '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>
                  Rozdiel: {centsToEur(Math.abs(diff))} €
                </span>
              )}
            </div>
          </div>

          {saveError && (
            <p style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <AlertCircle size={13} /> {saveError}
            </p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>Zrušiť</Button>
            <Button fullWidth onClick={handleSave} disabled={!balanced || !desc.trim()}>Zaúčtovať</Button>
          </div>
        </div>
      </Modal>

      {/* Example hint modal */}
      <Modal open={hintOpen} onClose={() => setHintOpen(false)} title="Príklad: Predaj služieb" size="md">
        <div style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
          <p style={{ marginBottom: 12 }}>Zákazník zaplatil faktúru 1 200 € za poradenskú službu:</p>
          <div style={{ borderRadius: 12, overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.03)' : '#f9fafb', border: `1px solid ${cardBorder}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBorder}` }}>
                  {['Účet', 'Názov', 'MD', 'D'].map((h, i) => (
                    <th key={i} style={{ padding: '8px 14px', textAlign: i >= 2 ? 'right' : 'left', color: muted, fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}` }}>
                  <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#f97316' }}>221</td>
                  <td style={{ padding: '9px 10px', color: text }}>Bankové účty</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: text }}>1 200,00</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: muted }}>—</td>
                </tr>
                <tr>
                  <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 700, color: '#f97316' }}>602</td>
                  <td style={{ padding: '9px 10px', color: text }}>Tržby z predaja služieb</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: muted }}>—</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontFamily: 'monospace', color: text }}>1 200,00</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, marginTop: 10 }}>MD = Má Dať (kde peniaze prišli), D = Dal (zdroj – výnos). MD musí = D.</p>
        </div>
      </Modal>
    </div>
  );
}

function AccountTypeBadge({ type, dark }: { type: string; dark: boolean }) {
  const colors: Record<string, { bg: string; color: string }> = {
    asset:     { bg: dark ? 'rgba(59,130,246,0.15)' : '#eff6ff', color: '#3b82f6' },
    liability: { bg: dark ? 'rgba(239,68,68,0.15)' : '#fef2f2', color: '#ef4444' },
    equity:    { bg: dark ? 'rgba(139,92,246,0.15)' : '#f5f3ff', color: '#8b5cf6' },
    revenue:   { bg: dark ? 'rgba(16,185,129,0.15)' : '#ecfdf5', color: '#10b981' },
    expense:   { bg: dark ? 'rgba(249,115,22,0.15)' : '#fff7ed', color: '#f97316' },
  };
  const labels: Record<string, string> = {
    asset: 'Aktívum', liability: 'Pasívum', equity: 'Vlastné imanie', revenue: 'Výnos', expense: 'Náklad',
  };
  const c = colors[type] ?? { bg: 'transparent', color: '#9ca3af' };
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 8px', borderRadius: 999,
      fontSize: 11, fontWeight: 500, background: c.bg, color: c.color,
    }}>
      {labels[type] ?? type}
    </span>
  );
}
