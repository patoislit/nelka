import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useDark } from '../../store/themeStore';
import type { SimpleTransaction } from '../../store/transactionStore';
import { centsToEur } from '../../store/transactionStore';

interface Props {
  transactions: SimpleTransaction[];
}

const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#eab308', '#06b6d4', '#ec4899', '#84cc16'];

export function SimpleReport({ transactions }: Props) {
  const { t, i18n } = useTranslation();
  const dark = useDark();
  const sk = i18n.language === 'sk';

  // Monthly data
  const monthlyMap: Record<string, { month: string; income: number; expense: number }> = {};
  for (const tx of transactions) {
    const key = tx.date.slice(0, 7);
    if (!monthlyMap[key]) {
      monthlyMap[key] = { month: key, income: 0, expense: 0 };
    }
    if (tx.type === 'income') monthlyMap[key].income += tx.amountCents;
    else monthlyMap[key].expense += tx.amountCents;
  }
  const monthlyData = Object.values(monthlyMap)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => ({
      ...m,
      incomeEur: m.income / 100,
      expenseEur: m.expense / 100,
    }));

  // Category breakdown
  const catMap: Record<string, number> = {};
  for (const tx of transactions) {
    catMap[tx.category] = (catMap[tx.category] || 0) + tx.amountCents;
  }
  const pieData = Object.entries(catMap).map(([name, value]) => ({
    name: t(`transactions.categories.${name}`),
    value: value / 100,
  }));

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amountCents, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amountCents, 0);
  const net = totalIncome - totalExpense;

  const textColor = dark ? 'rgba(255,255,255,0.85)' : '#111827';
  const mutedColor = dark ? 'rgba(255,255,255,0.5)' : '#6b7280';
  const cardBg = dark ? 'rgba(255,255,255,0.04)' : '#fff';
  const cardBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      transactions.map((tx) => ({
        [t('transactions.date')]: tx.date,
        [t('transactions.description')]: tx.description,
        [t('transactions.type')]: t(`transactions.${tx.type}`),
        [t('transactions.category')]: t(`transactions.categories.${tx.category}`),
        [t('transactions.amount')]: (tx.amountCents / 100).toFixed(2),
        [t('transactions.note')]: tx.note,
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transakcie');
    XLSX.writeFile(wb, 'nelka-transakcie.xlsx');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(sk ? 'Prehľad transakcií – Nelka' : 'Transaction Report – Nelka', 14, 18);
    doc.setFontSize(10);
    doc.text(`${sk ? 'Príjmy' : 'Income'}: ${centsToEur(totalIncome)} €  |  ${sk ? 'Výdavky' : 'Expenses'}: ${centsToEur(totalExpense)} €  |  ${sk ? 'Zostatok' : 'Net'}: ${centsToEur(net)} €`, 14, 26);
    autoTable(doc, {
      startY: 32,
      head: [[
        t('transactions.date'),
        t('transactions.description'),
        t('transactions.type'),
        t('transactions.category'),
        `${t('transactions.amount')} (€)`,
      ]],
      body: transactions.map((tx) => [
        tx.date,
        tx.description,
        t(`transactions.${tx.type}`),
        t(`transactions.categories.${tx.category}`),
        (tx.amountCents / 100).toFixed(2),
      ]),
      styles: { fontSize: 8 },
    });
    doc.save('nelka-transakcie.pdf');
  };

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: t('dashboard.stat_income'), value: centsToEur(totalIncome), color: '#10b981' },
          { label: t('dashboard.stat_expense'), value: centsToEur(totalExpense), color: '#ef4444' },
          { label: net >= 0 ? t('reports.profit') : t('reports.loss'), value: centsToEur(Math.abs(net)), color: net >= 0 ? '#3b82f6' : '#f97316' },
        ].map((card) => (
          <div key={card.label} style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: mutedColor, marginBottom: 4 }}>{card.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: card.color }}>{card.value} €</div>
          </div>
        ))}
      </div>

      {/* Monthly bar chart */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 16 }}>{t('reports.monthly_chart')}</div>
        {monthlyData.length === 0 ? (
          <div style={{ color: mutedColor, fontSize: 13, textAlign: 'center', padding: 40 }}>{t('reports.no_data')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: mutedColor }} />
              <YAxis tick={{ fontSize: 11, fill: mutedColor }} />
              <Tooltip
                contentStyle={{ background: dark ? '#1f2937' : '#fff', border: `1px solid ${cardBorder}`, borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v).toFixed(2)} €`]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="incomeEur" name={t('dashboard.stat_income')} fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenseEur" name={t('dashboard.stat_expense')} fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Pie chart */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 16 }}>{t('reports.category_breakdown')}</div>
        {pieData.length === 0 ? (
          <div style={{ color: mutedColor, fontSize: 13, textAlign: 'center', padding: 40 }}>{t('reports.no_data')}</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} €`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Monthly summary table */}
      <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: textColor, marginBottom: 12 }}>{t('reports.monthly_summary')}</div>
        <div className="table-scroll"><table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {[t('reports.month'), t('reports.income_eur'), t('reports.expense_eur'), t('reports.net_eur')].map((h) => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: mutedColor, borderBottom: `1px solid ${cardBorder}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((row) => (
              <tr key={row.month}>
                <td style={{ padding: '6px 8px', color: textColor }}>{row.month}</td>
                <td style={{ padding: '6px 8px', color: '#10b981' }}>{(row.income / 100).toFixed(2)}</td>
                <td style={{ padding: '6px 8px', color: '#ef4444' }}>{(row.expense / 100).toFixed(2)}</td>
                <td style={{ padding: '6px 8px', color: row.income >= row.expense ? '#10b981' : '#ef4444' }}>
                  {((row.income - row.expense) / 100).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </div>

      {/* Export buttons */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={handleExportExcel}
          style={{
            padding: '8px 16px', borderRadius: 8, border: `1px solid ${cardBorder}`, background: cardBg,
            color: textColor, cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >
          {t('reports.export_excel')}
        </button>
        <button
          onClick={handleExportPDF}
          style={{
            padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f97316',
            color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500,
          }}
        >
          {t('reports.export_pdf')}
        </button>
      </div>
    </div>
  );
}
