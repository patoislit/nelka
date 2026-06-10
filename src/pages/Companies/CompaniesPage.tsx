import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2, ChevronRight, ArrowLeft, Layers, BookOpen } from 'lucide-react';
import { useCompanyStore } from '../../store/companyStore';
import type { AccountingType, Company } from '../../store/companyStore';
import { Logo } from '../../components/common/Logo';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useDark } from '../../store/themeStore';

interface Form {
  name: string; ico: string; dic: string; type: AccountingType;
  address: string; city: string; zip: string; email: string; phone: string;
  iban: string; bank: string; logoDataUrl: string;
}
const EMPTY: Form = { name: '', ico: '', dic: '', type: 'simple', address: '', city: '', zip: '', email: '', phone: '', iban: '', bank: '', logoDataUrl: '' };

export function CompaniesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dark = useDark();
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 12,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
    background: dark ? 'rgba(255,255,255,0.05)' : '#f9fafb',
    color: dark ? '#fff' : '#111827', fontSize: 13, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600,
    color: dark ? 'rgba(255,255,255,0.4)' : '#9ca3af',
    marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em',
  };
  const { companies, addCompany, updateCompany, deleteCompany, setActiveCompany } = useCompanyStore();

  // Filter companies by the type chosen on the welcome screen
  const selectedType = (sessionStorage.getItem('nelka_selected_type') as AccountingType) || 'simple';
  const visible = companies.filter((c) => c.type === selectedType);

  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<Form>(EMPTY);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  function openAdd()            { setForm({ ...EMPTY, type: selectedType }); setEditId(null); setModalOpen(true); }
  function openEdit(c: Company) { setForm({ name: c.name, ico: c.ico, dic: c.dic, type: c.type, address: c.address ?? '', city: c.city ?? '', zip: c.zip ?? '', email: c.email ?? '', phone: c.phone ?? '', iban: c.iban ?? '', bank: c.bank ?? '', logoDataUrl: c.logoDataUrl ?? '' }); setEditId(c.id); setModalOpen(true); }

  function handleSave() {
    if (!form.name.trim()) return;
    if (editId) {
      updateCompany(editId, { ...form, logoDataUrl: form.logoDataUrl || undefined });
    } else {
      const c = addCompany({ ...form, ownerId: 'local', logoDataUrl: form.logoDataUrl || undefined });
      setActiveCompany(c.id);
    }
    setModalOpen(false);
    setForm(EMPTY);
  }

  function handleSelect(c: Company) {
    setActiveCompany(c.id);
    navigate('/dashboard');
  }

  const typeOptions = [
    { value: 'simple', label: t('common.simple_accounting') },
    { value: 'double', label: t('common.double_accounting') },
  ];

  const isDouble = selectedType === 'double';
  const Icon = isDouble ? BookOpen : Layers;
  const typeBadge = isDouble ? 'Podvojné účtovníctvo' : 'Jednoduché účtovníctvo';

  return (
    <div style={{
      minHeight: '100vh',
      background: dark ? '#0c0c0e' : '#ffffff',
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '40px 16px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-orange-500 transition-colors mb-8"
          style={{ fontSize: 12, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <ArrowLeft size={13} /> {t('common.back')}
        </button>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <Logo variant="mark" size={28} dark={false} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                padding: '3px 8px', borderRadius: 999,
                background: isDouble ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
                color: isDouble ? '#8b5cf6' : '#3b82f6',
              }}>
                {typeBadge}
              </span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: dark ? '#ffffff' : '#0c0c0e' }}>
              {t('companies.title')}
            </h1>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{t('companies.subtitle')}</p>
          </div>

          <button
            onClick={openAdd}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 12,
              background: '#f97316', border: 'none', cursor: 'pointer',
              color: '#fff', fontSize: 13, fontWeight: 600,
              boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
              flexShrink: 0,
            }}
          >
            <Plus size={14} /> {t('companies.add')}
          </button>
        </div>

        {/* Company list */}
        {visible.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: 'rgba(249,115,22,0.08)',
              border: '1px solid rgba(249,115,22,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Icon size={22} color="#f97316" />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: dark ? 'rgba(255,255,255,0.8)' : '#374151' }}>{t('companies.empty')}</p>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 4, maxWidth: 260, margin: '4px auto 0' }}>
              {t('companies.empty_desc')}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {visible.map((c) => (
              <CompanyRow
                key={c.id}
                company={c}
                isDouble={isDouble}
                dark={dark}
                onSelect={() => handleSelect(c)}
                onEdit={() => openEdit(c)}
                onDelete={() => setDelConfirm(c.id)}
              />
            ))}
          </div>
        )}

      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editId ? t('companies.modal_edit') : t('companies.modal_title')}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: "'Inter', system-ui, sans-serif" }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>{t('companies.name_label')}</label>
            <input style={inputStyle} placeholder={t('companies.name_placeholder')} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          {/* IČO + DIČ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>{t('companies.ico_label')}</label>
              <input style={inputStyle} placeholder={t('companies.ico_placeholder')} value={form.ico} onChange={(e) => setForm((f) => ({ ...f, ico: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>{t('companies.dic_label')}</label>
              <input style={inputStyle} placeholder={t('companies.dic_placeholder')} value={form.dic} onChange={(e) => setForm((f) => ({ ...f, dic: e.target.value }))} />
            </div>
          </div>
          {/* Adresa + Mesto + PSČ */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Adresa</label>
              <input style={inputStyle} placeholder="Ulica a číslo" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Mesto</label>
              <input style={inputStyle} placeholder="Bratislava" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>PSČ</label>
              <input style={inputStyle} placeholder="81101" value={form.zip} onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))} />
            </div>
          </div>
          {/* Email + Telefón */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} placeholder="firma@example.sk" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Telefón</label>
              <input style={inputStyle} placeholder="+421 900 000 000" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          {/* IBAN + Banka */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>IBAN</label>
              <input style={inputStyle} placeholder="SK00 0000 0000 0000 0000 0000" value={form.iban} onChange={(e) => setForm((f) => ({ ...f, iban: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>Banka</label>
              <input style={inputStyle} placeholder="Slovenská sporiteľňa" value={form.bank} onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))} />
            </div>
          </div>
          {/* Logo upload */}
          <div>
            <label style={labelStyle}>Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {form.logoDataUrl && (
                <img src={form.logoDataUrl} alt="logo" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}` }} />
              )}
              <label style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                padding: '8px 14px', borderRadius: 10,
                border: `1px dashed ${dark ? 'rgba(255,255,255,0.2)' : '#d1d5db'}`,
                color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280',
                fontSize: 12, fontWeight: 500,
              }}>
                Nahrať logo
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => { if (ev.target?.result) setForm((f) => ({ ...f, logoDataUrl: ev.target!.result as string })); };
                  reader.readAsDataURL(file);
                }} />
              </label>
              {form.logoDataUrl && (
                <button onClick={() => setForm((f) => ({ ...f, logoDataUrl: '' }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 12 }}>
                  Odstrániť
                </button>
              )}
            </div>
          </div>
          {/* Accounting type */}
          <div>
            <label style={labelStyle}>{t('companies.type')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {typeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setForm((f) => ({ ...f, type: opt.value as AccountingType }))}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    fontFamily: 'inherit', fontSize: 13, fontWeight: 500, transition: 'all 0.15s',
                    background: form.type === opt.value
                      ? (dark ? 'rgba(249,115,22,0.2)' : '#fff7ed')
                      : (dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6'),
                    color: form.type === opt.value ? '#f97316' : (dark ? 'rgba(255,255,255,0.5)' : '#6b7280'),
                    outline: form.type === opt.value ? '1.5px solid rgba(249,115,22,0.4)' : '1px solid transparent',
                    outlineOffset: -1,
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <Button variant="secondary" fullWidth onClick={() => setModalOpen(false)}>{t('common.cancel')}</Button>
            <Button fullWidth onClick={handleSave} disabled={!form.name.trim()}>{t('common.save')}</Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!delConfirm} onClose={() => setDelConfirm(null)} title={t('common.confirm')} size="sm">
        <p style={{ fontSize: 13, color: dark ? 'rgba(255,255,255,0.5)' : '#6b7280', marginBottom: 20 }}>{t('companies.confirm_delete')}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" fullWidth onClick={() => setDelConfirm(null)}>{t('common.cancel')}</Button>
          <Button variant="danger" fullWidth onClick={() => { if (delConfirm) { deleteCompany(delConfirm); setDelConfirm(null); } }}>{t('common.delete')}</Button>
        </div>
      </Modal>
    </div>
  );
}

function CompanyRow({ company, isDouble, dark, onSelect, onEdit, onDelete }: {
  company: Company; isDouble: boolean; dark: boolean;
  onSelect: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const Icon = isDouble ? BookOpen : Layers;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 16px', borderRadius: 16, cursor: 'pointer',
        border: hovered ? '1px solid #f97316' : `1px solid ${dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb'}`,
        background: hovered ? (dark ? 'rgba(249,115,22,0.05)' : 'rgba(249,115,22,0.02)') : (dark ? 'rgba(255,255,255,0.02)' : '#ffffff'),
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 12, flexShrink: 0,
        background: 'rgba(249,115,22,0.08)',
        border: '1px solid rgba(249,115,22,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={17} color="#f97316" />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: dark ? '#ffffff' : '#0c0c0e' }}>
          {company.name}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
          <span style={{
            fontSize: 11, fontWeight: 600,
            padding: '1px 7px', borderRadius: 999,
            background: isDouble ? 'rgba(139,92,246,0.08)' : 'rgba(59,130,246,0.08)',
            color: isDouble ? '#8b5cf6' : '#3b82f6',
          }}>
            {isDouble ? 'Podvojné' : 'Jednoduché'}
          </span>
          {company.ico && <span style={{ fontSize: 11, color: '#9ca3af' }}>IČO {company.ico}</span>}
        </div>
      </div>

      {hovered && (
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onEdit}
            style={{ padding: 7, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f4f4f5'; e.currentTarget.style.color = '#374151'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={onDelete}
            style={{ padding: 7, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}

      <ChevronRight size={15} color={hovered ? '#f97316' : '#e5e7eb'} style={{ flexShrink: 0, transition: 'color 0.15s' }} />
    </div>
  );
}
