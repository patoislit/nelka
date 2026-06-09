import { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Calculator, FileText, ChevronDown, ChevronUp,
  Info, Calendar, CheckCircle2, AlertCircle, Download,
} from 'lucide-react';
import { useDark } from '../../store/themeStore';
import { useTransactionStore, centsToEur } from '../../store/transactionStore';
import { useCompanyStore } from '../../store/companyStore';
import { HelpBubble } from '../../components/common/HelpBubble';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pd } from '../../utils/pdfHelpers';

const TAX_RATES = [
  { value: 15, label: '15 % — príjem do 60 000 €/rok' },
  { value: 21, label: '21 % — príjem nad 60 000 € alebo s.r.o.' },
];

function isRevenue(code: string) { return code.startsWith('6'); }
function isCost(code: string)    { return code.startsWith('5'); }

function StatCard({ label, value, color, bg, icon, help }: {
  label: string; value: string; color: string; bg: string; icon: React.ReactNode; help?: string;
}) {
  return (
    <div style={{ padding: '22px 24px', borderRadius: 20, background: bg, flex: 1, minWidth: 140 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 10, background: `${color}22` }}>
          {icon}
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color, letterSpacing: '0.02em' }}>{label}</span>
        {help && <HelpBubble position="top" text={help} />}
      </div>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
    </div>
  );
}

