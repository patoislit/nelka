import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LayoutDashboard, Receipt, BarChart2, Settings, Building2, X, FileText, Package } from 'lucide-react';
import { useCompanyStore } from '../../store/companyStore';
import { Logo } from '../common/Logo';

interface SidebarProps { open: boolean; onClose: () => void; }

const NAV = [
  { to: '/dashboard',    Icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/transactions', Icon: Receipt,          key: 'nav.transactions' },
  { to: '/invoices',     Icon: FileText,         key: 'nav.invoices' },
  { to: '/warehouse',    Icon: Package,          key: 'nav.warehouse' },
  { to: '/reports',      Icon: BarChart2,        key: 'nav.reports' },
  { to: '/companies',    Icon: Building2,        key: 'nav.companies' },
  { to: '/settings',     Icon: Settings,         key: 'nav.settings' },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const { getActiveCompany } = useCompanyStore();
  const location = useLocation();
  const company = getActiveCompany();

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

        {/* Active company chip */}
        {company && (
          <div style={{
            margin: '14px 12px 0',
            padding: '10px 12px', borderRadius: 12,
            background: 'rgba(249,115,22,0.08)',
            border: '1px solid rgba(249,115,22,0.15)',
          }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{company.name}</p>
            <p style={{ fontSize: 10, color: 'rgba(249,115,22,0.65)', marginTop: 3, fontWeight: 500 }}>
              {company.type === 'simple' ? 'Jednoduché' : 'Podvojné'} účtovníctvo
            </p>
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
