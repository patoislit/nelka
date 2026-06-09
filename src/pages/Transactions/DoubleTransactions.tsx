import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen, Search } from 'lucide-react';
import { HelpBubble } from '../../components/common/HelpBubble';
import { useTransactionStore, centsToEur, eurToCents } from '../../store/transactionStore';
import { DEFAULT_ACCOUNTS } from '../../store/chartOfAccountsStore';
import { useDark } from '../../store/themeStore';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { GuideBar } from '../../components/common/GuideBar';
import { useNotificationStore } from '../../store/notificationStore';
import { checkDphAndNotify } from '../../utils/dphNotifications';

interface Props { companyId: string; userId: string; }

// ─── Predkontácie (KROS Omega štýl) ──────────────────────────────────────────
const PREDKONTACIE = [
  { id: 'vfa',      label: 'VFA – Vydaná faktúra (tržby)',          mdCode: '311', dCode: '602' },
  { id: 'vfa_svc',  label: 'VFA – Vydaná faktúra (služby)',         mdCode: '311', dCode: '602' },
  { id: 'vfa_dph',  label: 'VFA – DPH z vydanej faktúry',           mdCode: '311', dCode: '343' },
  { id: 'pfa',      label: 'PFA – Prijatá faktúra (tovar/mat.)',     mdCode: '501', dCode: '321' },
  { id: 'pfa_svc',  label: 'PFA – Prijatá faktúra (služby)',        mdCode: '518', dCode: '321' },
  { id: 'pfa_dph',  label: 'PFA – DPH z prijatej faktúry',          mdCode: '343', dCode: '321' },
  { id: 'bv_in',    label: 'BV+ – Príjem na bankový účet',          mdCode: '221', dCode: '311' },
  { id: 'bv_out',   label: 'BV− – Výdaj z bankového účtu',          mdCode: '321', dCode: '221' },
  { id: 'ppd',      label: 'PPD – Tržba hotovosť (pokladňa)',        mdCode: '211', dCode: '602' },
  { id: 'vpd',      label: 'VPD – Výdaj z pokladne',                mdCode: '501', dCode: '211' },
  { id: 'mzdy',     label: 'ID – Mzdové náklady',                   mdCode: '521', dCode: '331' },
  { id: 'mzdy_sp',  label: 'ID – Odvody zamestnávateľa (SP)',       mdCode: '524', dCode: '336' },
  { id: 'odpisy',   label: 'ID – Odpisy DHM',                       mdCode: '551', dCode: '082' },
  { id: 'pu_bank',  label: 'ID – Bankové poplatky',                  mdCode: '568', dCode: '221' },
  { id: 'custom',   label: '— Vlastná predkontácia —',              mdCode: '',    dCode: '' },
];

const DOC_TYPES = ['BV', 'VFA', 'PFA', 'PPD', 'VPD', 'ID'];

// ─── Riadok dokladu ──────────────────────────────────────────────────────────
interface EntryRow {
  id: string;
  predId: string;
  mdCode: string; mdName: string;
  dCode: string;  dName: string;
  rawAmount: string; amountCents: number;
  note: string;
}

function newRow(predId = '', mdCode = '', dCode = ''): EntryRow {
  return {
    id: crypto.randomUUID(), predId,
    mdCode, mdName: getAccName(mdCode),
    dCode,  dName:  getAccName(dCode),
    rawAmount: '', amountCents: 0, note: '',
  };
}

function getAccName(code: string): string {
  return DEFAULT_ACCOUNTS.find(a => a.code === code)?.name ?? '';
}

function parseAmount(raw: string): number {
  return eurToCents(raw.replace(/\s/g, '').replace(',', '.'));
}

