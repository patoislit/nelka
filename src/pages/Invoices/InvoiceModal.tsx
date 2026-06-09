import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, X, Package } from 'lucide-react';
import { useDark } from '../../store/themeStore';
import {
  useInvoiceStore,
  calcInvoiceSubtotalCents,
  calcInvoiceVatCents,
  calcInvoiceTotalCents,
} from '../../store/invoiceStore';
import type { Invoice, InvoiceItem, InvoiceStatus } from '../../store/invoiceStore';
import { useCompanyStore } from '../../store/companyStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import { centsToEur, eurToCents } from '../../store/transactionStore';

interface Props {
  open: boolean;
  onClose: () => void;
  invoice?: Invoice;
}

const VAT_RATES = [23, 19, 5, 0]; // SK 2025: štandard 23%, znížená 19%, super-znížená 5%, oslobodené 0%

function newItem(): InvoiceItem {
  return { id: crypto.randomUUID(), name: '', quantity: 1, unitPriceCents: 0, vatRate: 23 };
}

export function InvoiceModal({ open, onClose, invoice }: Props) {
  const { t } = useTranslation();
  const dark = useDark();
  const { addInvoice, updateInvoice, getNextNumber } = useInvoiceStore();
  const { getActiveCompany } = useCompanyStore();
  const { getItemsForCompany } = useWarehouseStore();
  const company = getActiveCompany();

  const today = new Date().toISOString().slice(0, 10);
  const year  = new Date().getFullYear();

  const [number, setNumber]      = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate]    = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [status, setStatus]      = useState<InvoiceStatus>('draft');
  const [custName, setCustName]  = useState('');
  const [custAddr, setCustAddr]  = useState('');
  const [custIco, setCustIco]    = useState('');
  const [custDic, setCustDic]    = useState('');
  const [note, setNote]          = useState('');
  const [items, setItems]        = useState<InvoiceItem[]>([newItem()]);
  const [rawVals, setRawVals]    = useState<Record<string, { qty: string; price: string }>>({});
  const [stockOpen, setStockOpen]    = useState(false);
  const [stockTarget, setStockTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (invoice) {
      setNumber(invoice.number);
      setIssueDate(invoice.issueDate);
      setDueDate(invoice.dueDate);
      setStatus(invoice.status);
      setCustName(invoice.customerName);
      setCustAddr(invoice.customerAddress);
      setCustIco(invoice.customerIco);
      setCustDic(invoice.customerDic);
      setNote(invoice.note);
      const its = invoice.items.length ? invoice.items : [newItem()];
      setItems(its);
      const rv: Record<string, { qty: string; price: string }> = {};
      for (const it of its) rv[it.id] = { qty: String(it.quantity), price: centsToEur(it.unitPriceCents) };
      setRawVals(rv);
    } else {
      const num = company ? getNextNumber(company.id, year) : '';
      setNumber(num);
      setIssueDate(today);
      const d = new Date(); d.setDate(d.getDate() + 14);
      setDueDate(d.toISOString().slice(0, 10));
      setStatus('draft');
      setCustName(''); setCustAddr(''); setCustIco(''); setCustDic(''); setNote('');
      const its = [newItem()];
      setItems(its);
      setRawVals({ [its[0].id]: { qty: '1', price: '0' } });
    }
  }, [open, invoice?.id]);

  if (!open || !company) return null;

  const addItem = () => {
    const it = newItem();
    setItems((prev) => [...prev, it]);
    setRawVals((prev) => ({ ...prev, [it.id]: { qty: '1', price: '0' } }));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    setRawVals((prev) => { const n = { ...prev }; delete n[id]; return n; });
  };

  const updateItemField = (id: string, patch: Partial<InvoiceItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleQty = (id: string, val: string) => {
    setRawVals((p) => ({ ...p, [id]: { ...p[id], qty: val } }));
    updateItemField(id, { quantity: parseFloat(val.replace(',', '.')) || 0 });
  };

  const handlePrice = (id: string, val: string) => {
    setRawVals((p) => ({ ...p, [id]: { ...p[id], price: val } }));
    updateItemField(id, { unitPriceCents: eurToCents(val) });
  };

  const handlePickFromStock = (warehouseItemId: string) => {
    const stockItems = getItemsForCompany(company.id);
    const si = stockItems.find((i) => i.id === warehouseItemId);
    if (!si || !stockTarget) return;
    setItems((prev) => prev.map((it) =>
      it.id === stockTarget
        ? { ...it, name: si.name, unitPriceCents: si.salePriceCents, warehouseItemId: si.id }
        : it
    ));
    setRawVals((p) => ({
      ...p,
      [stockTarget]: { ...p[stockTarget], price: centsToEur(si.salePriceCents) },
    }));
    setStockOpen(false);
    setStockTarget(null);
  };

  const handleSave = (saveStatus: InvoiceStatus) => {
    const data = {
      companyId: company.id,
      number,
      issueDate,
      dueDate,
      status: saveStatus,
      customerName: custName,
      customerAddress: custAddr,
      customerIco: custIco,
      customerDic: custDic,
      items,
      note,
    };
    if (invoice) {
      updateInvoice(invoice.id, data);
    } else {
      addInvoice(data);
    }
    onClose();
  };

  const subtotal = calcInvoiceSubtotalCents(items);
  const vat      = calcInvoiceVatCents(items);
  const total    = calcInvoiceTotalCents(items);

  // Design tokens
  const bg          = dark ? '#18181b' : '#ffffff';
  const border      = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const text        = dark ? '#f4f4f5' : '#111827';
  const muted       = dark ? 'rgba(255,255,255,0.38)' : '#9ca3af';
  const inputBg     = dark ? '#1c1c1f' : '#f9fafb';
  const inputBorder = dark ? 'rgba(255,255,255,0.10)' : '#e5e7eb';

  const inp = (extra?: React.CSSProperties): React.CSSProperties => ({
    background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: 8,
    padding: '8px 10px', fontSize: 13, color: text, width: '100%', boxSizing: 'border-box',
    fontFamily: 'inherit', outline: 'none', ...extra,
  });

  const stockItems = getItemsForCompany(company.id);

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: dark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 201, width: 'min(780px, 96vw)', maxHeight: '92vh', overflowY: 'auto',
        background: bg, borderRadius: 20, border: `1px solid ${border}`,
        boxShadow: dark ? '0 24px 80px rgba(0,0,0,0.7)' : '0 24px 80px rgba(0,0,0,0.18)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, background: bg, zIndex: 1, borderRadius: '20px 20px 0 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: text, letterSpacing: '-0.03em' }}>
              {invoice ? t('invoices.edit') : t('invoices.new')}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: muted }}>{company.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Invoice metadata */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
            <Lbl label={t('invoices.number')}><input style={inp()} value={number} onChange={(e) => setNumber(e.target.value)} /></Lbl>
            <Lbl label={t('invoices.issue_date')}><input type="date" style={inp()} value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></Lbl>
            <Lbl label={t('invoices.due_date')}><input type="date" style={inp()} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Lbl>
            <Lbl label={t('invoices.status')}>
              <select style={inp()} value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
                {(['draft','sent','paid','overdue','cancelled'] as InvoiceStatus[]).map((s) => (
                  <option key={s} value={s} style={{ background: dark ? '#1c1c1f' : '#fff', color: dark ? '#f4f4f5' : '#111827' }}>
                    {t(`invoices.status_${s}`)}
                  </option>
                ))}
              </select>
            </Lbl>
          </div>

          {/* Customer */}
          <SecHead>{t('invoices.customer')}</SecHead>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: -12 }}>
            <Lbl label={t('invoices.customer')}><input style={inp()} value={custName} onChange={(e) => setCustName(e.target.value)} placeholder="Meno / firma" /></Lbl>
            <Lbl label={t('invoices.customer_address')}><input style={inp()} value={custAddr} onChange={(e) => setCustAddr(e.target.value)} placeholder="Ulica, mesto" /></Lbl>
            <Lbl label={t('invoices.customer_ico')}><input style={inp()} value={custIco} onChange={(e) => setCustIco(e.target.value)} placeholder="12345678" /></Lbl>
            <Lbl label={t('invoices.customer_dic')}><input style={inp()} value={custDic} onChange={(e) => setCustDic(e.target.value)} placeholder="SK1234567890" /></Lbl>
          </div>

          {/* Items */}
          <SecHead>{t('invoices.items')}</SecHead>
          <div style={{ marginTop: -12 }}>
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <div style={{ minWidth: 480 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 70px 120px 70px 90px 32px', gap: 6, padding: '0 0 6px', borderBottom: `1px solid ${border}` }}>
              {[t('invoices.item_name'), t('invoices.qty'), t('invoices.unit_price'), 'DPH %', t('invoices.item_total'), ''].map((h, i) => (
                <span key={i} style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: i >= 2 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>

            {items.map((it) => {
              const rowTotal = Math.round(it.quantity * it.unitPriceCents * (1 + it.vatRate / 100));
              return (
                <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '2fr 70px 120px 70px 90px 32px', gap: 6, padding: '6px 0', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}`, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input style={{ ...inp(), flex: 1 }} value={it.name} onChange={(e) => updateItemField(it.id, { name: e.target.value })} placeholder={t('invoices.item_name')} />
                    <button title={t('invoices.pick_from_stock')} onClick={() => { setStockTarget(it.id); setStockOpen(true); }}
                      style={{ padding: '7px 7px', borderRadius: 7, border: 'none', cursor: 'pointer', background: dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6', color: muted, display: 'flex', flexShrink: 0 }}>
                      <Package size={13} />
                    </button>
                  </div>
                  <input type="text" inputMode="decimal" style={inp({ textAlign: 'right', padding: '8px 8px' })}
                    value={rawVals[it.id]?.qty ?? String(it.quantity)} onChange={(e) => handleQty(it.id, e.target.value)} />
                  <input type="text" inputMode="decimal" style={inp({ textAlign: 'right', padding: '8px 8px' })}
                    value={rawVals[it.id]?.price ?? centsToEur(it.unitPriceCents)} onChange={(e) => handlePrice(it.id, e.target.value)} />
                  <select style={inp({ textAlign: 'right', padding: '8px 6px' })} value={it.vatRate} onChange={(e) => updateItemField(it.id, { vatRate: Number(e.target.value) })}>
                    {VAT_RATES.map((r) => (
                      <option key={r} value={r} style={{ background: dark ? '#1c1c1f' : '#fff', color: dark ? '#f4f4f5' : '#111827' }}>{r} %</option>
                    ))}
                  </select>
                  <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: text, fontVariantNumeric: 'tabular-nums' }}>{centsToEur(rowTotal)} €</span>
                  <button onClick={() => removeItem(it.id)} disabled={items.length === 1}
                    style={{ background: 'none', border: 'none', cursor: items.length === 1 ? 'default' : 'pointer', color: items.length === 1 ? 'transparent' : '#ef4444', display: 'flex', padding: 2, borderRadius: 6 }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}

            </div>{/* end minWidth */}
            </div>{/* end scroll */}
            <button onClick={addItem} style={{ marginTop: 10, padding: '8px', borderRadius: 8, border: `1px dashed ${dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`, cursor: 'pointer', background: 'transparent', color: muted, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', width: '100%' }}>
              {t('invoices.add_item')}
            </button>
          </div>

          {/* Totals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', borderTop: `1px solid ${border}`, paddingTop: 14 }}>
            <TRow label={t('invoices.subtotal')} value={`${centsToEur(subtotal)} €`} text={text} muted={muted} />
            <TRow label={t('invoices.vat')} value={`${centsToEur(vat)} €`} text={text} muted={muted} />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, borderTop: `1px solid ${border}`, paddingTop: 10, minWidth: 240, width: '100%' }}>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: text }}>{t('invoices.total')}</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: '#f97316', letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{centsToEur(total)} €</span>
            </div>
          </div>

          {/* Note */}
          <Lbl label={t('invoices.note')}>
            <textarea style={{ ...inp(), resize: 'vertical', minHeight: 56 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('invoices.note')} />
          </Lbl>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button onClick={onClose} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${inputBorder}`, cursor: 'pointer', background: 'transparent', color: text, fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
              {t('common.cancel')}
            </button>
            <button onClick={() => handleSave('draft')} style={{ padding: '10px 18px', borderRadius: 10, border: `1px solid ${dark ? 'rgba(249,115,22,0.4)' : '#fed7aa'}`, cursor: 'pointer', background: dark ? 'rgba(249,115,22,0.08)' : '#fff7ed', color: '#f97316', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
              {t('invoices.save_draft')}
            </button>
            <button onClick={() => handleSave('sent')} style={{ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.35)' }}>
              {invoice ? t('common.save') : t('invoices.send')}
            </button>
          </div>
        </div>
      </div>

      {/* Stock picker */}
      {stockOpen && (
        <>
          <div onClick={() => { setStockOpen(false); setStockTarget(null); }} style={{ position: 'fixed', inset: 0, zIndex: 210, background: 'rgba(0,0,0,0.5)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 211, width: 'min(400px, 92vw)', background: bg, borderRadius: 16, border: `1px solid ${border}`, padding: 20, fontFamily: 'inherit', boxShadow: '0 20px 60px rgba(0,0,0,0.45)', maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: text }}>{t('invoices.pick_from_stock')}</h3>
              <button onClick={() => { setStockOpen(false); setStockTarget(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: muted, display: 'flex' }}><X size={16} /></button>
            </div>
            {stockItems.length === 0 ? (
              <p style={{ color: muted, fontSize: 13, textAlign: 'center', padding: '20px 0' }}>{t('warehouse.empty')}</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {stockItems.map((si) => (
                  <button key={si.id} onClick={() => handlePickFromStock(si.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: 10, border: `1px solid ${border}`, cursor: 'pointer', background: 'transparent', textAlign: 'left', fontFamily: 'inherit' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: text }}>{si.name}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 11, color: muted }}>{si.quantity} {si.unit} · {si.code}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>{centsToEur(si.salePriceCents)} €</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

// Helper sub-components
function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  const dark = useDark();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: dark ? 'rgba(255,255,255,0.4)' : '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</label>
      {children}
    </div>
  );
}

function SecHead({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f97316', borderBottom: '1px solid rgba(249,115,22,0.18)', paddingBottom: 6 }}>
      {children}
    </p>
  );
}

function TRow({ label, value, text, muted }: { label: string; value: string; text: string; muted: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, minWidth: 240 }}>
      <span style={{ flex: 1, fontSize: 12, color: muted, textAlign: 'right' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: text, minWidth: 80, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}
