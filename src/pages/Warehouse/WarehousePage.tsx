import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, ArrowUpDown, FileText, FileSpreadsheet } from 'lucide-react';
import { useDark } from '../../store/themeStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import type { WarehouseItem } from '../../store/warehouseStore';
import { useCompanyStore } from '../../store/companyStore';
import { useNotificationStore } from '../../store/notificationStore';
import { centsToEur } from '../../store/transactionStore';
import { Button } from '../../components/common/Button';
import { GuideBar } from '../../components/common/GuideBar';
import { WarehouseItemModal } from './WarehouseItemModal';
import { MovementModal } from './MovementModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type Tab = 'items' | 'movements';

function MovementBadge({ type }: { type: 'in' | 'out' | 'adjustment' }) {
  const { t } = useTranslation();
  const map = {
    in:         { bg: 'rgba(16,185,129,0.15)', text: '#10b981', label: 'warehouse.movement_in' },
    out:        { bg: 'rgba(239,68,68,0.15)',   text: '#ef4444', label: 'warehouse.movement_out' },
    adjustment: { bg: 'rgba(249,115,22,0.15)',  text: '#f97316', label: 'warehouse.movement_adj' },
  }[type];
  return (
    <span style={{ background: map.bg, color: map.text, padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
      {t(map.label)}
    </span>
  );
}

export function WarehousePage() {
  const { t } = useTranslation();
  const dark = useDark();
  const { getItemsForCompany, deleteItem, getMovementsForCompany } = useWarehouseStore();
  const { getActiveCompany } = useCompanyStore();
  const { addNotification } = useNotificationStore();

  const company = getActiveCompany();
  const [tab, setTab] = useState<Tab>('items');
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<WarehouseItem | undefined>(undefined);
  const [movementModalOpen, setMovementModalOpen] = useState(false);
  const [movementItemId, setMovementItemId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!company) return;
    const items = getItemsForCompany(company.id);
    items.forEach((item) => {
      if (item.quantity <= item.lowStockThreshold) {
        addNotification({
          companyId: company.id,
          type: 'warning',
          title: t('warehouse.low_stock'),
          body: t('warehouse.low_stock_body').replace('{name}', item.name).replace('{qty}', String(item.quantity)).replace('{unit}', item.unit),
          titleEn: 'Low stock',
          bodyEn: `Low stock: ${item.name} (${item.quantity} ${item.unit})`,
        });
      }
    });
  }, [company?.id]);

  const bg = dark ? '#0c0c0e' : '#f8f9fb';
  const surface = dark ? '#161618' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const textMain = dark ? '#f1f5f9' : '#111827';
  const textMuted = dark ? 'rgba(255,255,255,0.45)' : '#6b7280';

  if (!company) {
    return (
      <div style={{ minHeight: '100%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: textMuted, fontSize: 15 }}>
        {t('dashboard.no_company_desc')}
      </div>
    );
  }

  const items = getItemsForCompany(company.id);
  const movements = getMovementsForCompany(company.id);
  const totalValue = items.reduce((sum, it) => sum + it.quantity * it.purchasePriceCents, 0);

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(t('warehouse.title') + ' – ' + company.name, 14, 18);
    doc.setFontSize(10);
    doc.text(`${t('warehouse.total_value')}: ${centsToEur(totalValue)} €`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [[t('warehouse.code'), t('warehouse.name'), t('warehouse.unit'), t('warehouse.quantity'), t('warehouse.purchase_price'), t('warehouse.sale_price')]],
      body: items.map((it) => [it.code, it.name, it.unit, it.quantity, centsToEur(it.purchasePriceCents) + ' €', centsToEur(it.salePriceCents) + ' €']),
      styles: { fontSize: 9 },
    });
    doc.save(`sklad-${company.name}.pdf`);
  };

  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      [t('warehouse.code'), t('warehouse.name'), t('warehouse.unit'), t('warehouse.quantity'), t('warehouse.purchase_price') + ' €', t('warehouse.sale_price') + ' €'],
      ...items.map((it) => [it.code, it.name, it.unit, it.quantity, (it.purchasePriceCents / 100).toFixed(2), (it.salePriceCents / 100).toFixed(2)]),
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sklad');
    XLSX.writeFile(wb, `sklad-${company.name}.xlsx`);
  };

  const openNewItem = () => { setEditItem(undefined); setItemModalOpen(true); };
  const openEditItem = (item: WarehouseItem) => { setEditItem(item); setItemModalOpen(true); };
  const openMovement = (itemId?: string) => { setMovementItemId(itemId); setMovementModalOpen(true); };

  const handleDelete = (item: WarehouseItem) => {
    if (!confirm(t('warehouse.confirm_delete_item'))) return;
    deleteItem(item.id);
  };

  return (
    <div style={{ minHeight: '100%', background: bg, padding: '24px 28px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: textMain, margin: 0 }}>{t('warehouse.title')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'items' && (
            <>
              <Button variant="secondary" size="sm" onClick={exportPdf}>
                <FileText size={13} />
                {t('warehouse.export_pdf')}
              </Button>
              <Button variant="secondary" size="sm" onClick={exportExcel}>
                <FileSpreadsheet size={13} />
                {t('warehouse.export_excel')}
              </Button>
              <Button variant="primary" onClick={openNewItem}>
                <Plus size={15} />
                {t('warehouse.new_item')}
              </Button>
            </>
          )}
          {tab === 'movements' && (
            <Button variant="primary" onClick={() => openMovement()}>
              <Plus size={15} />
              {t('warehouse.movement_type')}
            </Button>
          )}
        </div>
      </div>

      <GuideBar
        id="warehouse-guide"
        title={t('guide.warehouse_title')}
        body={t('guide.warehouse_body')}
        type="tip"
      />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['items', 'movements'] as Tab[]).map((tabId) => (
          <button
            key={tabId}
            onClick={() => setTab(tabId)}
            style={{
              padding: '7px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600,
              background: tab === tabId ? '#f97316' : (dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'),
              color: tab === tabId ? '#fff' : textMuted,
              transition: 'all 0.15s',
            }}
          >
            {tabId === 'items' ? t('warehouse.items_tab') : t('warehouse.movements_tab')}
          </button>
        ))}
      </div>

      {/* Items tab */}
      {tab === 'items' && (
        <>
          {/* Summary card */}
          <div style={{ background: surface, borderRadius: 14, border: `1px solid ${border}`, padding: '16px 20px', marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('warehouse.total_value')}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#f97316', marginTop: 2 }}>{centsToEur(totalValue)} €</div>
            </div>
          </div>

          <div style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
            {items.length === 0 ? (
              <div style={{ padding: '60px 24px', textAlign: 'center' as const }}>
                <ArrowUpDown size={40} style={{ color: dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb', marginBottom: 12 }} />
                <div style={{ fontSize: 15, fontWeight: 600, color: textMuted }}>{t('warehouse.empty')}</div>
                <div style={{ fontSize: 13, color: textMuted, marginTop: 4 }}>{t('warehouse.empty_desc')}</div>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${border}` }}>
                    {[t('warehouse.name'), t('warehouse.unit'), t('warehouse.quantity'), t('warehouse.sale_price'), ''].map((h, i) => (
                      <th key={i} style={{ padding: '12px 16px', textAlign: i < 4 ? 'left' as const : 'right' as const, fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      style={{ borderBottom: `1px solid ${border}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = dark ? 'rgba(255,255,255,0.02)' : '#fafafa'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: textMain }}>{item.name}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: textMuted }}>{item.unit}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: textMain }}>{item.quantity}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: '#f97316', fontWeight: 600 }}>{centsToEur(item.salePriceCents)} €</td>
                      <td style={{ padding: '11px 16px' }}>
                        <div style={{ display: 'flex', gap: 5, justifyContent: 'flex-end' }}>
                          <button onClick={() => openEditItem(item)} title={t('common.edit')} style={iconBtnStyle(dark)}>
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => openMovement(item.id)} title={t('warehouse.movement_type')} style={iconBtnStyle(dark)}>
                            <ArrowUpDown size={14} />
                          </button>
                          <button onClick={() => handleDelete(item)} title={t('common.delete')} style={{ ...iconBtnStyle(dark), color: '#ef4444' }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Movements tab */}
      {tab === 'movements' && (
        <div style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
          {movements.length === 0 ? (
            <div style={{ padding: '60px 24px', textAlign: 'center' as const }}>
              <ArrowUpDown size={40} style={{ color: dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb', marginBottom: 12 }} />
              <div style={{ fontSize: 15, fontWeight: 600, color: textMuted }}>{t('warehouse.empty')}</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${border}` }}>
                  {[t('warehouse.movement_date'), t('warehouse.name'), t('warehouse.movement_type'), t('warehouse.quantity'), t('warehouse.movement_price'), t('warehouse.movement_desc')].map((h, i) => (
                    <th key={i} style={{ padding: '12px 16px', textAlign: 'left' as const, fontSize: 11, fontWeight: 700, color: textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {movements.map((mv) => {
                  const item = items.find((it) => it.id === mv.itemId);
                  return (
                    <tr
                      key={mv.id}
                      style={{ borderBottom: `1px solid ${border}` }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = dark ? 'rgba(255,255,255,0.02)' : '#fafafa'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <td style={{ padding: '11px 16px', fontSize: 13, color: textMuted }}>{mv.date}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: textMain, fontWeight: 600 }}>{item?.name ?? mv.itemId}</td>
                      <td style={{ padding: '11px 16px' }}><MovementBadge type={mv.type} /></td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: textMain }}>{mv.quantity}</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: textMuted }}>{centsToEur(mv.priceCents)} €</td>
                      <td style={{ padding: '11px 16px', fontSize: 13, color: textMuted }}>{mv.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      <WarehouseItemModal open={itemModalOpen} onClose={() => setItemModalOpen(false)} item={editItem} />
      <MovementModal open={movementModalOpen} onClose={() => setMovementModalOpen(false)} preselectedItemId={movementItemId} />
    </div>
  );
}

function iconBtnStyle(dark: boolean) {
  return {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af',
    padding: 5,
    borderRadius: 6,
    display: 'flex' as const,
    alignItems: 'center' as const,
  };
}
