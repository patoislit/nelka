import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDark } from '../../store/themeStore';
import {
  LayoutDashboard, Receipt, FileText, Package, BarChart2,
  Settings, Building2, ClipboardList, Plus, Search, ArrowRight,
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  action: () => void;
  keywords: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const dark = useDark();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setQuery(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [open]);

  const go = (path: string) => { navigate(path); onClose(); };
  const fire = (action: () => void) => { action(); onClose(); };

  const COMMANDS: Command[] = [
    { id: 'dashboard',    label: 'Dashboard',        sublabel: 'Ctrl+D · Ctrl+1',     icon: <LayoutDashboard size={16} />, action: () => go('/dashboard'),    keywords: 'dashboard prehled' },
    { id: 'transactions', label: 'Transakcie',        sublabel: 'Ctrl+T · Ctrl+2',     icon: <Receipt size={16} />,         action: () => go('/transactions'), keywords: 'transakcie prijmy vydavky' },
    { id: 'invoices',     label: 'Faktúry',           sublabel: 'Ctrl+I · Ctrl+3',     icon: <FileText size={16} />,        action: () => go('/invoices'),     keywords: 'faktury invoice' },
    { id: 'warehouse',    label: 'Sklad',             sublabel: 'Ctrl+W · Ctrl+4',     icon: <Package size={16} />,         action: () => go('/warehouse'),    keywords: 'sklad warehouse tovar' },
    { id: 'tax',          label: 'Daňové priznanie',  sublabel: 'Ctrl+5',              icon: <ClipboardList size={16} />,   action: () => go('/tax'),          keywords: 'dan danove priznanie' },
    { id: 'reports',      label: 'Reporty',           sublabel: 'Ctrl+R · Ctrl+6',     icon: <BarChart2 size={16} />,       action: () => go('/reports'),      keywords: 'reporty vykazy zostavy' },
    { id: 'companies',    label: 'Firmy',             sublabel: 'Ctrl+7',              icon: <Building2 size={16} />,       action: () => go('/companies'),    keywords: 'firmy spolocnosti' },
    { id: 'settings',     label: 'Nastavenia',        sublabel: 'Ctrl+8',              icon: <Settings size={16} />,        action: () => go('/settings'),     keywords: 'nastavenia settings' },
    { id: 'new-income',   label: 'Nový príjem',       sublabel: 'Ctrl+N',              icon: <Plus size={16} color="#10b981" />, action: () => { go('/transactions'); setTimeout(() => window.dispatchEvent(new CustomEvent('nelka:new-income')), 200); }, keywords: 'novy prijem transakcia' },
    { id: 'new-expense',  label: 'Nový výdavok',      sublabel: 'Ctrl+N (v transakciách)', icon: <Plus size={16} color="#ef4444" />, action: () => { go('/transactions'); setTimeout(() => window.dispatchEvent(new CustomEvent('nelka:new-expense')), 200); }, keywords: 'novy vydavok transakcia' },
    { id: 'new-invoice',  label: 'Nová faktúra',      sublabel: 'Ctrl+Shift+N',        icon: <Plus size={16} color="#f97316" />, action: () => { go('/invoices'); setTimeout(() => window.dispatchEvent(new CustomEvent('nelka:new-invoice')), 200); }, keywords: 'nova faktura invoice' },
  ];

  const filtered = useMemo(() => {
    if (!query.trim()) return COMMANDS;
    const q = query.toLowerCase();
    return COMMANDS.filter(c =>
      c.label.toLowerCase().includes(q) ||
      c.sublabel?.toLowerCase().includes(q) ||
      c.keywords.includes(q)
    );
  }, [query]);

  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter')     { e.preventDefault(); if (filtered[selected]) fire(filtered[selected].action); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, filtered, selected]);

  if (!open) return null;

  const bg     = dark ? '#111113' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';
  const text   = dark ? '#f1f5f9' : '#111827';
  const muted  = dark ? 'rgba(255,255,255,0.38)' : '#9ca3af';

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Palette */}
      <div style={{
        position: 'fixed', top: '18%', left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 560, zIndex: 9999,
        background: bg, border: `1px solid ${border}`,
        borderRadius: 20,
        boxShadow: dark
          ? '0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)'
          : '0 32px 80px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}>
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderBottom: `1px solid ${border}` }}>
          <Search size={17} color={muted} style={{ flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Hľadaj príkaz alebo stránku…"
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontSize: 15, color: text, fontFamily: 'inherit',
            }}
          />
          <kbd style={{
            fontSize: 10, padding: '2px 6px', borderRadius: 5,
            background: dark ? 'rgba(255,255,255,0.07)' : '#f3f4f6',
            color: muted, border: `1px solid ${border}`, flexShrink: 0,
          }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 8px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: muted, fontSize: 13 }}>
              Nič sa nenašlo
            </div>
          ) : filtered.map((cmd, i) => (
            <button
              key={cmd.id}
              onClick={() => fire(cmd.action)}
              onMouseEnter={() => setSelected(i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: selected === i
                  ? (dark ? 'rgba(249,115,22,0.12)' : 'rgba(249,115,22,0.08)')
                  : 'transparent',
                textAlign: 'left', fontFamily: 'inherit', transition: 'background 0.1s',
              }}
            >
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected === i
                  ? (dark ? 'rgba(249,115,22,0.2)' : 'rgba(249,115,22,0.12)')
                  : (dark ? 'rgba(255,255,255,0.06)' : '#f3f4f6'),
                color: selected === i ? '#f97316' : muted,
                transition: 'all 0.1s',
              }}>
                {cmd.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: selected === i ? (dark ? '#fff' : '#111') : text }}>{cmd.label}</div>
                {cmd.sublabel && <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{cmd.sublabel}</div>}
              </div>
              {selected === i && <ArrowRight size={14} color="#f97316" style={{ flexShrink: 0 }} />}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px', borderTop: `1px solid ${border}`,
          display: 'flex', gap: 16, alignItems: 'center',
        }}>
          {[
            { key: '↑↓', label: 'navigovať' },
            { key: '↵', label: 'otvoriť' },
            { key: 'ESC', label: 'zatvoriť' },
          ].map(k => (
            <div key={k.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <kbd style={{ fontSize: 10, padding: '2px 6px', borderRadius: 5, background: dark ? 'rgba(255,255,255,0.07)' : '#f3f4f6', color: muted, border: `1px solid ${border}` }}>{k.key}</kbd>
              <span style={{ fontSize: 11, color: muted }}>{k.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
