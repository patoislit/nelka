import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCompanyStore } from '../../store/companyStore';
import { useTransactionStore, centsToEur } from '../../store/transactionStore';
import { useInvoiceStore, calcInvoiceTotalCents } from '../../store/invoiceStore';
import { useDark } from '../../store/themeStore';
import { GuideBar } from '../../components/common/GuideBar';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const SK_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Máj', 'Jún', 'Júl', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
const PIE_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#06b6d4'];

function getLast6Months(): { year: number; month: number; label: string }[] {
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ year: d.getFullYear(), month: d.getMonth(), label: SK_MONTHS[d.getMonth()] });
  }
  return result;
}

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { getActiveCompany } = useCompanyStore();
  const { getSimple, getJournalEntries } = useTransactionStore();
  const { getInvoicesForCompany } = useInvoiceStore();
  const dark = useDark();
  const company = getActiveCompany();

  const hour = new Date().getHours();
  const greeting = hour < 5 ? t('dashboard.greeting_night') : hour < 12 ? t('dashboard.greeting_morning') : hour < 18 ? t('dashboard.greeting_day') : t('dashboard.greeting_evening');

  // Live stats
  let income = 0, expense = 0, txCount = 0;
  if (company?.type === 'simple') {
    const txs = getSimple(company.id);
    txCount = txs.length;
    income  = txs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amountCents, 0);
    expense = txs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amountCents, 0);
  } else if (company?.type === 'double') {
    const entries = getJournalEntries(company.id);
    txCount = entries.length;
    for (const e of entries) {
      for (const l of e.lines) {
        if (l.accountCode.startsWith('6')) income  += l.creditCents;
        if (l.accountCode.startsWith('5')) expense += l.debitCents;
      }
    }
  }
  const balance = income - expense;

  // Colors
  const bg      = dark ? '#0c0c0e' : '#f8f8f8';
  const surface = dark ? '#111113' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.07)' : '#ebebeb';
  const text     = dark ? '#ffffff' : '#0c0c0e';
  const muted    = dark ? 'rgba(255,255,255,0.38)' : '#6b7280';
  const subtle   = dark ? 'rgba(255,255,255,0.06)' : '#f4f4f5';

  const stats = [
    {
      label: t('dashboard.stat_income'),
      value: centsToEur(income) + ' €',
      accent: '#10b981',
      accentBg: dark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l9.2-9.2M17 17V7H7" />
        </svg>
      ),
    },
    {
      label: t('dashboard.stat_expense'),
      value: centsToEur(expense) + ' €',
      accent: '#ef4444',
      accentBg: dark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.08)',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-9.2 9.2M7 7v10h10" />
        </svg>
      ),
    },
    {
      label: t('dashboard.stat_balance'),
      value: centsToEur(balance) + ' €',
      accent: '#f97316',
      accentBg: dark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.08)',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
      ),
    },
    {
      label: company?.type === 'double' ? t('dashboard.stat_entries') : t('dashboard.stat_transactions'),
      value: String(txCount),
      accent: '#8b5cf6',
      accentBg: dark ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.08)',
      icon: (
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8b5cf6" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  const actions = [
    {
      title: company?.type === 'double' ? t('dashboard.action_journal') : t('dashboard.action_transactions'),
      desc: company?.type === 'double' ? t('dashboard.action_journal_desc') : t('dashboard.action_transactions_desc'),
      accent: '#f97316',
      onClick: () => navigate('/transactions'),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      title: t('dashboard.action_companies'),
      desc: t('dashboard.action_companies_desc'),
      accent: '#6b7280',
      onClick: () => navigate('/companies'),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      title: t('dashboard.action_settings'),
      desc: t('dashboard.action_settings_desc'),
      accent: '#6b7280',
      onClick: () => navigate('/settings'),
      icon: (
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><circle cx="12" cy="12" r="3" />
        </svg>
      ),
    },
  ];

  // ── Chart data: last 6 months ──
  const months6 = getLast6Months();
  const barData = months6.map(({ year, month, label }) => {
    let inc = 0, exp = 0;
    if (company?.type === 'simple') {
      const txs = getSimple(company.id);
      for (const tx of txs) {
        const d = new Date(tx.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          if (tx.type === 'income') inc += tx.amountCents;
          else exp += tx.amountCents;
        }
      }
    } else if (company?.type === 'double') {
      const entries = getJournalEntries(company.id);
      for (const e of entries) {
        const d = new Date(e.date);
        if (d.getFullYear() === year && d.getMonth() === month) {
          for (const l of e.lines) {
            if (l.accountCode.startsWith('6')) inc += l.creditCents;
            if (l.accountCode.startsWith('5')) exp += l.debitCents;
          }
        }
      }
    }
    return { label, income: inc, expense: exp };
  });

  // ── Pie data: expenses by category / account group ──
  const pieDataMap: Record<string, number> = {};
  if (company?.type === 'simple') {
    const txs = getSimple(company.id);
    for (const tx of txs) {
      if (tx.type === 'expense') {
        pieDataMap[tx.category] = (pieDataMap[tx.category] ?? 0) + tx.amountCents;
      }
    }
  } else if (company?.type === 'double') {
    const entries = getJournalEntries(company.id);
    for (const e of entries) {
      for (const l of e.lines) {
        if (l.accountCode.startsWith('5')) {
          const grp = l.accountCode.slice(0, 2) + 'x';
          pieDataMap[grp] = (pieDataMap[grp] ?? 0) + l.debitCents;
        }
      }
    }
  }
  const pieData = Object.entries(pieDataMap)
    .map(([name, value]) => ({
      // jednoduché účtovníctvo: prelož kategóriu (rent → Nájom); podvojné: nechaj kód skupiny (50x)
      name: company?.type === 'simple' ? t(`transactions.categories.${name}`) : name,
      value,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0);

  // ── Recent activity ──
  const recentActivity: { id: string; desc: string; date: string; amountCents: number; isIncome: boolean }[] = [];
  if (company?.type === 'simple') {
    const txs = getSimple(company.id).slice(0, 5);
    for (const tx of txs) {
      recentActivity.push({ id: tx.id, desc: tx.description, date: tx.date, amountCents: tx.amountCents, isIncome: tx.type === 'income' });
    }
  } else if (company?.type === 'double') {
    const entries = getJournalEntries(company.id).slice(0, 5);
    for (const e of entries) {
      const credits6 = e.lines.filter(l => l.accountCode.startsWith('6')).reduce((s, l) => s + l.creditCents, 0);
      const debits5 = e.lines.filter(l => l.accountCode.startsWith('5')).reduce((s, l) => s + l.debitCents, 0);
      const isIncome = credits6 > 0;
      const amount = isIncome ? credits6 : debits5;
      recentActivity.push({ id: e.id, desc: e.description, date: e.date, amountCents: amount, isIncome });
    }
  }

  // ── Invoice alerts ──
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const alertInvoices = company
    ? getInvoicesForCompany(company.id).filter(
        (inv) =>
          inv.status === 'overdue' ||
          // 'sent' po splatnosti = po splatnosti, aj keď status ešte nikto neprepol
          (inv.status === 'sent' && inv.dueDate <= in7Days)
      )
    : [];

  const chartAxisColor = dark ? 'rgba(255,255,255,0.25)' : '#9ca3af';
  const chartGridColor = dark ? 'rgba(255,255,255,0.05)' : '#f3f4f6';
  const tooltipBg = dark ? '#1a1a1c' : '#ffffff';
  const tooltipBorder = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  const currentMonthLabel = SK_MONTHS[new Date().getMonth()] + ' ' + new Date().getFullYear();

  return (
    <div style={{
      minHeight: '100%',
      background: bg,
      fontFamily: "'Inter', system-ui, sans-serif",
      padding: '40px 24px 60px',
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <GuideBar
          id="dashboard-guide"
          title={t('guide.dashboard_title')}
          body={t('guide.dashboard_body')}
          type="tip"
        />

        {/* ── HEADER ── */}
        <div style={{ marginBottom: 48 }}>
          <p style={{ fontSize: 13, color: muted, marginBottom: 6, fontWeight: 500 }}>{greeting},</p>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: text, lineHeight: 1.1, marginBottom: 12 }}>
            {user?.name || 'Používateľ'}
          </h1>

          {company ? (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 12px', borderRadius: 999,
                background: subtle, border: `1px solid ${border}`,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f97316' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: muted }}>{company.name}</span>
                <span style={{ fontSize: 11, color: dark ? 'rgba(255,255,255,0.2)' : '#d1d5db' }}>·</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#f97316' }}>
                  {company.type === 'simple' ? t('dashboard.type_simple') : t('dashboard.type_double')}
                </span>
              </div>
            </div>
          ) : (
            <span style={{ fontSize: 13, color: '#f97316' }}>{t('dashboard.no_company')}</span>
          )}
        </div>

        {/* ── STATS ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 32,
        }}>
          {stats.map((s) => (
            <div key={s.label} style={{
              background: surface,
              border: `1px solid ${border}`,
              borderRadius: 16,
              padding: '20px 20px 18px',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 7,
                padding: '5px 10px', borderRadius: 8,
                background: s.accentBg,
                marginBottom: 16,
              }}>
                {s.icon}
                <span style={{ fontSize: 11, fontWeight: 700, color: s.accent, letterSpacing: '0.02em' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', color: text, lineHeight: 1 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* ── MONTHLY BAR CHART ── */}
        {company && (
          <div style={{
            background: surface, border: `1px solid ${border}`,
            borderRadius: 20, padding: '24px 24px 16px',
            marginBottom: 20,
          }}>
            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: text, margin: 0, letterSpacing: '-0.02em' }}>
                Prehľad za posledných 6 mesiacov
              </p>
              <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>{currentMonthLabel}</p>
            </div>
            {txCount === 0 ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: muted, fontSize: 13 }}>Žiadne transakcie</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: chartAxisColor }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={(v: number) => v > 0 ? `${centsToEur(v)} €` : ''}
                    tick={{ fontSize: 10, fill: chartAxisColor }}
                    axisLine={false}
                    tickLine={false}
                    width={72}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      return (
                        <div style={{
                          background: tooltipBg, border: `1px solid ${tooltipBorder}`,
                          borderRadius: 10, padding: '10px 14px', fontSize: 12,
                          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                        }}>
                          <p style={{ fontWeight: 700, color: text, marginBottom: 6 }}>{label}</p>
                          {payload.map((p) => (
                            <p key={p.name} style={{ color: p.color as string, margin: '2px 0' }}>
                              {p.name === 'income' ? 'Príjmy' : 'Výdavky'}: {centsToEur(p.value as number)} €
                            </p>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: 11, color: muted }}>
                        {value === 'income' ? 'Príjmy' : 'Výdavky'}
                      </span>
                    )}
                  />
                  <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="expense" name="expense" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        )}

        {/* ── PIE + RECENT ACTIVITY ── */}
        {company && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            marginBottom: 20,
          }}>
            {/* Category pie */}
            <div style={{
              background: surface, border: `1px solid ${border}`,
              borderRadius: 20, padding: '24px',
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: text, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                Výdavky podľa kategórie
              </p>
              {pieData.length === 0 ? (
                <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: muted, fontSize: 13 }}>Žiadne dáta</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={170}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        dataKey="value"
                        paddingAngle={2}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pieData.map((d, i) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: muted }}>{d.name}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: text }}>
                          {pieTotal > 0 ? Math.round((d.value / pieTotal) * 100) : 0}%
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Recent activity */}
            <div style={{
              background: surface, border: `1px solid ${border}`,
              borderRadius: 20, padding: '24px',
            }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: text, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
                Posledná aktivita
              </p>
              {recentActivity.length === 0 ? (
                <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p style={{ color: muted, fontSize: 13 }}>Žiadne transakcie</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {recentActivity.map((item) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                        background: item.isIncome ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24"
                          stroke={item.isIncome ? '#10b981' : '#ef4444'} strokeWidth="2.5">
                          {item.isIncome
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M7 17l9.2-9.2M17 17V7H7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M17 7l-9.2 9.2M7 7v10h10" />}
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: text, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.desc || '–'}
                        </p>
                        <p style={{ fontSize: 11, color: muted, margin: '1px 0 0' }}>{item.date}</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: item.isIncome ? '#10b981' : '#ef4444', flexShrink: 0 }}>
                        {item.isIncome ? '+' : '-'}{centsToEur(item.amountCents)} €
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate('/transactions')}
                style={{
                  marginTop: 16, width: '100%', padding: '8px',
                  background: 'transparent', border: `1px solid ${border}`,
                  borderRadius: 10, cursor: 'pointer', fontSize: 12,
                  fontWeight: 600, color: muted, fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#f97316'; e.currentTarget.style.color = '#f97316'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted; }}
              >
                Zobraziť všetky →
              </button>
            </div>
          </div>
        )}

        {/* ── INVOICE ALERTS ── */}
        {alertInvoices.length > 0 && (
          <div style={{
            background: surface, border: `1px solid ${border}`,
            borderRadius: 20, padding: '24px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: text, margin: 0, letterSpacing: '-0.02em' }}>
                Upomienky faktúr
              </p>
              <button
                onClick={() => navigate('/invoices')}
                style={{
                  fontSize: 12, fontWeight: 600, color: '#f97316',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Zobraziť faktúry →
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {alertInvoices.map((inv) => {
                const isOverdue = inv.status === 'overdue' || inv.dueDate < today;
                const alertBg = isOverdue
                  ? (dark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)')
                  : (dark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.04)');
                const alertBorder = isOverdue ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)';
                const alertColor = isOverdue ? '#ef4444' : '#f59e0b';
                const total = calcInvoiceTotalCents(inv.items);
                return (
                  <div key={inv.id} style={{
                    background: alertBg,
                    border: `1px solid ${alertBorder}`,
                    borderRadius: 12, padding: '12px 16px',
                    display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: alertColor, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: alertColor }}>{inv.number}</span>
                      <span style={{ fontSize: 12, color: text, marginLeft: 8 }}>{inv.customerName}</span>
                    </div>
                    <span style={{ fontSize: 11, color: muted }}>Splatnosť: {inv.dueDate}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: text }}>{centsToEur(total)} €</span>
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      background: isOverdue ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)',
                      color: alertColor,
                      padding: '3px 8px', borderRadius: 999,
                    }}>
                      {isOverdue ? 'Po splatnosti' : 'Blíži sa'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ACTIONS ── */}
        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: muted, marginBottom: 12 }}>
            {t('dashboard.quick_actions')}
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 8,
          }}>
            {actions.map((a) => (
              <ActionCard key={a.title} {...a} dark={dark} surface={surface} border={border} text={text} muted={muted} />
            ))}
          </div>
        </div>

        {/* ── EMPTY STATE or COMPANY INFO ── */}
        {txCount === 0 && company && (
          <EmptyState dark={dark} surface={surface} border={border} text={text} muted={muted}
            isDouble={company.type === 'double'} onAdd={() => navigate('/transactions')} t={t} />
        )}

        {!company && (
          <NoCompany surface={surface} border={border} text={text} muted={muted}
            onAdd={() => navigate('/companies')} t={t} />
        )}
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────── */

function ActionCard({ title, desc, icon, accent, onClick, dark, surface, border, text, muted }: {
  title: string; desc: string; icon: React.ReactNode; accent: string;
  onClick: () => void; dark: boolean; surface: string; border: string; text: string; muted: string;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px',
        background: hov ? (dark ? 'rgba(255,255,255,0.05)' : '#f9f9f9') : surface,
        border: `1px solid ${hov ? accent : border}`,
        borderRadius: 14, cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.15s ease', fontFamily: 'inherit',
        boxShadow: hov ? `0 4px 20px ${accent}18` : 'none',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: hov ? accent : (dark ? 'rgba(255,255,255,0.06)' : '#f4f4f5'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s ease',
        color: hov ? '#fff' : muted,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: text, letterSpacing: '-0.01em' }}>{title}</div>
        <div style={{ fontSize: 11, color: muted, marginTop: 1 }}>{desc}</div>
      </div>
      <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={hov ? accent : (dark ? 'rgba(255,255,255,0.15)' : '#d1d5db')} strokeWidth="2" style={{ flexShrink: 0, transition: 'all 0.15s', transform: hov ? 'translateX(2px)' : 'none' }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function EmptyState({ dark, surface, border, text, muted, isDouble, onAdd, t }: {
  dark: boolean; surface: string; border: string; text: string; muted: string;
  isDouble: boolean; onAdd: () => void; t: (k: string) => string;
}) {
  return (
    <div style={{
      background: surface, border: `1px solid ${border}`,
      borderRadius: 20, padding: '48px 32px', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 16,
        background: dark ? 'rgba(249,115,22,0.1)' : 'rgba(249,115,22,0.08)',
        border: '1px solid rgba(249,115,22,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#f97316" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <p style={{ fontSize: 16, fontWeight: 700, color: text, letterSpacing: '-0.02em', marginBottom: 6 }}>
        {isDouble ? t('dashboard.empty_journal') : t('dashboard.empty_tx')}
      </p>
      <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, maxWidth: 320, margin: '0 auto 24px' }}>
        {isDouble ? t('dashboard.empty_journal_desc') : t('dashboard.empty_tx_desc')}
      </p>
      <button
        onClick={onAdd}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '10px 20px', borderRadius: 12,
          background: '#f97316', border: 'none', cursor: 'pointer',
          color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          boxShadow: '0 4px 14px rgba(249,115,22,0.3)',
        }}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {isDouble ? t('dashboard.add_entry') : t('dashboard.add_transaction')}
      </button>
    </div>
  );
}

function NoCompany({ surface, border, text, muted, onAdd, t }: {
  surface: string; border: string; text: string; muted: string; onAdd: () => void; t: (k: string) => string;
}) {
  return (
    <div style={{
      background: surface, border: `1px solid ${border}`,
      borderRadius: 20, padding: '48px 32px', textAlign: 'center',
    }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: text, marginBottom: 6 }}>{t('dashboard.no_company_title')}</p>
      <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>{t('dashboard.no_company_desc')}</p>
      <button onClick={onAdd} style={{
        padding: '9px 18px', borderRadius: 12, background: '#f97316', border: 'none', cursor: 'pointer',
        color: '#fff', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
      }}>
        {t('dashboard.select_company_btn')}
      </button>
    </div>
  );
}
