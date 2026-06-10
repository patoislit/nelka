import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, FileText, CheckCircle, Trash2, Pencil, XCircle, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import { useDark } from '../../store/themeStore';
import { useInvoiceStore, calcInvoiceTotalCents } from '../../store/invoiceStore';
import type { Invoice, InvoiceStatus } from '../../store/invoiceStore';
import { useCompanyStore } from '../../store/companyStore';
import { useTransactionStore } from '../../store/transactionStore';
import { useNotificationStore } from '../../store/notificationStore';
import { centsToEur } from '../../store/transactionStore';
import { GuideBar } from '../../components/common/GuideBar';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { InvoiceModal } from './InvoiceModal';
import { exportInvoicePdf } from './invoicePdf';
import i18n from 'i18next';

const STATUS_FILTERS: (InvoiceStatus | 'all')[] = ['all', 'draft', 'sent', 'paid', 'overdue', 'cancelled'];

const STATUS_COLORS: Record<InvoiceStatus, { bg: string; color: string }> = {
  draft:     { bg: 'rgba(107,114,128,0.12)', color: '#6b7280' },
  sent:      { bg: 'rgba(59,130,246,0.12)',  color: '#3b82f6' },
  paid:      { bg: 'rgba(16,185,129,0.12)',  color: '#10b981' },
  overdue:   { bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  cancelled: { bg: 'rgba(107,114,128,0.08)', color: '#9ca3af' },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { t } = useTranslation();
  const c = STATUS_COLORS[status];
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '3px 10px', borderRadius: 999,
      fontSize: 11, fontWeight: 700, letterSpacing: '0.02em',
    }}>
      {t(`invoices.status_${status}`)}
    </span>
  );
}

