import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useDark } from '../../store/themeStore';
import { useWarehouseStore } from '../../store/warehouseStore';
import type { MovementType } from '../../store/warehouseStore';
import { centsToEur } from '../../store/transactionStore';
import { useCompanyStore } from '../../store/companyStore';
import { useTransactionStore } from '../../store/transactionStore';

interface Props {
  open: boolean;
  onClose: () => void;
  preselectedItemId?: string;
}

export function MovementModal({ open, onClose, preselectedItemId }: Props) {
  const { t } = useTranslation();
  const dark = useDark();
  const { getItemsForCompany, addMovement } = useWarehouseStore();
  const { getActiveCompany } = useCompanyStore();
  const { addJournalEntry } = useTransactionStore();
  const company = getActiveCompany();

  const [itemId, setItemId] = useState('');
  const [type, setType] = useState<MovementType>('in');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0,00');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  // Cena sa zadáva pri každom pohybe nanovo (nákupné ceny sa menia) — žiadny prefill
  const handleItemChange = (id: string) => {
    setItemId(id);
  };

  // Total = quantity × unitPrice
  const qty = parseFloat(quantity.replace(',', '.')) || 0;
  const unitPriceCents = (() => {
    const v = unitPrice.replace(',', '.').replace(/[^\d.]/g, '');
    return Math.round(parseFloat(v || '0') * 100);
  })();
  const totalCents = qty * unitPriceCents;

  useEffect(() => {
    if (!open) return;
    const id = preselectedItemId ?? '';
    setItemId(id);
    setType('in');
    setQuantity('1');
    setDate(new Date().toISOString().slice(0, 10));
    setDescription('');
    // Cena sa zadáva pri každom pohybe nanovo
    setUnitPrice('0,00');
  }, [open, preselectedItemId]);

  const items = company ? getItemsForCompany(company.id) : [];

  const handleSave = () => {
    if (!company || !itemId) return;
    if (qty <= 0) return;

    // Výdaj nesmie prekročiť aktuálnu zásobu (sklad by šiel do mínusu)
    if (type === 'out') {
      const item = items.find((it) => it.id === itemId);
      if (item && qty > item.quantity) {
        alert(`Na sklade je len ${item.quantity} ${item.unit} — nemôžeš vydať ${qty}.`);
        return;
      }
    }

    const movement = addMovement({
      companyId: company.id,
      itemId,
      type,
      quantity: qty,
      priceCents: totalCents,
      date,
      description,
    });

    if (company.type === 'double') {
      const total = totalCents;
      if (total > 0) {
        if (type === 'in') {
          addJournalEntry({
            companyId: company.id,
            date,
            description: description || `Príjem tovaru`,
            createdBy: 'system',
            lines: [
              { id: crypto.randomUUID(), accountCode: '112', accountName: 'Tovar', debitCents: total, creditCents: 0 },
              { id: crypto.randomUUID(), accountCode: '321', accountName: 'Záväzky voči dodávateľom', debitCents: 0, creditCents: total },
            ],
          });
        } else if (type === 'out') {
          addJournalEntry({
            companyId: company.id,
            date,
            description: description || `Výdaj tovaru`,
            createdBy: 'system',
            lines: [
              { id: crypto.randomUUID(), accountCode: '504', accountName: 'Predaný tovar', debitCents: total, creditCents: 0 },
              { id: crypto.randomUUID(), accountCode: '132', accountName: 'Tovar na sklade', debitCents: 0, creditCents: total },
            ],
          });
        }
      }
    }

    void movement;
    onClose();
  };

  const inputBg = dark ? '#0c0c0e' : '#f9fafb';
  const border = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const textMain = dark ? '#f1f5f9' : '#111827';
  const textMuted = dark ? 'rgba(255,255,255,0.5)' : '#6b7280';
  const labelStyle = { fontSize: 12, fontWeight: 600 as const, color: textMuted, marginBottom: 4, display: 'block' as const };
  const inputStyle = {
    width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${border}`,
    background: inputBg, color: textMain, fontSize: 13, fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box' as const, outline: 'none',
  };

  return (
    <Modal open={open} onClose={onClose} title={t('warehouse.movement_type')} size="md">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontFamily: "'Inter', sans-serif" }}>
        <div>
          <label style={labelStyle}>{t('warehouse.select_item')}</label>
          <select style={{ ...inputStyle, cursor: 'pointer' }} value={itemId} onChange={(e) => handleItemChange(e.target.value)}>
            <option value="">—</option>
            {items.map((it) => (
              <option key={it.id} value={it.id}>{it.name}{it.code ? ` (${it.code})` : ''}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('warehouse.movement_type')}</label>
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={type} onChange={(e) => setType(e.target.value as MovementType)}>
              <option value="in">{t('warehouse.movement_in')}</option>
              <option value="out">{t('warehouse.movement_out')}</option>
              <option value="adjustment">{t('warehouse.movement_adj')}</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('warehouse.movement_date')}</label>
            <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('warehouse.quantity')}</label>
            <input style={inputStyle} type="text" inputMode="decimal" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>{t('warehouse.price_per_unit')} (€)</label>
            <input style={inputStyle} type="text" inputMode="decimal" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
          </div>
        </div>

        {/* Total auto-calc */}
        <div style={{
          background: dark ? 'rgba(249,115,22,0.08)' : 'rgba(249,115,22,0.06)',
          border: '1px solid rgba(249,115,22,0.25)',
          borderRadius: 10, padding: '10px 14px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.55)' : '#6b7280' }}>{t('warehouse.total_price')}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#f97316' }}>{centsToEur(totalCents)} €</span>
        </div>

        <div>
          <label style={labelStyle}>{t('warehouse.movement_desc')}</label>
          <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" onClick={handleSave} disabled={!itemId}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