// ─── Autocomplete pre účty ───────────────────────────────────────────────────
function AccountSearch({ value, onSelect, dark, placeholder }: {
  value: string;
  onSelect: (code: string, name: string) => void;
  dark: boolean;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value); }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return DEFAULT_ACCOUNTS
      .filter(a => a.code.startsWith(q) || a.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const border = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const bg = dark ? '#1c1c1f' : '#f9fafb';
  const textColor = dark ? '#f1f5f9' : '#111827';

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 0 }}>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? 'kód alebo názov…'}
          style={{
            width: '100%', padding: '8px 28px 8px 10px', borderRadius: 8,
            border: `1px solid ${value ? '#f97316' : border}`,
            background: bg, color: textColor,
            fontSize: 13, fontFamily: "'Courier New', monospace", fontWeight: value ? 700 : 400,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
        <Search size={12} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', color: dark ? 'rgba(255,255,255,0.25)' : '#d1d5db', pointerEvents: 'none' }} />
      </div>

      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
          background: dark ? '#1c1c1f' : '#fff',
          border: `1px solid ${border}`,
          borderRadius: 8, marginTop: 3,
          maxHeight: 220, overflowY: 'auto',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        }}>
          {filtered.map(a => (
            <button
              key={a.code}
              onMouseDown={e => {
                e.preventDefault();
                onSelect(a.code, a.name);
                setQuery(a.code);
                setOpen(false);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '7px 12px',
                border: 'none', background: 'transparent',
                cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = dark ? 'rgba(249,115,22,0.12)' : '#fff7ed')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#f97316', fontSize: 13, minWidth: 34 }}>{a.code}</span>
              <span style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.65)' : '#374151' }}>{a.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Hlavný komponent ─────────────────────────────────────────────────────────
type ActiveTab = 'journal' | 'accounts';

export function DoubleTransactions({ companyId, userId }: Props) {
  const dark = useDark();
  const { addJournalEntry, deleteJournalEntry, getJournalEntries } = useTransactionStore();
  const { addNotification } = useNotificationStore();

  const entries = getJournalEntries(companyId);

  const [tab, setTab] = useState<ActiveTab>('journal');
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Form state
  const [date, setDate] = useState('');
  const [docType, setDocType] = useState('BV');
  const [docNo, setDocNo] = useState('');
  const [desc, setDesc] = useState('');
  const [rows, setRows] = useState<EntryRow[]>([]);

  // Colors
  const bg       = dark ? '#0c0c0e' : '#f8f9fb';
  const surface  = dark ? '#111113' : '#ffffff';
  const border   = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const text     = dark ? '#f1f5f9' : '#111827';
  const muted    = dark ? 'rgba(255,255,255,0.38)' : '#9ca3af';
  const rowBg    = dark ? 'rgba(255,255,255,0.025)' : '#fafafa';
  const rowBd    = dark ? 'rgba(255,255,255,0.06)' : '#efefef';

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '8px 10px', borderRadius: 8,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
    background: dark ? '#1c1c1f' : '#f9fafb',
    color: text, fontSize: 13, fontFamily: "'Inter', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  };

  // Auto-generate docNo
  function nextDocNo(type: string): string {
    const same = entries.filter(e => e.docType === type);
    return `${type}${String(same.length + 1).padStart(3, '0')}`;
  }

  function openModal() {
    const today = new Date().toISOString().split('T')[0];
    const type = 'BV';
    setDate(today);
    setDocType(type);
    setDocNo(nextDocNo(type));
    setDesc('');
    setRows([newRow()]);
    setOpen(true);
  }

  function handleDocTypeChange(t: string) {
    setDocType(t);
    setDocNo(nextDocNo(t));
  }

  function updateRow(idx: number, patch: Partial<EntryRow>) {
    setRows(rs => rs.map((r, i) => i === idx ? { ...r, ...patch } : r));
  }

  function applyPred(idx: number, predId: string) {
    const pred = PREDKONTACIE.find(p => p.id === predId);
    if (!pred) return;
    updateRow(idx, {
      predId,
      mdCode: pred.mdCode, mdName: getAccName(pred.mdCode),
      dCode:  pred.dCode,  dName:  getAccName(pred.dCode),
    });
  }

  function handleAmountChange(idx: number, val: string) {
    const clean = val.replace(/[^0-9,. ]/g, '');
    updateRow(idx, { rawAmount: clean, amountCents: parseAmount(clean) });
  }

  const totalCents = rows.reduce((s, r) => s + r.amountCents, 0);
  const canSave = rows.length > 0 && rows.every(r => r.mdCode && r.dCode && r.amountCents > 0) && desc.trim();

  function handleSave() {
    if (!canSave) return;
    // Each row → 2 JournalLines (always balanced)
    const lines = rows.flatMap(r => [
      { id: crypto.randomUUID(), accountCode: r.mdCode, accountName: r.mdName, debitCents: r.amountCents, creditCents: 0 },
      { id: crypto.randomUUID(), accountCode: r.dCode,  accountName: r.dName,  debitCents: 0, creditCents: r.amountCents },
    ]);
    addJournalEntry({ companyId, date, description: desc, lines, createdBy: userId, docType, docNo });
    const updated = getJournalEntries(companyId);
    checkDphAndNotify(companyId, updated, addNotification);
    setOpen(false);
  }

  function toggleExpand(id: string) {
    setExpanded(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  const accountsWithBalance = useMemo(() => {
    const map: Record<string, { code: string; name: string; debitCents: number; creditCents: number }> = {};
    for (const entry of entries) {
      for (const line of entry.lines) {
        if (!map[line.accountCode]) map[line.accountCode] = { code: line.accountCode, name: line.accountName, debitCents: 0, creditCents: 0 };
        map[line.accountCode].debitCents  += line.debitCents;
        map[line.accountCode].creditCents += line.creditCents;
      }
    }
    return Object.values(map).sort((a, b) => a.code.localeCompare(b.code));
  }, [entries]);

  return (
    <div style={{ minHeight: '100%', background: bg, fontFamily: "'Inter', system-ui, sans-serif", padding: '28px 24px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <GuideBar id="double-tx-guide" icon={<BookOpen size={15} />}
          title="Podvojné účtovníctvo"
          body="Vyber predkontáciu → doplnia sa účty MD a D automaticky. Zadaj sumu. Každý riadok je vždy vyrovnaný."
          type="info"
        />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {(['journal', 'accounts'] as ActiveTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s',
              background: tab === t ? (dark ? '#1a1a2e' : '#fff') : 'transparent',
              color: tab === t ? text : muted,
              boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
            }}>
              {t === 'journal'
                ? 'Účtovný denník'
                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    Obratová predvaha
                    <HelpBubble position="bottom" text="Prehľad všetkých použitých účtov s celkovými obratmi na strane MD (prírastky) a D (úbytky). Zostatok = MD mínus D. Slúži na rýchlu kontrolu správnosti účtovania." />
                  </span>
              }
            </button>
          ))}
        </div>

        {/* ── DENNÍK ── */}
        {tab === 'journal' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: text, margin: 0 }}>Účtovný denník</h3>
                <p style={{ fontSize: 12, color: muted, margin: '3px 0 0' }}>{entries.length} zápisov</p>
              </div>
              <button onClick={openModal} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600,
                fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
              }}>
                <Plus size={15} /> Nový doklad
              </button>
            </div>

            {entries.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '64px 24px', borderRadius: 20, background: surface,
                border: `1px solid ${border}`, textAlign: 'center',
              }}>
                <div style={{ width: 52, height: 52, borderRadius: 16, background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <BookOpen size={22} color="#f97316" />
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: text, margin: 0 }}>Denník je prázdny</p>
                <p style={{ fontSize: 13, color: muted, marginTop: 4, marginBottom: 20 }}>Začni pridaním prvého dokladu.</p>
                <button onClick={openModal} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                  <Plus size={14} /> Nový doklad
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {entries.map(entry => {
                  const isOpen = expanded.has(entry.id);
                  const total = entry.lines.reduce((s, l) => s + l.debitCents, 0);
                  return (
                    <div key={entry.id} style={{ borderRadius: 16, background: surface, border: `1px solid ${border}`, overflow: 'hidden' }}>
                      {/* Entry header */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '13px 16px', cursor: 'pointer',
                        borderBottom: isOpen ? `1px solid ${border}` : 'none',
                      }}
                        onClick={() => toggleExpand(entry.id)}
                      >
                        <span style={{ color: muted, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                          {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </span>
                        {/* Doc type badge */}
                        {entry.docType && (
                          <span style={{ fontSize: 11, fontWeight: 700, background: dark ? 'rgba(249,115,22,0.15)' : '#fff7ed', color: '#f97316', padding: '2px 8px', borderRadius: 6, flexShrink: 0 }}>
                            {entry.docType}
                          </span>
                        )}
                        {entry.docNo && (
                          <span style={{ fontSize: 12, fontFamily: 'monospace', color: muted, flexShrink: 0 }}>{entry.docNo}</span>
                        )}
                        <span style={{ fontSize: 12, color: muted, flexShrink: 0 }}>{entry.date}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description}</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: text, fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{centsToEur(total)} €</span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteJournalEntry(entry.id); }}
                          style={{ padding: 5, borderRadius: 7, border: 'none', cursor: 'pointer', background: 'transparent', color: muted, display: 'flex', alignItems: 'center', flexShrink: 0 }}
                          onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.1)' : '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Expanded lines */}
                      {isOpen && (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 480 }}>
                            <thead>
                              <tr style={{ background: dark ? 'rgba(255,255,255,0.02)' : '#fafafa' }}>
                                {['Účet', 'Názov', 'MD', 'D'].map((h, i) => (
                                  <th key={i} style={{ padding: '8px 16px', textAlign: i >= 2 ? 'right' : 'left', color: muted, fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {entry.lines.map(line => (
                                <tr key={line.id} style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}` }}>
                                  <td style={{ padding: '9px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#f97316', fontSize: 13 }}>{line.accountCode}</td>
                                  <td style={{ padding: '9px 10px', color: dark ? 'rgba(255,255,255,0.65)' : '#374151' }}>{line.accountName}</td>
                                  <td style={{ padding: '9px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: line.debitCents > 0 ? '#10b981' : 'transparent', fontWeight: 600 }}>
                                    {line.debitCents > 0 ? centsToEur(line.debitCents) : '—'}
                                  </td>
                                  <td style={{ padding: '9px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: line.creditCents > 0 ? '#3b82f6' : 'transparent', fontWeight: 600 }}>
                                    {line.creditCents > 0 ? centsToEur(line.creditCents) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── OBRATOVÁ PREDVAHA ── */}
        {tab === 'accounts' && (
          <div style={{ borderRadius: 16, background: surface, border: `1px solid ${border}`, overflow: 'hidden' }}>
            {accountsWithBalance.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: muted, fontSize: 14 }}>Žiadne záznamy</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}`, background: dark ? 'rgba(255,255,255,0.02)' : '#fafafa' }}>
                    {['Kód', 'Názov účtu', 'Obrat MD', 'Obrat D', 'Zostatok'].map((h, i) => (
                      <th key={i} style={{ padding: '11px 16px', textAlign: i >= 2 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accountsWithBalance.map(a => {
                    const balance = a.debitCents - a.creditCents;
                    return (
                      <tr key={a.code} style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'}` }}>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, color: '#f97316', fontSize: 13 }}>{a.code}</td>
                        <td style={{ padding: '10px 10px', fontWeight: 500, color: text }}>{a.name}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#10b981', fontWeight: 600 }}>{centsToEur(a.debitCents)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#3b82f6', fontWeight: 600 }}>{centsToEur(a.creditCents)}</td>
                        <td style={{ padding: '10px 16px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: balance >= 0 ? text : '#ef4444' }}>
                          {balance >= 0 ? '' : '−'}{centsToEur(Math.abs(balance))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── MODAL: Nový doklad ── */}
      <Modal open={open} onClose={() => setOpen(false)} title="Nový účtovný doklad" size="xl">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'Inter', sans-serif" }}>

          {/* ── Hlavička dokladu ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '140px 100px 150px 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle(muted)}>Dátum</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputBase} />
            </div>
            <div>
              <label style={labelStyle(muted)}>
                Typ dokladu{' '}
                <HelpBubble position="bottom" text="BV = Bankový výpis (platba cez účet), VFA = Vydaná faktúra (poslaná zákazníkovi), PFA = Prijatá faktúra (od dodávateľa), PPD = Príjmový pokladničný doklad (hotovosť), VPD = Výdavkový pokladničný doklad, ID = Interný doklad" />
              </label>
              <select value={docType} onChange={e => handleDocTypeChange(e.target.value)} style={{ ...inputBase, cursor: 'pointer', background: dark ? '#1c1c1f' : '#f9fafb' }}>
                {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle(muted)}>
                Číslo dokladu{' '}
                <HelpBubble position="bottom" text="Automaticky vygenerované číslo dokladu podľa typu (napr. BV001). Môžeš ho zmeniť podľa čísla z bankového výpisu alebo faktúry." />
              </label>
              <input value={docNo} onChange={e => setDocNo(e.target.value)} style={{ ...inputBase, fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={labelStyle(muted)}>Popis / predmet</label>
              <input
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Napr. Úhrada faktúry od dodávateľa…"
                style={inputBase}
                autoFocus
              />
            </div>
          </div>

          {/* ── Riadky ── */}
          <div>
            {/* Hlavičky stĺpcov */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr 1fr 130px 1fr 28px',
              gap: 8, paddingBottom: 6, paddingLeft: 2,
              borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : '#f0f0f0'}`,
              marginBottom: 6,
            }}>
              {[
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Predkontácia <HelpBubble position="right" text="Predkontácia = pripravený pár účtov pre bežné situácie. Vyber napr. 'BV+ Príjem na bankový účet' a účty MD a D sa doplnia automaticky. Ušetrí ti čas a predíde chybám." /></span>,
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>MD – Má dať <HelpBubble position="right" text="MD (Má dať) = účet, ktorý sa pri tejto operácii zvyšuje na ľavej strane. Napr. pri príjme peňazí na účet tu zadáš 221 – Bankové účty." /></span>,
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>D – Dal <HelpBubble position="right" text="D (Dal) = účet, z ktorého pohyb 'vychádza'. Napr. pri inkase pohľadávky tu zadáš 311 – Odberatelia (záväzok voči tebe sa znižuje)." /></span>,
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>Suma (€) <HelpBubble position="left" text="Zadaj sumu v eurách. Táto suma sa zaúčtuje na obidva účty (MD aj D) – to je princíp podvojného účtovníctva: každý pohyb sa zapisuje dvakrát." /></span>,
                'Poznámka',
                '',
              ].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center' }}>{h}</span>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map((row, idx) => (
                <div key={row.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr 1fr 130px 1fr 28px',
                  gap: 8, alignItems: 'start',
                  padding: '10px 12px', borderRadius: 12,
                  background: rowBg, border: `1px solid ${rowBd}`,
                }}>

                  {/* Predkontácia */}
                  <select
                    value={row.predId}
                    onChange={e => applyPred(idx, e.target.value)}
                    style={{ ...inputBase, cursor: 'pointer', background: dark ? '#1c1c1f' : '#f9fafb', fontSize: 12, padding: '8px 8px' }}
                  >
                    <option value="">— vyber —</option>
                    {PREDKONTACIE.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>

                  {/* MD účet */}
                  <div>
                    <AccountSearch
                      dark={dark}
                      value={row.mdCode}
                      onSelect={(code, name) => updateRow(idx, { mdCode: code, mdName: name })}
                      placeholder="MD účet…"
                    />
                    {row.mdName && (
                      <div style={{ fontSize: 11, color: '#10b981', marginTop: 3, paddingLeft: 2, fontWeight: 500 }}>{row.mdName}</div>
                    )}
                  </div>

                  {/* D účet */}
                  <div>
                    <AccountSearch
                      dark={dark}
                      value={row.dCode}
                      onSelect={(code, name) => updateRow(idx, { dCode: code, dName: name })}
                      placeholder="D účet…"
                    />
                    {row.dName && (
                      <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 3, paddingLeft: 2, fontWeight: 500 }}>{row.dName}</div>
                    )}
                  </div>

                  {/* Suma */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text" inputMode="decimal"
                      placeholder="0,00"
                      value={row.rawAmount}
                      onChange={e => handleAmountChange(idx, e.target.value)}
                      style={{
                        ...inputBase, textAlign: 'right',
                        fontFamily: 'monospace', fontWeight: 700, fontSize: 14,
                        paddingRight: 26,
                        color: row.amountCents > 0 ? text : muted,
                        borderColor: row.amountCents > 0 ? (dark ? 'rgba(249,115,22,0.4)' : '#f97316') : undefined,
                      }}
                    />
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: muted, pointerEvents: 'none' }}>€</span>
                  </div>

                  {/* Poznámka */}
                  <input
                    placeholder="pozn…"
                    value={row.note}
                    onChange={e => updateRow(idx, { note: e.target.value })}
                    style={{ ...inputBase, fontSize: 12 }}
                  />

                  {/* Odstrániť */}
                  <button
                    onClick={() => setRows(rs => rs.filter((_, i) => i !== idx))}
                    disabled={rows.length <= 1}
                    style={{
                      width: 28, height: 34, borderRadius: 7, border: 'none',
                      cursor: rows.length <= 1 ? 'not-allowed' : 'pointer',
                      background: 'transparent', color: muted,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      opacity: rows.length <= 1 ? 0.2 : 1,
                    }}
                    onMouseEnter={e => { if (rows.length > 1) { e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.12)' : '#fef2f2'; e.currentTarget.style.color = '#ef4444'; } }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Pridať riadok */}
            <button
              onClick={() => setRows(rs => [...rs, newRow()])}
              style={{ marginTop: 10, fontSize: 12, color: '#f97316', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, padding: '6px 0', fontFamily: 'inherit' }}
            >
              <Plus size={13} /> Pridať riadok
            </button>
          </div>

          {/* ── Súčet + info ── */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderRadius: 12,
            background: dark ? 'rgba(249,115,22,0.07)' : '#fff7ed',
            border: `1px solid ${dark ? 'rgba(249,115,22,0.2)' : '#fed7aa'}`,
          }}>
            <span style={{ fontSize: 13, color: muted }}>
              {rows.length} riadok{rows.length > 1 ? 'ov' : ''} · každý riadok je automaticky vyrovnaný (MD = D)
            </span>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>
              {centsToEur(totalCents)} €
            </span>
          </div>

          {/* ── Tlačidlá ── */}
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>Zrušiť</Button>
            <Button fullWidth onClick={handleSave} disabled={!canSave}>Zaúčtovať</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function labelStyle(muted: string): React.CSSProperties {
  return { display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' };
}