export function InvoicesPage() {
  const { t } = useTranslation();
  const dark = useDark();
  const { getInvoicesForCompany, updateInvoice, deleteInvoice } = useInvoiceStore();
  const { getActiveCompany } = useCompanyStore();
  const { addJournalEntry, deleteJournalEntry, addSimple } = useTransactionStore();
  const { addNotification } = useNotificationStore();

  const company = getActiveCompany();
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Invoice | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Invoice | null>(null);

  // Colors
  const bg       = dark ? '#0c0c0e' : '#f8f9fb';
  const surface  = dark ? 'rgba(255,255,255,0.03)' : '#ffffff';
  const border   = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const text     = dark ? '#ffffff' : '#111827';
  const muted    = dark ? 'rgba(255,255,255,0.38)' : '#9ca3af';

  // Overdue check on mount
  useEffect(() => {
    if (!company) return;
    const today = new Date().toISOString().slice(0, 10);
    getInvoicesForCompany(company.id).forEach((inv) => {
      if (inv.status === 'sent' && inv.dueDate < today) {
        updateInvoice(inv.id, { status: 'overdue' });
        addNotification({
          companyId: company.id, type: 'warning',
          title: 'Faktúra po splatnosti', titleEn: 'Invoice overdue',
          body: `Faktúra ${inv.number} – ${inv.customerName}`,
          bodyEn: `Invoice ${inv.number} – ${inv.customerName}`,
        });
      }
    });
  }, [company?.id]);

  if (!company) {
    return (
      <div style={{ minHeight: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: muted, fontSize: 14 }}>{t('dashboard.no_company_desc')}</p>
      </div>
    );
  }

  const allInvoices = getInvoicesForCompany(company.id);
  const filtered = filter === 'all' ? allInvoices : allInvoices.filter((inv) => inv.status === filter);

  // Summary stats
  const totalInvoiced = allInvoices.reduce((s, inv) => s + calcInvoiceTotalCents(inv.items), 0);
  const totalPaid     = allInvoices.filter(inv => inv.status === 'paid').reduce((s, inv) => s + calcInvoiceTotalCents(inv.items), 0);
  const totalPending  = allInvoices.filter(inv => inv.status === 'sent' || inv.status === 'overdue').reduce((s, inv) => s + calcInvoiceTotalCents(inv.items), 0);
  const overdueCount  = allInvoices.filter(inv => inv.status === 'overdue').length;

  const handleMarkPaid = (invoice: Invoice) => {
    const today = new Date().toISOString().slice(0, 10);
    const total = calcInvoiceTotalCents(invoice.items);

    updateInvoice(invoice.id, { status: 'paid' });

    if (company.type === 'double') {
      // Double-entry: MD 311 Pohľadávky / D 221 Bankový účet — actually: cash IN = MD 221 / D 311
      const je = addJournalEntry({
        companyId: company.id,
        date: today,
        description: `Úhrada faktúry ${invoice.number} – ${invoice.customerName}`,
        createdBy: 'invoice',
        lines: [
          { id: crypto.randomUUID(), accountCode: '221', accountName: 'Bankový účet', debitCents: total, creditCents: 0 },
          { id: crypto.randomUUID(), accountCode: '311', accountName: 'Pohľadávky z obchodného styku', debitCents: 0, creditCents: total },
        ],
      });
      if (je) updateInvoice(invoice.id, { journalEntryId: je.id });
    } else {
      // Simple accounting: create an income transaction
      addSimple({
        companyId: company.id,
        date: today,
        description: `Faktúra ${invoice.number} – ${invoice.customerName}`,
        type: 'income',
        category: 'sales',
        amountCents: total,
        note: `Auto: úhrada faktúry`,
      });
    }
  };

  const handleCancelInvoice = (invoice: Invoice) => {
    if (invoice.journalEntryId) deleteJournalEntry(invoice.journalEntryId);
    updateInvoice(invoice.id, { status: 'cancelled', journalEntryId: undefined });
    setConfirmCancel(null);
  };

  const handleDelete = (invoice: Invoice) => {
    if (invoice.journalEntryId) deleteJournalEntry(invoice.journalEntryId);
    deleteInvoice(invoice.id);
    setConfirmDelete(null);
  };

  const openNew  = () => { setEditInvoice(undefined); setModalOpen(true); };
  const openEdit = (inv: Invoice) => { setEditInvoice(inv); setModalOpen(true); };

  const stats = [
    { label: 'Celkom vystavené', value: centsToEur(totalInvoiced) + ' €', icon: <FileText size={16} color="#f97316" />, accent: '#f97316', accentBg: dark ? 'rgba(249,115,22,0.1)' : '#fff7ed' },
    { label: 'Zaplatené',        value: centsToEur(totalPaid)     + ' €', icon: <TrendingUp size={16} color="#10b981" />, accent: '#10b981', accentBg: dark ? 'rgba(16,185,129,0.1)' : '#f0fdf4' },
    { label: 'Čakajúce',         value: centsToEur(totalPending)  + ' €', icon: <Clock size={16} color="#3b82f6" />, accent: '#3b82f6', accentBg: dark ? 'rgba(59,130,246,0.1)' : '#eff6ff' },
    { label: 'Po splatnosti',    value: String(overdueCount),      icon: <AlertCircle size={16} color="#ef4444" />, accent: '#ef4444', accentBg: dark ? 'rgba(239,68,68,0.1)' : '#fef2f2' },
  ];

  return (
    <div style={{ minHeight: '100%', background: bg, fontFamily: "'Inter', system-ui, sans-serif", padding: '28px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: text, margin: 0, letterSpacing: '-0.03em' }}>{t('invoices.title')}</h1>
            <p style={{ fontSize: 13, color: muted, marginTop: 2 }}>{company.name}</p>
          </div>
          <button
            onClick={openNew}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 600,
              fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
            }}
          >
            <Plus size={15} /> {t('invoices.new')}
          </button>
        </div>

        <GuideBar id="invoices-guide" title={t('guide.invoices_title')} body={t('guide.invoices_body')} type="tip" />

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: surface, border: `1px solid ${border}`, borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: s.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {s.icon}
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: muted }}>{s.label}</span>
              </div>
              <p style={{ fontSize: 20, fontWeight: 800, color: s.accent, margin: 0, letterSpacing: '-0.02em' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                background: filter === f ? '#f97316' : (dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'),
                color: filter === f ? '#fff' : muted,
                transition: 'all 0.15s',
              }}
            >
              {f === 'all' ? t('invoices.filter_all') : t(`invoices.status_${f}`)}
            </button>
          ))}
        </div>

        {/* Invoices table */}
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: 20, overflow: 'hidden' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '64px 24px', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: dark ? 'rgba(249,115,22,0.1)' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <FileText size={22} color="#f97316" />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: text, margin: 0 }}>{t('invoices.empty')}</p>
              <p style={{ fontSize: 12, color: muted, marginTop: 4 }}>{t('invoices.empty_desc')}</p>
            </div>
          ) : (
            <div className="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {[t('invoices.number'), t('invoices.customer'), t('invoices.issue_date'), t('invoices.due_date'), t('invoices.total'), t('invoices.status'), ''].map((h, i) => (
                    <th key={i} style={{
                      padding: '12px 16px', textAlign: i >= 4 ? 'right' : 'left',
                      fontSize: 11, fontWeight: 700, color: muted,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    style={{ borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f9fafb'}` }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = dark ? 'rgba(255,255,255,0.02)' : '#fafafa'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: '#f97316', fontVariantNumeric: 'tabular-nums' }}>{inv.number}</td>
                    <td style={{ padding: '13px 16px', fontWeight: 500, color: text, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.customerName || '–'}</td>
                    <td style={{ padding: '13px 16px', color: muted, fontVariantNumeric: 'tabular-nums' }}>{inv.issueDate}</td>
                    <td style={{ padding: '13px 16px', fontVariantNumeric: 'tabular-nums', color: inv.status === 'overdue' ? '#ef4444' : muted, fontWeight: inv.status === 'overdue' ? 600 : 400 }}>{inv.dueDate}</td>
                    <td style={{ padding: '13px 16px', fontWeight: 700, color: text, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{centsToEur(calcInvoiceTotalCents(inv.items))} €</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right' }}><StatusBadge status={inv.status} /></td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        {/* Edit */}
                        {inv.status !== 'cancelled' && (
                          <ActionBtn onClick={() => openEdit(inv)} title={t('common.edit')} dark={dark}>
                            <Pencil size={14} />
                          </ActionBtn>
                        )}
                        {/* PDF */}
                        <ActionBtn onClick={() => exportInvoicePdf(inv, company, i18n.language)} title={t('invoices.export_pdf')} dark={dark}>
                          <FileText size={14} />
                        </ActionBtn>
                        {/* Mark paid */}
                        {(inv.status === 'sent' || inv.status === 'overdue') && (
                          <ActionBtn onClick={() => handleMarkPaid(inv)} title={t('invoices.mark_paid')} dark={dark} color="#10b981">
                            <CheckCircle size={14} />
                          </ActionBtn>
                        )}
                        {/* Cancel paid invoice */}
                        {inv.status === 'paid' && (
                          <ActionBtn onClick={() => setConfirmCancel(inv)} title={t('invoices.cancel_invoice')} dark={dark} color="#f59e0b">
                            <XCircle size={14} />
                          </ActionBtn>
                        )}
                        {/* Delete (not for paid) */}
                        {inv.status !== 'paid' && (
                          <ActionBtn onClick={() => setConfirmDelete(inv)} title={t('common.delete')} dark={dark} color="#ef4444">
                            <Trash2 size={14} />
                          </ActionBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </div>
      </div>

      {/* Invoice form modal */}
      <InvoiceModal open={modalOpen} onClose={() => setModalOpen(false)} invoice={editInvoice} />

      {/* Delete confirm */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('common.confirm')} size="sm">
        <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>{t('invoices.confirm_delete')}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" fullWidth onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" fullWidth onClick={() => confirmDelete && handleDelete(confirmDelete)}>{t('common.delete')}</Button>
        </div>
      </Modal>

      {/* Cancel confirm */}
      <Modal open={!!confirmCancel} onClose={() => setConfirmCancel(null)} title={t('invoices.cancel_invoice')} size="sm">
        <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>{t('invoices.confirm_cancel')}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" fullWidth onClick={() => setConfirmCancel(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" fullWidth onClick={() => confirmCancel && handleCancelInvoice(confirmCancel)}>{t('invoices.cancel_invoice')}</Button>
        </div>
      </Modal>
    </div>
  );
}

function ActionBtn({ onClick, title, dark, color, children }: { onClick: () => void; title: string; dark: boolean; color?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: 6, borderRadius: 7, border: 'none', cursor: 'pointer',
        background: 'transparent', display: 'flex', alignItems: 'center',
        color: color ?? (dark ? 'rgba(255,255,255,0.35)' : '#9ca3af'),
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = dark ? 'rgba(255,255,255,0.07)' : '#f3f4f6'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      {children}
    </button>
  );
}
