import { useState, useMemo } from 'react';
import { FileText, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useDark } from '../../store/themeStore';
import { useTransactionStore, centsToEur } from '../../store/transactionStore';
import { HelpBubble } from '../../components/common/HelpBubble';
import jsPDF from 'jspdf';

interface Props {
  companyId: string;
  mode: 'simple' | 'double';
}

const TAX_RATES = [15, 21];

// Skupiny nákladových (5xx) a výnosových (6xx) účtov
function isRevenue(code: string) { return code.startsWith('6'); }
function isCost(code: string)    { return code.startsWith('5'); }

export function TaxReport({ companyId, mode }: Props) {
  const dark = useDark();
  const { getSimple, getJournalEntries } = useTransactionStore();

  const [year, setYear] = useState(new Date().getFullYear());
  const [taxRate, setTaxRate] = useState(21);
  const [nczd, setNczd] = useState(0);       // odpočítateľné položky v centoch
  const [rawNczd, setRawNczd] = useState('');
  const [prepaid, setPrepaid] = useState(0); // preddavky zaplatené v centoch
  const [rawPrepaid, setRawPrepaid] = useState('');
  const [showDetail, setShowDetail] = useState(false);

  // ── Farby ──────────────────────────────────────────────────────────────────
  const bg      = dark ? '#0c0c0e' : '#f8f9fb';
  const surface = dark ? '#111113' : '#ffffff';
  const border  = dark ? 'rgba(255,255,255,0.07)' : '#e5e7eb';
  const text    = dark ? '#f1f5f9' : '#111827';
  const muted   = dark ? 'rgba(255,255,255,0.38)' : '#9ca3af';

  const inp = (): React.CSSProperties => ({
    padding: '9px 12px', borderRadius: 10,
    border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'}`,
    background: dark ? '#1c1c1f' : '#f9fafb',
    color: text, fontSize: 13, fontFamily: "'Inter', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  });

  // ── Výpočty ────────────────────────────────────────────────────────────────
  const { totalIncome, totalExpense, revenueByCategory, costByCategory } = useMemo(() => {
    if (mode === 'simple') {
      const txs = getSimple(companyId).filter(tx => tx.date.startsWith(String(year)));
      const income  = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amountCents, 0);
      const expense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amountCents, 0);

      // Skupiny príjmov
      const rev: Record<string, number> = {};
      txs.filter(t => t.type === 'income').forEach(t => {
        rev[t.category] = (rev[t.category] ?? 0) + t.amountCents;
      });
      // Skupiny výdavkov
      const cost: Record<string, number> = {};
      txs.filter(t => t.type === 'expense').forEach(t => {
        cost[t.category] = (cost[t.category] ?? 0) + t.amountCents;
      });
      return { totalIncome: income, totalExpense: expense, revenueByCategory: rev, costByCategory: cost };
    } else {
      // Podvojné — sumarizuj z účtov 6xx (výnosy) a 5xx (náklady)
      const entries = getJournalEntries(companyId).filter(e => e.date.startsWith(String(year)));
      const rev: Record<string, number> = {};
      const cost: Record<string, number> = {};
      let income = 0;
      let expense = 0;
      for (const entry of entries) {
        for (const line of entry.lines) {
          if (isRevenue(line.accountCode)) {
            const amt = line.creditCents;
            if (amt > 0) { rev[line.accountCode] = (rev[line.accountCode] ?? 0) + amt; income += amt; }
          }
          if (isCost(line.accountCode)) {
            const amt = line.debitCents;
            if (amt > 0) { cost[line.accountCode] = (cost[line.accountCode] ?? 0) + amt; expense += amt; }
          }
        }
      }
      return { totalIncome: income, totalExpense: expense, revenueByCategory: rev, costByCategory: cost };
    }
  }, [companyId, mode, year, getSimple, getJournalEntries]);

  const zakladDane   = Math.max(0, totalIncome - totalExpense - nczd);
  const dan          = Math.round(zakladDane * taxRate / 100);
  const danPoPreddav = Math.max(0, dan - prepaid);

  function handleNczd(val: string) {
    setRawNczd(val);
    const num = parseFloat(val.replace(',', '.')) || 0;
    setNczd(Math.round(num * 100));
  }
  function handlePrepaid(val: string) {
    setRawPrepaid(val);
    const num = parseFloat(val.replace(',', '.')) || 0;
    setPrepaid(Math.round(num * 100));
  }

  // ── PDF export ─────────────────────────────────────────────────────────────
  function exportPdf() {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Daňové priznanie – prehľad (${year})`, 14, 18);
    doc.setFontSize(10);
    doc.text(`Typ: ${mode === 'simple' ? 'Jednoduché účtovníctvo' : 'Podvojné účtovníctvo'}`, 14, 28);

    let y = 40;
    const row = (label: string, value: string, bold = false) => {
      if (bold) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      doc.text(label, 14, y);
      doc.text(value, 140, y, { align: 'right' });
      y += 8;
    };
    const line = () => { doc.line(14, y, 196, y); y += 4; };

    row(`Celkové ${mode === 'simple' ? 'príjmy' : 'výnosy'}`, `${centsToEur(totalIncome)} €`);
    row(`Celkové ${mode === 'simple' ? 'výdavky' : 'náklady'}`, `${centsToEur(totalExpense)} €`);
    line();
    row('Rozdiel príjmy – výdavky', `${centsToEur(totalIncome - totalExpense)} €`);
    if (nczd > 0) row('Odpočítateľné položky (NČZD)', `- ${centsToEur(nczd)} €`);
    line();
    row('Základ dane', `${centsToEur(zakladDane)} €`, true);
    row(`Daň (${taxRate} %)`, `${centsToEur(dan)} €`, true);
    if (prepaid > 0) row('Zaplatené preddavky', `- ${centsToEur(prepaid)} €`);
    line();
    row('Daň na úhradu', `${centsToEur(danPoPreddav)} €`, true);

    y += 8;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('* Toto je informatívny prehľad. Skutočné daňové priznanie podávajte cez portál FS SR (financnasprava.sk).', 14, y, { maxWidth: 180 });

    doc.save(`danove-priznanie-${year}.pdf`);
  }

  // ── UI ─────────────────────────────────────────────────────────────────────
  const Row = ({ label, value, help, bold, color, indent }: {
    label: string; value: string; help?: string; bold?: boolean; color?: string; indent?: boolean;
  }) => (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: `${bold ? '12px' : '9px'} ${bold ? '16px' : '20px'}`,
      paddingLeft: indent ? 32 : (bold ? 16 : 20),
      borderBottom: `1px solid ${border}`,
      background: bold ? (dark ? 'rgba(249,115,22,0.07)' : '#fff7ed') : 'transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: bold ? 14 : 13, fontWeight: bold ? 700 : 400, color: bold ? text : (indent ? muted : text) }}>
          {label}
        </span>
        {help && <HelpBubble position="right" text={help} />}
      </div>
      <span style={{ fontSize: bold ? 16 : 13, fontWeight: bold ? 800 : 600, color: color ?? text, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );

  const years = [year - 1, year, year + 1];

  return (
    <div style={{ background: bg, minHeight: '100%', padding: '28px 24px', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Hlavička */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: text, margin: 0 }}>Daňové priznanie</h2>
            <p style={{ fontSize: 12, color: muted, marginTop: 3 }}>
              Informatívny prehľad pre {mode === 'simple' ? 'jednoduché' : 'podvojné'} účtovníctvo
            </p>
          </div>
          <button
            onClick={exportPdf}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: '#f97316', color: '#fff', fontSize: 12, fontWeight: 600,
              fontFamily: 'inherit',
            }}
          >
            <FileText size={14} /> Exportovať PDF
          </button>
        </div>

        {/* Info banner */}
        <div style={{
          display: 'flex', gap: 10, padding: '12px 16px', borderRadius: 12,
          background: dark ? 'rgba(59,130,246,0.08)' : '#eff6ff',
          border: `1px solid ${dark ? 'rgba(59,130,246,0.2)' : '#bfdbfe'}`,
        }}>
          <Info size={15} color="#3b82f6" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: dark ? 'rgba(147,197,253,0.9)' : '#1d4ed8', margin: 0, lineHeight: 1.5 }}>
            Toto je <strong>informatívny prehľad</strong> — slúži na prípravu podkladov. Skutočné daňové priznanie podávaj cez <strong>financnasprava.sk</strong> (eDane). Hodnoty si skontroluj s účtovníkom.
          </p>
        </div>

        {/* Nastavenia */}
        <div style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 14px' }}>Nastavenia výpočtu</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
            {/* Rok */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 5 }}>
                Zdaňovacie obdobie
              </label>
              <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ ...inp(), width: '100%', cursor: 'pointer' }}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            {/* Sadzba dane */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 5 }}>
                Sadzba dane{' '}
                <HelpBubble position="top" text="15 % — ak obrat za rok nepresahuje 60 000 €. 21 % — ak obrat presiahol 60 000 € alebo si právnická osoba (s.r.o.)." />
              </label>
              <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))} style={{ ...inp(), width: '100%', cursor: 'pointer' }}>
                {TAX_RATES.map(r => <option key={r} value={r}>{r} %</option>)}
              </select>
            </div>
            {/* NČZD */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 5 }}>
                Odpočet (NČZD) €{' '}
                <HelpBubble position="top" text="Nezdaniteľná časť základu dane — živnostníci môžu odpočítať paušálnu čiastku (aktuálne ~5 646 €/rok). Skontroluj aktuálnu výšku na financnasprava.sk." />
              </label>
              <input
                type="text" inputMode="decimal"
                placeholder="napr. 5646"
                value={rawNczd}
                onChange={e => handleNczd(e.target.value)}
                style={{ ...inp(), width: '100%' }}
              />
            </div>
            {/* Preddavky */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: muted, marginBottom: 5 }}>
                Zaplatené preddavky €{' '}
                <HelpBubble position="top" text="Preddavky na daň z príjmov ktoré si už zaplatil počas roka. Odrátajú sa od výslednej dane." />
              </label>
              <input
                type="text" inputMode="decimal"
                placeholder="0,00"
                value={rawPrepaid}
                onChange={e => handlePrepaid(e.target.value)}
                style={{ ...inp(), width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* Výsledky */}
        <div style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${border}` }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Výsledok za rok {year}
            </span>
          </div>

          <Row
            label={mode === 'simple' ? 'Celkové príjmy' : 'Celkové výnosy (účty 6xx)'}
            value={`${centsToEur(totalIncome)} €`}
            color="#10b981"
            help={mode === 'simple'
              ? 'Súčet všetkých príjmov zadaných v účtovnom denníku za zvolený rok.'
              : 'Súčet kreditných obratov na výnosových účtoch (6xx) za zvolený rok.'}
          />
          <Row
            label={mode === 'simple' ? 'Celkové výdavky' : 'Celkové náklady (účty 5xx)'}
            value={`${centsToEur(totalExpense)} €`}
            color="#ef4444"
            help={mode === 'simple'
              ? 'Súčet všetkých výdavkov zadaných v účtovnom denníku za zvolený rok.'
              : 'Súčet debetných obratov na nákladových účtoch (5xx) za zvolený rok.'}
          />
          <Row
            label="Rozdiel príjmy − výdavky"
            value={`${centsToEur(totalIncome - totalExpense)} €`}
            color={totalIncome - totalExpense >= 0 ? text : '#ef4444'}
          />
          {nczd > 0 && (
            <Row
              label="− Odpočítateľné položky (NČZD)"
              value={`− ${centsToEur(nczd)} €`}
              color={muted}
              indent
            />
          )}
          <Row
            label="Základ dane"
            value={`${centsToEur(zakladDane)} €`}
            bold
            help="Základ dane = príjmy − výdavky − odpočítateľné položky. Z tejto sumy sa vypočíta daň."
          />
          <Row
            label={`Daň z príjmov (${taxRate} %)`}
            value={`${centsToEur(dan)} €`}
            bold
            color="#f97316"
            help={`Vypočítaná daň: ${taxRate} % zo základu dane ${centsToEur(zakladDane)} €.`}
          />
          {prepaid > 0 && (
            <Row
              label="− Zaplatené preddavky"
              value={`− ${centsToEur(prepaid)} €`}
              color={muted}
              indent
            />
          )}
          <Row
            label="Daň na úhradu / doplatok"
            value={`${centsToEur(danPoPreddav)} €`}
            bold
            color={danPoPreddav > 0 ? '#ef4444' : '#10b981'}
            help="Výsledná suma ktorú treba doplatiť daňovému úradu (po odpočítaní preddavkov)."
          />
        </div>

        {/* Detail príjmov/výdavkov */}
        {(Object.keys(revenueByCategory).length > 0 || Object.keys(costByCategory).length > 0) && (
          <div style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, overflow: 'hidden' }}>
            <button
              onClick={() => setShowDetail(d => !d)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Detailný rozpis
              </span>
              {showDetail ? <ChevronUp size={15} color={muted} /> : <ChevronDown size={15} color={muted} />}
            </button>

            {showDetail && (
              <div style={{ borderTop: `1px solid ${border}` }}>
                {Object.keys(revenueByCategory).length > 0 && (
                  <>
                    <div style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {mode === 'simple' ? 'Príjmy' : 'Výnosy'} podľa {mode === 'simple' ? 'kategórie' : 'účtu'}
                    </div>
                    {Object.entries(revenueByCategory).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 20px 7px 28px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.03)' : '#f9fafb'}` }}>
                        <span style={{ fontSize: 12, color: muted }}>{key}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#10b981', fontVariantNumeric: 'tabular-nums' }}>{centsToEur(val)} €</span>
                      </div>
                    ))}
                  </>
                )}
                {Object.keys(costByCategory).length > 0 && (
                  <>
                    <div style={{ padding: '10px 20px 4px', fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 4 }}>
                      {mode === 'simple' ? 'Výdavky' : 'Náklady'} podľa {mode === 'simple' ? 'kategórie' : 'účtu'}
                    </div>
                    {Object.entries(costByCategory).map(([key, val]) => (
                      <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 20px 7px 28px', borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.03)' : '#f9fafb'}` }}>
                        <span style={{ fontSize: 12, color: muted }}>{key}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{centsToEur(val)} €</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Dôležité termíny */}
        <div style={{ background: surface, borderRadius: 16, border: `1px solid ${border}`, padding: '18px 20px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>
            Dôležité termíny ({year + 1})
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { date: `31.3.${year + 1}`, label: 'Podanie daňového priznania (základný termín)' },
              { date: `30.6.${year + 1}`, label: 'Podanie DP s odkladom (oznámenie do 31.3.)' },
              { date: `31.3.${year + 1}`, label: 'Úhrada dane' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed', color: '#f97316',
                  fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>
                  {item.date}
                </span>
                <span style={{ fontSize: 12, color: text }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
