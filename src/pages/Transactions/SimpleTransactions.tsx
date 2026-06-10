import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, TrendingUp, TrendingDown, Calendar, Tag, HelpCircle, Upload } from 'lucide-react';
import { GuideBar } from '../../components/common/GuideBar';
import { useTransactionStore, centsToEur, eurToCents } from '../../store/transactionStore';
import type { SimpleCategory } from '../../store/transactionStore';
import { useDark } from '../../store/themeStore';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { BankImportModal } from './BankImportModal';

const INCOME_CATS: SimpleCategory[] = ['sales', 'services', 'other_income'];
const EXPENSE_CATS: SimpleCategory[] = ['supplies', 'rent', 'utilities', 'salaries', 'marketing', 'other'];

interface Props { companyId: string; }

export function SimpleTransactions({ companyId }: Props) {
  const { t } = useTranslation();
  const dark = useDark();
  const { addSimple, deleteSimple, getSimple } = useTransactionStore();
  const transactions = getSimple(companyId);

  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [desc, setDesc] = useState('');
  const [cat, setCat] = useState<SimpleCategory>('sales');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const totalIncome = transactions.filter((tx) => tx.type === 'income').reduce((s, tx) => s + tx.amountCents, 0);
  const totalExpense = transactions.filter((tx) => tx.type === 'expense').reduce((s, tx) => s + tx.amountCents, 0);
  const balance = totalIncome - totalExpense;

  const bg = dark ? '#0c0c0e' : '#f8f9fb';
  const cardBg = dark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const cardBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const text = dark ? '#ffffff' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af';
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : '#f9fafb';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    border: `1px solid ${inputBorder}`, background: inputBg,
    color: text, fontSize: 13, fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
  };

  function handleOpen(t: 'income' | 'expense') {
    setType(t);
    setCat(t === 'income' ? 'sales' : 'supplies');
    setDate(new Date().toISOString().split('T')[0]);
    setDesc(''); setAmount(''); setNote('');
    setOpen(true);
  }

  function handleSave() {
    if (!desc.trim() || !amount) return;
    addSimple({ companyId, date, description: desc, type, category: cat, amountCents: eurToCents(amount), note });
    setOpen(false);
  }

  const catList = type === 'income' ? INCOME_CATS : EXPENSE_CATS;


  return (
    <div style={{ minHeight: '100%', background: bg, fontFamily: "'Inter', system-ui, sans-serif", padding: '28px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <GuideBar
          id="simple-tx-guide"
          icon={<HelpCircle size={15} />}
          title={t('guide.simple_tx_title')}
          body={t('guide.simple_tx_body')}
          type="tip"
        />

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Príjmy', value: totalIncome, color: '#10b981', bg: dark ? 'rgba(16,185,129,0.1)' : '#ecfdf5', icon: <TrendingUp size={18} color="#10b981" /> },
            { label: 'Výdavky', value: totalExpense, color: '#ef4444', bg: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2', icon: <TrendingDown size={18} color="#ef4444" /> },
            { label: t('dashboard.stat_balance'), value: balance, color: balance >= 0 ? '#f97316' : '#ef4444', bg: dark ? 'rgba(249,115,22,0.1)' : '#fff7ed', icon: null },
          ].map((s) => (
            <div key={s.label} style={{
              padding: '20px 22px', borderRadius: 18,
              background: cardBg, border: `1px solid ${cardBorder}`,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 11, fontWeight: 600,
                color: s.color, background: s.bg,
                padding: '4px 10px', borderRadius: 999, marginBottom: 12,
              }}>
                {s.icon}{s.label}
              </div>
              <p style={{ fontSize: 26, fontWeight: 700, color: s.color, margin: 0, letterSpacing: '-0.03em' }}>
                {centsToEur(s.value)} €
              </p>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button
            onClick={() => handleOpen('income')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(16,185,129,0.3)',
            }}
          >
            <Plus size={15} /> Pridať príjem
          </button>
          <button
            onClick={() => handleOpen('expense')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#ef4444', color: '#fff', fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(239,68,68,0.3)',
            }}
          >
            <Plus size={15} /> Pridať výdavok
          </button>
          <button
            onClick={() => setImportOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, cursor: 'pointer',
              background: 'transparent', color: '#f97316', fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit',
              border: '1.5px solid rgba(249,115,22,0.4)',
            }}
          >
            <Upload size={15} /> Importovať z banky
          </button>
        </div>

        {/* Table / empty */}
        {transactions.length === 0 ? (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '64px 24px', borderRadius: 20,
            background: cardBg, border: `1px solid ${cardBorder}`, textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
            }}>
              <TrendingUp size={22} color="#f97316" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: text, margin: 0 }}>{t('transactions.empty')}</p>
            <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>{t('transactions.empty_desc')}</p>
          </div>
        ) : (
          <div style={{ borderRadius: 20, background: cardBg, border: `1px solid ${cardBorder}`, overflow: 'hidden' }}>
            <div className="table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${cardBorder}` }}>
                  {['Dátum', 'Popis', 'Kategória', 'Suma', ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 18px', textAlign: i === 3 ? 'right' : 'left',
                      fontSize: 11, fontWeight: 600, color: muted,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'}` }}>
                    <td style={{ padding: '13px 18px', color: muted, fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{tx.date}</td>
                    <td style={{ padding: '13px 18px', fontWeight: 500, color: text }}>{tx.description}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <span style={{ fontSize: 11, color: muted }}>{t(`transactions.categories.${tx.category}`)}</span>
                    </td>
                    <td style={{
                      padding: '13px 18px', textAlign: 'right', fontWeight: 600,
                      fontVariantNumeric: 'tabular-nums',
                      color: tx.type === 'income' ? '#10b981' : '#ef4444',
                    }}>
                      {tx.type === 'income' ? '+' : '−'}{centsToEur(tx.amountCents)} €
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button
                        onClick={() => deleteSimple(tx.id)}
                        style={{
                          padding: 6, borderRadius: 8, border: 'none', cursor: 'pointer',
                          background: 'transparent', color: muted, display: 'flex', alignItems: 'center',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = dark ? 'rgba(239,68,68,0.1)' : '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = muted; }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {/* Bank import modal */}
      <BankImportModal open={importOpen} onClose={() => setImportOpen(false)} companyId={companyId} />

      {/* Premium modal */}
      <Modal open={open} onClose={() => setOpen(false)} title={type === 'income' ? 'Nový príjem' : 'Nový výdavok'} size="md">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Type toggle */}
          <div style={{
            display: 'flex', padding: 4, borderRadius: 14,
            background: dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
          }}>
            {(['income', 'expense'] as const).map((t_) => (
              <button
                key={t_}
                onClick={() => { setType(t_); setCat(t_ === 'income' ? 'sales' : 'supplies'); }}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                  background: type === t_
                    ? (t_ === 'income' ? '#10b981' : '#ef4444')
                    : 'transparent',
                  color: type === t_ ? '#fff' : muted,
                  boxShadow: type === t_ ? '0 2px 6px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                {t_ === 'income' ? '↑ Príjem' : '↓ Výdavok'}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Suma
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{
                  ...inputStyle,
                  fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em',
                  padding: '14px 50px 14px 16px', textAlign: 'right',
                  color: type === 'income' ? '#10b981' : '#ef4444',
                }}
              />
              <span style={{
                position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
                fontSize: 18, fontWeight: 600, color: type === 'income' ? '#10b981' : '#ef4444',
              }}>€</span>
            </div>
          </div>

          {/* Description + date */}
          <div className="tx-desc-date-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={11} />Dátum</span>
              </label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Popis
              </label>
              <input placeholder="Popis transakcie" value={desc} onChange={(e) => setDesc(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Category */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Tag size={11} /> Kategória
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {catList.map((value) => (
                <button
                  key={value}
                  onClick={() => setCat(value)}
                  style={{
                    padding: '7px 14px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                    background: cat === value
                      ? (dark ? 'rgba(249,115,22,0.2)' : '#fff7ed')
                      : (dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'),
                    color: cat === value ? '#f97316' : (dark ? 'rgba(255,255,255,0.6)' : '#6b7280'),
                    outline: cat === value ? '1.5px solid rgba(249,115,22,0.4)' : '1px solid transparent',
                    outlineOffset: -1,
                  }}
                >
                  {t(`transactions.categories.${value}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Poznámka (voliteľné)
            </label>
            <input placeholder="Doplňujúca informácia" value={note} onChange={(e) => setNote(e.target.value)} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" fullWidth onClick={() => setOpen(false)}>Zrušiť</Button>
            <Button fullWidth onClick={handleSave} disabled={!desc.trim() || !amount}>Uložiť</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
