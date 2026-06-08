import { useTranslation } from 'react-i18next';
import { BarChart2 } from 'lucide-react';
import { useDark } from '../../store/themeStore';
import { useCompanyStore } from '../../store/companyStore';
import { useTransactionStore } from '../../store/transactionStore';
import { GuideBar } from '../../components/common/GuideBar';
import { SimpleReport } from './SimpleReport';
import { DoubleReport } from './DoubleReport';

export function ReportsPage() {
  const { t } = useTranslation();
  const dark = useDark();
  const { getActiveCompany } = useCompanyStore();
  const { getSimple, getJournalEntries } = useTransactionStore();
  const company = getActiveCompany();

  const textColor = dark ? 'rgba(255,255,255,0.85)' : '#111827';
  const mutedColor = dark ? 'rgba(255,255,255,0.5)' : '#6b7280';
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const cardBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';

  if (!company) {
    return (
      <div style={{ padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{
          background: cardBg, border: `1px solid ${cardBorder}`,
          borderRadius: 12, padding: 40, textAlign: 'center',
        }}>
          <div style={{ fontSize: 14, color: mutedColor }}>{t('dashboard.no_company')}</div>
          <div style={{ fontSize: 13, color: mutedColor, marginTop: 8 }}>{t('dashboard.select_company')}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: dark ? '#0c0c0e' : '#f8f9fb' }}>
    <div style={{ padding: 24, maxWidth: 1100, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: textColor, margin: 0 }}>{t('reports.title')}</h1>
        <div style={{ fontSize: 13, color: mutedColor, marginTop: 4 }}>{company.name}</div>
      </div>

      <GuideBar
        id="reports-guide"
        icon={<BarChart2 size={16} />}
        title={t('guide.reports_title')}
        body={t('guide.reports_body')}
        type="info"
      />

      {company.type === 'simple' ? (
        <SimpleReport transactions={getSimple(company.id)} />
      ) : (
        <DoubleReport entries={getJournalEntries(company.id)} />
      )}
    </div>
    </div>
  );
}
