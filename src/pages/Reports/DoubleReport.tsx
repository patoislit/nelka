import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDark } from '../../store/themeStore';
import type { JournalEntry } from '../../store/transactionStore';
import { centsToEur } from '../../store/transactionStore';

interface Props {
  entries: JournalEntry[];
}

interface AccountBalance {
  code: string;
  name: string;
  type: string;
  debitCents: number;
  creditCents: number;
  balanceCents: number;
}

// Derive account type from code when not found in chart of accounts
function typeFromCode(code: string): string {
  const cls = parseInt(code[0] ?? '0', 10);
  if (cls === 5) return 'expense';
  if (cls === 6) return 'revenue';
  if (cls === 4) return 'equity';
  if (cls === 3) {
    // 3xx: receivables (311,315) = asset; payables (321,331,341,343,365) = liability
    const n = parseInt(code, 10);
    return n < 320 ? 'asset' : 'liability';
  }
  if (cls === 0 || cls === 1 || cls === 2) return 'asset';
  return 'asset';
}

function calcBalances(entries: JournalEntry[]): AccountBalance[] {
  const map: Record<string, AccountBalance> = {};

  for (const entry of entries) {
    for (const line of entry.lines) {
      if (!map[line.accountCode]) {
        map[line.accountCode] = {
          code: line.accountCode,
          name: line.accountName,
          type: typeFromCode(line.accountCode),
          debitCents: 0,
          creditCents: 0,
          balanceCents: 0,
        };
      }
      map[line.accountCode].debitCents  += line.debitCents;
      map[line.accountCode].creditCents += line.creditCents;
    }
  }

  for (const b of Object.values(map)) {
    b.balanceCents = (b.type === 'asset' || b.type === 'expense')
      ? b.debitCents - b.creditCents
      : b.creditCents - b.debitCents;
  }

  return Object.values(map)
    .filter((b) => b.debitCents > 0 || b.creditCents > 0)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export function DoubleReport({ entries }: Props) {
  const { t, i18n } = useTranslation();
  const dark = useDark();
  const sk = i18n.language === 'sk';

  const balances = calcBalances(entries);

  const assets = balances.filter((b) => b.type === 'asset');
  const liabilities = balances.filter((b) => b.type === 'liability');
  const equity = balances.filter((b) => b.type === 'equity');
  const revenues = balances.filter((b) => b.type === 'revenue');
  const expenses = balances.filter((b) => b.type === 'expense');

  const totalAssets = assets.reduce((s, b) => s + b.balanceCents, 0);
  const totalLiabilities = liabilities.reduce((s, b) => s + b.balanceCents, 0);
  const totalEquity = equity.reduce((s, b) => s + b.balanceCents, 0);
  const totalRevenues = revenues.reduce((s, b) => s + b.balanceCents, 0);
  const totalExpenses = expenses.reduce((s, b) => s + b.balanceCents, 0);
  const netProfit = totalRevenues - totalExpenses;

  // Monthly chart data
  const monthlyMap: Record<string, { month: string; revenues: number; expenses: number }> = {};
  for (const entry of entries) {
    const key = entry.date.slice(0, 7);
    if (!monthlyMap[key]) monthlyMap[key] = { month: key, revenues: 0, expenses: 0 };
    for (const line of entry.lines) {
      const t_ = typeFromCode(line.accountCode);
      if (t_ === 'revenue') monthlyMap[key].revenues += line.creditCents;
      if (t_ === 'expense') monthlyMap[key].expenses += line.debitCents;
    }
  }
  const chartData = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({ ...m, revenuesEur: m.revenues / 100, expensesEur: m.expenses / 100 }));

  const textColor = dark ? 'rgba(255,255,255,0.85)' : '#111827';
  const mutedColor = dark ? 'rgba(255,255,255,0.5)' : '#6b7280';
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const cardBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const rowHover = dark ? 'rgba(255,255,255,0.03)' : '#f9fafb';

  const SectionTable = ({ title, rows, totalLabel, totalCents }: {
    title: string; rows: AccountBalance[]; totalLabel: string; totalCents: number;
  }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: mutedColor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{title}</div>
      <div className="report-section-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr>
            {[t('accounts.code'), t('accounts.name'), t('reports.net_eur')].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '5px 6px', color: mutedColor, borderBottom: `1px solid ${cardBorder}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.code} style={{ background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = rowHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <td style={{ padding: '5px 6px', color: mutedColor, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{row.code}</td>
              <td style={{ padding: '5px 6px', color: textColor }}>{row.name}</td>
              <td style={{ padding: '5px 6px', fontWeight: 600, color: row.balanceCents >= 0 ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>{(row.balanceCents / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: `1px solid ${cardBorder}` }}>
            <td colSpan={2} style={{ padding: '5px 6px', fontWeight: 700, color: textColor }}>{totalLabel}</td>
            <td style={{ padding: '5px 6px', fontWeight: 700, color: totalCents >= 0 ? '#10b981' : '#ef4444', whiteSpace: 'nowrap' }}>{(totalCents / 100).toFixed(2)} €</td>
          </tr>
        </tfoot>
      </table></div>
    </div>
  );

  const handleExportBalanceSheetPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(sk ? 'Súvaha – Nelka' : 'Balance Sheet – Nelka', 14, 18);
    doc.setFontSize(10);
    doc.text(`${sk ? 'Aktíva celkom' : 'Total Assets'}: ${centsToEur(totalAssets)} €`, 14, 26);
    doc.text(`${sk ? 'Pasíva + Vlastné imanie' : 'Liabilities + Equity'}: ${centsToEur(totalLiabilities + totalEquity)} €`, 14, 32);
    autoTable(doc, {
      startY: 38,
      head: [['Kód', 'Názov', 'MD', 'D', 'Zostatok €']],
      body: balances.map((b) => [b.code, b.name, (b.debitCents / 100).toFixed(2), (b.creditCents / 100).toFixed(2), (b.balanceCents / 100).toFixed(2)]),
      styles: { fontSize: 8 },
    });
    doc.save('nelka-suvaha.pdf');
  };

  const handleExportPLPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(sk ? 'Výsledovka – Nelka' : 'P&L Statement – Nelka', 14, 18);
    doc.setFontSize(10);
    doc.text(`${t('reports.revenue')}: ${centsToEur(totalRevenues)} €`, 14, 26);
    doc.text(`${t('reports.expense')}: ${centsToEur(totalExpenses)} €`, 14, 32);
    doc.text(`${netProfit >= 0 ? t('reports.profit') : t('reports.loss')}: ${centsToEur(Math.abs(netProfit))} €`, 14, 38);
    autoTable(doc, {
      startY: 44,
      head: [['Kód', 'Názov', 'MD', 'D', 'Zostatok €']],
      body: [...revenues, ...expenses].map((b) => [b.code, b.name, (b.debitCents / 100).toFixed(2), (b.creditCents / 100).toFixed(2), (b.balanceCents / 100).toFixed(2)]),
      styles: { fontSize: 8 },
    });
    doc.save('nelka-vysledovka.pdf');
  };

  const handleExportTrialPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(14);
    doc.text(sk ? 'Obratová predvaha – Nelka' : 'Trial Balance – Nelka', 14, 18);
    autoTable(doc, {
      startY: 26,
      head: [['Kód', 'Názov', 'MD', 'D', 'Zostatok €']],
      body: balances.map((b) => [b.code, b.name, (b.debitCents / 100).toFixed(2), (b.creditCents / 100).toFixed(2), (b.balanceCents / 100).toFixed(2)]),
      styles: { fontSize: 8 },
    });
    doc.save('nelka-obratova-predvaha.pdf');
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('reports.assets'), value: centsToEur(totalAssets), color: '#3b82f6' },
          { label: t('reports.liabilities'), value: centsToEur(totalLiabilities), color: '#ef4444' },
          { label: t('reports.equity'), value: centsToEur(totalEquity), color: '#8b5cf6' },
          { label: t('reports.revenue'), value: centsToEur(totalRevenues), color: '#10b981' },
          { label: t('reports.expense'), value: centsToEur(totalExpenses), color: '#f97316' },
          { label: netProfit >= 0 ? t('reports.profit') : t('reports.loss'), value: centsToEur(Math.abs(netProfit)), color: netProfit >= 0 ? '#10b981' : '#ef4444' },
        ].map((card) => (
          <div key={card.label} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 10, color: mutedColor, marginBottom: 3 }}>{card.label}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: card.color }}>{card.value} €</div>
          </div>
        ))}
      </div>

      {/* Balance Sheet */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{t('reports.balance_sheet')}</div>
          <button onClick={handleExportBalanceSheetPDF} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer' }}>{t('reports.export_pdf')}</button>
        </div>
        <div className="report-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <SectionTable title={t('reports.assets')} rows={assets} totalLabel={t('reports.total_assets')} totalCents={totalAssets} />
          </div>
          <div>
            <SectionTable title={t('reports.liabilities')} rows={liabilities} totalLabel={t('reports.total_liabilities')} totalCents={totalLiabilities} />
            <SectionTable title={t('reports.equity')} rows={equity} totalLabel={t('reports.total_equity')} totalCents={totalEquity} />
          </div>
        </div>
      </div>

      {/* P&L */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{t('reports.profit_loss')}</div>
          <button onClick={handleExportPLPDF} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer' }}>{t('reports.export_pdf')}</button>
        </div>
        <div className="report-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <SectionTable title={t('reports.revenue')} rows={revenues} totalLabel={t('reports.total_revenue')} totalCents={totalRevenues} />
          <SectionTable title={t('reports.expense')} rows={expenses} totalLabel={t('reports.total_expenses')} totalCents={totalExpenses} />
        </div>
        <div style={{ marginTop: 16, padding: '10px 16px', borderRadius: 8, background: netProfit >= 0 ? (dark ? 'rgba(16,185,129,0.1)' : '#f0fdf4') : (dark ? 'rgba(239,68,68,0.1)' : '#fef2f2'), display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, color: textColor }}>{t('reports.net')}</span>
          <span style={{ fontWeight: 700, color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>{centsToEur(netProfit)} €</span>
        </div>
      </div>

      {/* Trial Balance */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{t('reports.trial_balance')}</div>
          <button onClick={handleExportTrialPDF} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 7, border: 'none', background: '#f97316', color: '#fff', cursor: 'pointer' }}>{t('reports.export_pdf')}</button>
        </div>
        {balances.length === 0 ? (
          <div style={{ color: mutedColor, fontSize: 13, textAlign: 'center', padding: 40 }}>{t('reports.no_data')}</div>
        ) : (
          <div className="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {[t('accounts.code'), t('accounts.name'), t('accounts.type'), 'MD', 'D', t('reports.net_eur')].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '5px 8px', color: mutedColor, borderBottom: `1px solid ${cardBorder}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balances.map((row) => (
                <tr key={row.code}>
                  <td style={{ padding: '5px 8px', color: mutedColor, fontFamily: 'monospace' }}>{row.code}</td>
                  <td style={{ padding: '5px 8px', color: textColor }}>{row.name}</td>
                  <td style={{ padding: '5px 8px', color: mutedColor }}>{t(`accounts.types.${row.type}`)}</td>
                  <td style={{ padding: '5px 8px', color: textColor }}>{(row.debitCents / 100).toFixed(2)}</td>
                  <td style={{ padding: '5px 8px', color: textColor }}>{(row.creditCents / 100).toFixed(2)}</td>
                  <td style={{ padding: '5px 8px', fontWeight: 600, color: row.balanceCents >= 0 ? '#10b981' : '#ef4444' }}>{(row.balanceCents / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Monthly chart */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 16 }}>{t('reports.monthly_chart')}</div>
        {chartData.length === 0 ? (
          <div style={{ color: mutedColor, fontSize: 13, textAlign: 'center', padding: 40 }}>{t('reports.no_data')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: mutedColor }} />
              <YAxis tick={{ fontSize: 11, fill: mutedColor }} />
              <Tooltip
                contentStyle={{ background: dark ? '#1f2937' : '#fff', border: `1px solid ${cardBorder}`, borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v).toFixed(2)} €`]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="revenuesEur" name={t('reports.revenue')} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expensesEur" name={t('reports.expense')} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
