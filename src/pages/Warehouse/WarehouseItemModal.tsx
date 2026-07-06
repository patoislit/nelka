import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useDark } from '../../store/themeStore';
import { useWarehouseStore, itemUnitValueCents } from '../../store/warehouseStore';
import type { WarehouseItem } from '../../store/warehouseStore';
import { centsToEur } from '../../store/transactionStore';
import { useCompanyStore } from '../../store/companyStore';

interface Props { open: boolean; onClose: () => void; item?: WarehouseItem; }

const UNITS = ['ks', 'kg', 'g', 'm', 'cm', 'l', 'ml', 'h', 'bal'];

export function WarehouseItemModal({ open, onClose, item }: Props) {
  const { t } = useTranslation();
  const dark = useDark();
  const { addItem, updateItem } = useWarehouseStore();
  const { getActiveCompany } = useCompanyStore();
  const company = getActiveCompany();

  const [name,     setName]     = useState('');
  const [unit,     setUnit]     = useState('ks');
  const [quantity, setQuantity] = useState('0');

  useEffect(() => {
    if (!open) return;
    if (item) {
      setName(item.name);
      setUnit(item.unit);
      setQuantity(String(item.quantity));
    } else {
      setName(''); setUnit('ks'); setQuantity('0');
    }
  }, [open, item]);

  const handleSave = () => {
    if (!company || !name.trim()) return;
    const qty = parseFloat(quantity.replace(',', '.')) || 0;
    if (item) {
      // ceny sa karty netýkajú — riadi ich príjem tovaru (vážený priemer)
      updateItem(item.id, { name, unit, quantity: qty });
    } else {
      addItem({
        companyId: company.id,
        code: '',
        name,
        unit,
        quantity: qty,
        purchasePriceCents: 0,
        salePriceCents: 0,
        lowStockThreshold: 0,
      });
    }
    onClose();
  };

  const inputBg    = dark ? '#1c1c1f' : '#f9fafb';
  const border     = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const textMain   = dark ? '#f1f5f9' : '#111827';
  const textMuted  = dark ? 'rgba(255,255,255,0.5)' : '#6b7280';
  const labelStyle = { fontSize: 11, fontWeight: 600 as const, color: textMuted, marginBottom: 6, display: 'block' as const, textTransform: 'uppercase' as const, letterSpacing: '0.05em' };
  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 12,
    border: `1px solid ${border}`, background: inputBg,
    color: textMain, fontSize: 14, fontFamily: "'Inter', sans-serif",
    boxSizing: 'border-box' as const, outline: 'none',
  };

  const stockValueCents = item ? Math.round(item.quantity * itemUnitValueCents(item)) : 0;

  return (
    <Modal open={open} onClose={onClose} title={item ? t('warehouse.edit_item') : t('warehouse.new_item')} size="sm">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'Inter', sans-serif" }}>

        <div>
          <label style={labelStyle}>{t('warehouse.name')}</label>
          <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="Názov položky" autoFocus />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelStyle}>{t('warehouse.unit')}</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer', background: inputBg }}
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              {UNITS.map((u) => (
                <option key={u} value={u} style={{ background: dark ? '#1c1c1f' : '#fff', color: textMain }}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>{t('warehouse.quantity')}</label>
            <input
              style={inputStyle} type="text" inputMode="decimal"
              value={quantity} onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
        </div>

        {/* Hodnota zásoby — len na čítanie, počíta sa z cien zadaných pri príjmoch */}
        {item && (
          <div style={{
            padding: '12px 14px', borderRadius: 12,
            background: dark ? 'rgba(249,115,22,0.08)' : '#fff7ed',
            border: `1px solid ${dark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.18)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: textMuted }}>{t('warehouse.value')}</span>
            <span style={{ fontSize: 17, fontWeight: 700, color: '#f97316' }}>{centsToEur(stockValueCents)} €</span>
          </div>
        )}

        <p style={{ fontSize: 11.5, color: textMuted, margin: 0, lineHeight: 1.5 }}>
          Cenu zadávaš pri každom príjme tovaru — hodnota zásoby sa počíta automaticky (vážený priemer nákupov).
        </p>

        <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
          <Button variant="secondary" fullWidth onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="primary" fullWidth onClick={handleSave} disabled={!name.trim()}>{t('common.save')}</Button>
        </div>
      </div>
    </Modal>
  );
}
