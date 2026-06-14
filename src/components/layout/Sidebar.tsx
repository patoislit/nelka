import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Receipt, BarChart2, Settings, Building2, X, FileText, Package, ClipboardList, ChevronDown } from 'lucide-react';
import { useCompanyStore } from '../../store/companyStore';
import { Logo } from '../common/Logo';

interface SidebarProps { open: boolean; onClose: () => void; }

const NAV = [
  { to: '/dashboard',    Icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/transactions', Icon: Receipt,          key: 'nav.transactions' },
  { to: '/invoices',     Icon: FileText,         key: 'nav.invoices' },
  { to: '/warehouse',    Icon: Package,          key: 'nav.warehouse' },
  { to: '/tax',          Icon: ClipboardList,    key: 'nav.tax' },
  { to: '/reports',      Icon: BarChart2,        key: 'nav.reports' },
  { to: '/companies',    Icon: Building2,        key: 'nav.companies' },
  { to: '/settings',     Icon: Settings,         key: 'nav.settings' },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { getActiveCompany, companies, setActiveCompany } = useCompanyStore();
  const location = useLocation();
  const company = getActiveCompany();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    if (dropOpen) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dropOpen]);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
          className="lg:hidden"
        />
      )}

      <aside style={{
        width: 216,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        background: '#0c0c0e',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        fontFamily: "'Inter', system-ui, sans-serif",
        // odsadenie pod stavový riadok (hodiny/výrez) na mobile; na desktope = 0
        paddingTop: 'env(safe-area-inset-top)',
      }}
        className={`fixed lg:static top-0 left-0 h-full z-50 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60, padding: '0 18px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <Logo variant="mark" size={22} dark={true} />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 15, letterSpacing: '-0.3px' }}>Nelka</span>
          </div>
          <button onClick={onClose} className="lg:hidden" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
            <X size={15} />
          </button>
        </div>

        {/* Company switcher */}
        {company && (
          <div ref={dropRef} style={{ margin: '14px 12px 0', position: 'relative' }}>
            <button
              onClick={() => setDropOpen((v) => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(249,115,22,0.08)',
                border: '1px solid rgba(249,115,22,0.15)',
                cursor: 'pointer',
              }}
            >
              <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{company.name}</p>
                <p style={{ fontSize: 10, color: 'rgba(249,115,22,0.65)', marginTop: 3, fontWeight: 500, margin: '3px 0 0' }}>
                  {company.type === 'simple' ? 'Jednoduche' : 'Podvojne'} uctovnictvo
                </p>
              </div>
              <ChevronDown size={13} color="rgba(249,115,22,0.6)" style={{ flexShrink: 0, transform: dropOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>

            {dropOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                background: '#1a1a1f', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 12, zIndex: 200, overflow: 'hidden',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              }}>
                {companies.map((c) => {
                  const isActive = c.id === company.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => { setActiveCompany(c.id); setDropOpen(false); }}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '10px 12px', border: 'none', cursor: 'pointer',
                        background: isActive ? 'rgba(249,115,22,0.12)' : 'transparent',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ width: 6, height: 6, borderRadius: '50%', flexShrink: 0, background: isActive ? '#f97316' : 'rgba(255,255,255,0.2)' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: isActive ? '#f97316' : 'rgba(255,255,255,0.7)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</p>
                        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '1px 0 0' }}>{c.type === 'simple' ? 'Jednoduche' : 'Podvojne'}</p>
                      </div>
                    </button>
                  );
                })}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => { setDropOpen(false); navigate('/companies'); onClose(); }}
                    style={{
                      width: '100%', padding: '10px 12px', border: 'none', cursor: 'pointer',
                      background: 'transparent', textAlign: 'left',
                      fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Spravovat firmy →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Nav links */}
        <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
          {NAV.map(({ to, Icon, key }) => {
            const active = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                onClick={onClose}
                style={{
                  display: 'flex', alignItems: 'center', gap: 11,
                  padding: '9px 12px', borderRadius: 10, textDecoration: 'none',
                  fontSize: 13, fontWeight: 500,
                  background: active ? '#f97316' : 'transparent',
                  color: active ? '#fff' : 'rgba(255,255,255,0.38)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; } }}
                onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.38)'; } }}
              >
                <Icon size={16} />
                {t(key)}
              </NavLink>
            );
          })}
        </nav>

      </aside>
    </>
  );
}