export function TaxPage() {
  const dark = useDark();
  const { getSimple, getJournalEntries } = useTransactionStore();
  const { getActiveCompany } = useCompanyStore();
  const company = getActiveCompany();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [taxRate, setTaxRate] = useState(21);
  const [rawNczd, setRawNczd] = useState('');
  const [nczd, setNczd] = useState(0);
  const [rawPrepaid, setRawPrepaid] = useState('');
  const [prepaid, setPrepaid] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  // ── Farby ──────────────────────────────────────────────────────────────────
  const pageBg  = dark ? '#0c0c0e' : '#f0f2f5';
  const card    = dark ? '#111113' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const text    = dark ? '#f1f5f9' : '#111827';
  const muted   = dark ? 'rgba(255,255,255,0.38)' : '#6b7280';
  const inputBg = dark ? '#1c1c1f' : '#f9fafb';

  const inp: React.CSSProperties = {
    padding: '10px 14px', borderRadius: 10,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
    background: inputBg, color: text,
    fontSize: 14, fontFamily: "'Inter', sans-serif",
    outline: 'none', width: '100%', boxSizing: 'border-box',
  };

  // ── Výpočty ────────────────────────────────────────────────────────────────
  const mode = company?.type === 'double' ? 'double' : 'simple';

  const { totalIncome, totalExpense, revenueItems, costItems } = useMemo(() => {
    if (!company) return { totalIncome: 0, totalExpense: 0, revenueItems: [], costItems: [] };

    if (mode === 'simple') {
      const txs = getSimple(company.id).filter(tx => tx.date.startsWith(String(year)));
      const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amountCents, 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountCents, 0);
      const revMap: Record<string, number> = {};
      const costMap: Record<string, number> = {};
      txs.filter(t => t.type === 'income').forEach(t => { revMap[t.category] = (revMap[t.category] ?? 0) + t.amountCents; });
      txs.filter(t => t.type === 'expense').forEach(t => { costMap[t.category] = (costMap[t.category] ?? 0) + t.amountCents; });
      return {
        totalIncome: income, totalExpense: expense,
        revenueItems: Object.entries(revMap).map(([k, v]) => ({ label: k, value: v })),
        costItems: Object.entries(costMap).map(([k, v]) => ({ label: k, value: v })),
      };
    } else {
      const entries = getJournalEntries(company.id).filter(e => e.date.startsWith(String(year)));
      const revMap: Record<string, { name: string; value: number }> = {};
      const costMap: Record<string, { name: string; value: number }> = {};
      let income = 0; let expense = 0;
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (isRevenue(line.accountCode) && line.creditCents > 0) {
            if (!revMap[line.accountCode]) revMap[line.accountCode] = { name: line.accountName, value: 0 };
            revMap[line.accountCode].value += line.creditCents;
            income += line.creditCents;
          }
          if (isCost(line.accountCode) && line.debitCents > 0) {
            if (!costMap[line.accountCode]) costMap[line.accountCode] = { name: line.accountName, value: 0 };
            costMap[line.accountCode].value += line.debitCents;
            expense += line.debitCents;
          }
        }
      }
      return {
        totalIncome: income, totalExpense: expense,
        revenueItems: Object.entries(revMap).map(([k, v]) => ({ label: `${k} ${v.name}`, value: v.value })),
        costItems: Object.entries(costMap).map(([k, v]) => ({ label: `${k} ${v.name}`, value: v.value })),
      };
    }
  }, [company, mode, year]);

  const rozdiel      = totalIncome - totalExpense;
  const zakladDane   = Math.max(0, rozdiel - nczd);
  const dan          = Math.round(zakladDane * taxRate / 100);
  const doplatok     = dan - prepaid;

  function handleNczd(val: string) {
    setRawNczd(val);
    setNczd(Math.round((parseFloat(val.replace(',', '.')) || 0) * 100));
  }
  function handlePrepaid(val: string) {
    setRawPrepaid(val);
    setPrepaid(Math.round((parseFloat(val.replace(',', '.')) || 0) * 100));
  }

  // ── PDF ────────────────────────────────────────────────────────────────────
  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(pd('Danove priznanie - prehlad'), 14, 20);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    doc.text(pd(`${company?.name ?? ''} | ${year} | ${mode === 'simple' ? 'Jednoduche uctovnictvo' : 'Podvojne uctovnictvo'}`), 14, 28);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 36,
      head: [[pd('Polozka'), pd('Suma (EUR)')]],
      body: [
        [pd(mode === 'simple' ? 'Celkove prijmy' : 'Celkove vynosy (6xx)'), centsToEur(totalIncome) + ' EUR'],
        [pd(mode === 'simple' ? 'Celkove vydavky' : 'Celkove naklady (5xx)'), centsToEur(totalExpense) + ' EUR'],
        [pd('Rozdiel prijmy - vydavky'), centsToEur(rozdiel) + ' EUR'],
        ...(nczd > 0 ? [[pd('Odcitatelne polozky / NCZD'), '- ' + centsToEur(nczd) + ' EUR']] : []),
        [pd('Zaklad dane'), centsToEur(zakladDane) + ' EUR'],
        [pd(`Dan z prijmov (${taxRate} %)`), centsToEur(dan) + ' EUR'],
        ...(prepaid > 0 ? [[pd('Zaplatene preddavky na dan'), '- ' + centsToEur(prepaid) + ' EUR']] : []),
        [pd(doplatok >= 0 ? 'Dan na uhradu (doplatok)' : 'Preplatok na vratenie'), centsToEur(Math.abs(doplatok)) + ' EUR'],
      ],
      styles: { fontSize: 11 },
      headStyles: { fillColor: [249, 115, 22] },
      columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 14;

    // Detail
    if (showDetail && (revenueItems.length > 0 || costItems.length > 0)) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(pd('Detailny rozpis'), 14, finalY);
      autoTable(doc, {
        startY: finalY + 6,
        head: [[pd('Kategoria / Ucet'), pd('Typ'), pd('Suma (EUR)')]],
        body: [
          ...revenueItems.map(i => [pd(i.label), pd(mode === 'simple' ? 'Prijem' : 'Vynos'), centsToEur(i.value) + ' EUR']),
          ...costItems.map(i => [pd(i.label), pd(mode === 'simple' ? 'Vydavok' : 'Naklad'), centsToEur(i.value) + ' EUR']),
        ],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [100, 100, 100] },
        columnStyles: { 2: { halign: 'right' } },
      });
    }

    const noteY = ((doc as any).lastAutoTable?.finalY ?? finalY) + 12;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      pd('* Informativny prehlad. Skutocne danove priznanie podavaj cez financnasprava.sk (portal eDane).'),
      14, noteY, { maxWidth: 180 }
    );

    doc.save(`danove-priznanie-${year}.pdf`);
  }

  // ── Termíny ────────────────────────────────────────────────────────────────
  const deadlines = [
    { date: `31. 3. ${year + 1}`, label: 'Základný termín podania DP', done: false },
    { date: `30. 6. ${year + 1}`, label: 'Predĺžený termín (oznámenie do 31.3.)', done: false },
    { date: `31. 3. ${year + 1}`, label: 'Úhrada dane (bez odkladu)', done: false },
  ];

  if (!company) {
    return (
      <div style={{ minHeight: '100%', background: pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: muted, fontSize: 15, fontFamily: "'Inter', sans-serif" }}>
        Vyberte firmu
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100%', background: pageBg, fontFamily: "'Inter', system-ui, sans-serif", padding: '28px 24px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Hlavička ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: text, margin: 0, letterSpacing: '-0.03em' }}>
              Daňové priznanie
            </h1>
            <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>
              {company.name} · {mode === 'simple' ? 'Jednoduché' : 'Podvojné'} účtovníctvo · Rok{' '}
              <select
                value={year}
                onChange={e => setYear(Number(e.target.value))}
                style={{ background: 'transparent', border: 'none', color: '#f97316', fontWeight: 700, fontSize: 13, cursor: 'pointer', outline: 'none', fontFamily: 'inherit' }}
              >
                {[year - 2, year - 1, year, year + 1].map(y => <option key={y} value={y} style={{ background: dark ? '#1c1c1f' : '#fff', color: text }}>{y}</option>)}
              </select>
            </p>
          </div>
          <button
            onClick={exportPdf}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: '#f97316', color: '#fff', fontSize: 13, fontWeight: 700,
              fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(249,115,22,0.35)',
              letterSpacing: '-0.01em',
            }}
          >
            <Download size={15} /> Exportovať PDF
          </button>
        </div>

        {/* ── Info banner ── */}
        <div style={{
          display: 'flex', gap: 12, padding: '14px 18px', borderRadius: 14,
          background: dark ? 'rgba(59,130,246,0.07)' : '#eff6ff',
          border: `1px solid ${dark ? 'rgba(59,130,246,0.18)' : '#bfdbfe'}`,
        }}>
          <Info size={16} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: dark ? 'rgba(147,197,253,0.9)' : '#1d4ed8', margin: 0, lineHeight: 1.6 }}>
            Toto je <strong>informatívny prehľad</strong> automaticky vypočítaný z tvojich záznamov.
            Skutočné daňové priznanie podaj cez <strong>financnasprava.sk</strong> (portál eDane).
            Odporúčame si výsledky overiť s daňovým poradcom.
          </p>
        </div>

        {/* ── Súhrnné karty ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard
            label={mode === 'simple' ? 'Príjmy' : 'Výnosy'}
            value={`${centsToEur(totalIncome)} €`}
            color="#10b981"
            bg={dark ? 'rgba(16,185,129,0.08)' : '#ecfdf5'}
            icon={<TrendingUp size={18} color="#10b981" />}
            help={mode === 'simple' ? 'Všetky príjmy zadané v účtovnom denníku za zvolený rok.' : 'Kreditné obraty na výnosových účtoch (6xx) za zvolený rok.'}
          />
          <StatCard
            label={mode === 'simple' ? 'Výdavky' : 'Náklady'}
            value={`${centsToEur(totalExpense)} €`}
            color="#ef4444"
            bg={dark ? 'rgba(239,68,68,0.08)' : '#fef2f2'}
            icon={<TrendingDown size={18} color="#ef4444" />}
            help={mode === 'simple' ? 'Všetky výdavky zadané v účtovnom denníku za zvolený rok.' : 'Debetné obraty na nákladových účtoch (5xx) za zvolený rok.'}
          />
          <StatCard
            label="Daň na úhradu"
            value={`${centsToEur(Math.abs(doplatok))} €`}
            color={doplatok >= 0 ? '#f97316' : '#10b981'}
            bg={dark ? 'rgba(249,115,22,0.08)' : '#fff7ed'}
            icon={<Calculator size={18} color={doplatok >= 0 ? '#f97316' : '#10b981'} />}
            help="Výsledná daň po odpočítaní preddavkov. Ak je záporná — máš preplatok."
          />
        </div>

        {/* ── Výpočet dane ── */}
        <div style={{ background: card, borderRadius: 20, border: `1px solid ${border}`, overflow: 'hidden' }}>
          {/* Hlavička sekcie */}
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calculator size={16} color="#f97316" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: text }}>Výpočet dane z príjmov</span>
          </div>

          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* Nastavenia */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
                  Sadzba dane <HelpBubble position="right" text="15 % ak obrat za rok nepresahuje 60 000 €. 21 % ak obrat presiahol 60 000 € alebo si právnická osoba (s.r.o.)." />
                </label>
                <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={{ ...inp, cursor: 'pointer' }}>
                  {TAX_RATES.map(r => <option key={r.value} value={r.value} style={{ background: dark ? '#1c1c1f' : '#fff' }}>{r.label}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
                  Odpočty / NČZD (€) <HelpBubble position="right" text="Nezdaniteľná časť základu dane. Fyzická osoba (živnostník) si môže odpočítať paušálnu čiastku — aktuálne ~5 646 €/rok. Skontroluj na financnasprava.sk." />
                </label>
                <input type="text" inputMode="decimal" placeholder="napr. 5646,00" value={rawNczd} onChange={e => handleNczd(e.target.value)} style={inp} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 7 }}>
                  Preddavky zaplatené (€) <HelpBubble position="right" text="Preddavky na daň z príjmov zaplatené počas roka. Odrátajú sa od výslednej dane. Pozri ich vo svojom daňovom priznaní z minulého roka." />
                </label>
                <input type="text" inputMode="decimal" placeholder="0,00" value={rawPrepaid} onChange={e => handlePrepaid(e.target.value)} style={inp} />
              </div>
            </div>

            {/* Výpočtová tabuľka */}
            <div style={{ borderRadius: 14, border: `1px solid ${border}`, overflow: 'hidden' }}>
              {[
                { label: mode === 'simple' ? 'Celkové príjmy' : 'Celkové výnosy (6xx)', value: centsToEur(totalIncome) + ' €', color: '#10b981', indent: false },
                { label: mode === 'simple' ? '− Celkové výdavky' : '− Celkové náklady (5xx)', value: '− ' + centsToEur(totalExpense) + ' €', color: '#ef4444', indent: false },
                { label: 'Rozdiel príjmy − výdavky', value: centsToEur(rozdiel) + ' €', color: rozdiel >= 0 ? text : '#ef4444', indent: false, separator: true },
                ...(nczd > 0 ? [{ label: '− Odpočty / NČZD', value: '− ' + centsToEur(nczd) + ' €', color: muted, indent: true }] : []),
                { label: 'Základ dane', value: centsToEur(zakladDane) + ' €', bold: true, color: text, indent: false, separator: true },
                { label: `× Sadzba dane (${taxRate} %)`, value: centsToEur(dan) + ' €', bold: true, color: '#f97316', indent: false },
                ...(prepaid > 0 ? [{ label: '− Zaplatené preddavky', value: '− ' + centsToEur(prepaid) + ' €', color: muted, indent: true }] : []),
                {
                  label: doplatok >= 0 ? '✓ Daň na úhradu' : '✓ Preplatok na vrátenie',
                  value: centsToEur(Math.abs(doplatok)) + ' €',
                  bold: true, highlight: true,
                  color: doplatok >= 0 ? '#f97316' : '#10b981',
                  indent: false, separator: true,
                },
              ].map((row: any, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: row.highlight ? '16px 20px' : (row.bold ? '13px 20px' : '10px 20px'),
                  paddingLeft: row.indent ? 36 : 20,
                  background: row.highlight
                    ? (dark ? 'rgba(249,115,22,0.1)' : '#fff7ed')
                    : (row.bold ? (dark ? 'rgba(255,255,255,0.02)' : '#fafafa') : 'transparent'),
                  borderTop: row.separator ? `1px solid ${border}` : 'none',
                  borderBottom: i < 10 ? `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f5f5f5'}` : 'none',
                }}>
                  <span style={{ fontSize: row.bold ? 14 : 13, fontWeight: row.bold ? 700 : 400, color: row.bold ? text : muted }}>
                    {row.label}
                  </span>
                  <span style={{
                    fontSize: row.highlight ? 20 : (row.bold ? 16 : 13),
                    fontWeight: row.highlight ? 800 : (row.bold ? 700 : 600),
                    color: row.color,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: row.highlight ? '-0.03em' : '0',
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* ── Detailný rozpis ── */}
        {(revenueItems.length > 0 || costItems.length > 0) && (
          <div style={{ background: card, borderRadius: 20, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <button
              onClick={() => setShowDetail(d => !d)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 24px', background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: dark ? 'rgba(59,130,246,0.12)' : '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FileText size={16} color="#3b82f6" />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: text }}>Detailný rozpis</span>
              </div>
              {showDetail ? <ChevronUp size={16} color={muted} /> : <ChevronDown size={16} color={muted} />}
            </button>

            {showDetail && (
              <div style={{ borderTop: `1px solid ${border}`, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {/* Príjmy/Výnosy */}
                <div style={{ borderRight: `1px solid ${border}` }}>
                  <div style={{ padding: '12px 20px', background: dark ? 'rgba(16,185,129,0.06)' : '#f0fdf4', fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {mode === 'simple' ? 'Príjmy' : 'Výnosy'} podľa {mode === 'simple' ? 'kategórie' : 'účtu'}
                  </div>
                  {revenueItems.length === 0
                    ? <p style={{ padding: '16px 20px', fontSize: 12, color: muted }}>Žiadne záznamy</p>
                    : revenueItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 20px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.03)' : '#f5f5f5'}` }}>
                        <span style={{ fontSize: 12, color: muted, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{centsToEur(item.value)} €</span>
                      </div>
                    ))
                  }
                </div>
                {/* Výdavky/Náklady */}
                <div>
                  <div style={{ padding: '12px 20px', background: dark ? 'rgba(239,68,68,0.06)' : '#fef2f2', fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {mode === 'simple' ? 'Výdavky' : 'Náklady'} podľa {mode === 'simple' ? 'kategórie' : 'účtu'}
                  </div>
                  {costItems.length === 0
                    ? <p style={{ padding: '16px 20px', fontSize: 12, color: muted }}>Žiadne záznamy</p>
                    : costItems.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 20px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.03)' : '#f5f5f5'}` }}>
                        <span style={{ fontSize: 12, color: muted, maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{centsToEur(item.value)} €</span>
                      </div>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Termíny ── */}
        <div style={{ background: card, borderRadius: 20, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '18px 24px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} color="#f97316" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: text }}>Dôležité termíny ({year + 1})</span>
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {deadlines.map((d, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: d.done ? '#10b981' : '#f97316',
                }} />
                <span style={{
                  padding: '4px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: dark ? 'rgba(249,115,22,0.1)' : '#fff7ed',
                  color: '#f97316', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
                }}>
                  {d.date}
                </span>
                <span style={{ fontSize: 13, color: text }}>{d.label}</span>
                {d.done
                  ? <CheckCircle2 size={15} color="#10b981" style={{ marginLeft: 'auto' }} />
                  : <AlertCircle size={15} color={dark ? 'rgba(255,255,255,0.15)' : '#d1d5db'} style={{ marginLeft: 'auto' }} />
                }
              </div>
            ))}
          </div>
        </div>

        {/* ── Tip: eDane ── */}
        <div style={{
          display: 'flex', gap: 14, padding: '18px 20px', borderRadius: 16,
          background: dark ? 'rgba(249,115,22,0.06)' : '#fff7ed',
          border: `1px solid ${dark ? 'rgba(249,115,22,0.15)' : '#fed7aa'}`,
        }}>
          <Info size={18} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#f97316', margin: '0 0 4px' }}>Ako podať daňové priznanie?</p>
            <p style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.6)' : '#92400e', margin: 0, lineHeight: 1.6 }}>
              1. Prihlás sa na <strong>financnasprava.sk</strong> → portál eDane<br />
              2. Vyber formulár: <strong>DPFO typ B</strong> (živnostník) alebo <strong>DPPO</strong> (s.r.o.)<br />
              3. Prepi hodnoty z tohto prehľadu do formulára<br />
              4. Skontroluj a podaj elektronicky — termín je <strong>31. 3. {year + 1}</strong>
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
