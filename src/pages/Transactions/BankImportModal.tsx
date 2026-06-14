import { useState, useRef, useCallback } from 'react';
import { Upload, CheckCircle } from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { useTransactionStore } from '../../store/transactionStore';
import type { SimpleCategory } from '../../store/transactionStore';
import { useDark } from '../../store/themeStore';

// ── helpers ──────────────────────────────────────────────────────────────────

function parseAmount(raw: string): number {
  const clean = raw.replace(/\s/g, '').replace(',', '.');
  return Math.round(parseFloat(clean) * 100);
}

function parseDate(raw: string): string {
  const parts = raw.trim().split('.');
  if (parts.length === 3)
    return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
  return raw;
}

function guessCategory(desc: string): SimpleCategory {
  const d = desc.toLowerCase();
  if (d.includes('nájem') || d.includes('nájom') || d.includes('rent')) return 'rent';
  if (
    d.includes('elektr') || d.includes('plyn') || d.includes('voda') ||
    d.includes('telekom') || d.includes('internet') || d.includes('orange') || d.includes('o2')
  ) return 'utilities';
  if (d.includes('mzda') || d.includes('plat') || d.includes('salary')) return 'salaries';
  if (
    d.includes('marketing') || d.includes('reklam') || d.includes('google') ||
    d.includes('meta') || d.includes('facebook')
  ) return 'marketing';
  if (
    d.includes('tesco') || d.includes('kaufland') || d.includes('lidl') ||
    d.includes('billa') || d.includes('supermarket')
  ) return 'supplies';
  return 'other';
}

type BankName = 'Tatra banka' | 'SLSP' | 'VÚB' | 'ČSOB' | 'Iná banka';

interface ParsedRow {
  date: string;
  description: string;
  amountCents: number;
  selected: boolean;
  duplicate: boolean;
}

interface ParseResult {
  bankName: BankName;
  rows: ParsedRow[];
  needsMapping: boolean;
  headers: string[];
  rawRows: string[][];
}

// ── generic CSV parser ────────────────────────────────────────────────────────

function splitCsvLine(line: string, sep: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQ = !inQ; continue; }
    if (!inQ && ch === sep) { result.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  result.push(cur.trim());
  return result;
}

function detectSep(line: string): string {
  return line.includes(';') ? ';' : ',';
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const sep = detectSep(lines[0]);
  const headers = splitCsvLine(lines[0], sep);
  const rows = lines.slice(1).map((l) => splitCsvLine(l, sep));
  return { headers, rows };
}

// ── bank-specific parsers ─────────────────────────────────────────────────────

function detectBank(headers: string[]): BankName {
  const h = headers.join('|').toLowerCase();
  if (h.includes('dátum pohybu') || h.includes('dátum transakcie')) return 'SLSP';
  if (h.includes('zaúčtovania') || h.includes('zaúčtované')) return 'VÚB';
  if (h.includes('kredit') && h.includes('debet') && h.includes('dátum')) return 'ČSOB';
  if (h.includes('dátum') && h.includes('suma') && h.includes('popis')) return 'Tatra banka';
  return 'Iná banka';
}

function idx(headers: string[], ...candidates: string[]): number {
  for (const c of candidates) {
    const i = headers.findIndex((h) => h.toLowerCase().includes(c.toLowerCase()));
    if (i !== -1) return i;
  }
  return -1;
}

function parseKnownBank(
  bank: BankName,
  headers: string[],
  rows: string[][],
): ParsedRow[] {
  const parsed: ParsedRow[] = [];

  if (bank === 'Tatra banka') {
    const di = idx(headers, 'Dátum');
    const pi = idx(headers, 'Popis', 'Správa');
    const si = idx(headers, 'Suma');
    for (const r of rows) {
      if (!r[di] || !r[si]) continue;
      const amountCents = parseAmount(r[si]);
      if (isNaN(amountCents)) continue;
      parsed.push({ date: parseDate(r[di] ?? ''), description: r[pi] ?? '', amountCents, selected: true, duplicate: false });
    }
  } else if (bank === 'SLSP') {
    const di = idx(headers, 'Dátum pohybu', 'Dátum transakcie', 'Dátum');
    const si = idx(headers, 'Suma');
    const pi = idx(headers, 'Popis', 'Správa', 'Poznámka');
    for (const r of rows) {
      if (!r[di] || !r[si]) continue;
      const amountCents = parseAmount(r[si]);
      if (isNaN(amountCents)) continue;
      parsed.push({ date: parseDate(r[di] ?? ''), description: r[pi] ?? '', amountCents, selected: true, duplicate: false });
    }
  } else if (bank === 'VÚB') {
    const di = idx(headers, 'Dátum zaúčtovania', 'Zaúčtované', 'Dátum');
    const si = idx(headers, 'Suma pohybu', 'Suma');
    const pi = idx(headers, 'Popis', 'Správa');
    for (const r of rows) {
      if (!r[di] || !r[si]) continue;
      const amountCents = parseAmount(r[si]);
      if (isNaN(amountCents)) continue;
      parsed.push({ date: parseDate(r[di] ?? ''), description: r[pi] ?? '', amountCents, selected: true, duplicate: false });
    }
  } else if (bank === 'ČSOB') {
    const di = idx(headers, 'Dátum');
    const ki = idx(headers, 'Kredit');
    const dei = idx(headers, 'Debet');
    const pi = idx(headers, 'Popis', 'Správa');
    for (const r of rows) {
      if (!r[di]) continue;
      const kredit = r[ki] ? parseAmount(r[ki]) : 0;
      const debet = r[dei] ? parseAmount(r[dei]) : 0;
      const amountCents = kredit > 0 ? kredit : -debet;
      if (amountCents === 0) continue;
      parsed.push({ date: parseDate(r[di] ?? ''), description: r[pi] ?? '', amountCents, selected: true, duplicate: false });
    }
  }

  return parsed;
}

// ── column mapping state (generic fallback) ───────────────────────────────────

interface ColMapping {
  dateCol: number;
  amountCol: number;
  descCol: number;
}

function applyMapping(_headers: string[], rows: string[][], mapping: ColMapping): ParsedRow[] {
  return rows
    .filter((r) => r[mapping.dateCol] && r[mapping.amountCol])
    .map((r) => ({
      date: parseDate(r[mapping.dateCol] ?? ''),
      description: r[mapping.descCol] ?? '',
      amountCents: parseAmount(r[mapping.amountCol] ?? ''),
      selected: true,
      duplicate: false,
    }))
    .filter((r) => !isNaN(r.amountCents));
}

// ── component ─────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string;
}

type Step = 'upload' | 'mapping' | 'preview' | 'done';

export function BankImportModal({ open, onClose, companyId }: Props) {
  const dark = useDark();
  const { addSimple, getSimple } = useTransactionStore();

  const [step, setStep] = useState<Step>('upload');
  const [dragging, setDragging] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [mapping, setMapping] = useState<ColMapping>({ dateCol: 0, amountCol: 1, descCol: 2 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── colors ──────────────────────────────────────────────────────────────────
  const text = dark ? '#ffffff' : '#111827';
  const muted = dark ? 'rgba(255,255,255,0.35)' : '#9ca3af';
  const cardBg = dark ? 'rgba(255,255,255,0.03)' : '#f9fafb';
  const cardBorder = dark ? 'rgba(255,255,255,0.08)' : '#e5e7eb';
  const inputBg = dark ? 'rgba(255,255,255,0.05)' : '#ffffff';
  const inputBorder = dark ? 'rgba(255,255,255,0.1)' : '#e5e7eb';

  // ── duplicate detection ──────────────────────────────────────────────────────
  function markDuplicates(parsed: ParsedRow[]): ParsedRow[] {
    const existing = getSimple(companyId);
    return parsed.map((r) => ({
      ...r,
      duplicate: existing.some(
        (tx) => tx.date === r.date && tx.amountCents === Math.abs(r.amountCents),
      ),
    }));
  }

  // ── file processing ──────────────────────────────────────────────────────────
  function processText(text: string) {
    const { headers, rows: rawRows } = parseCsv(text);
    if (!headers.length) return;

    const bank = detectBank(headers);
    const needsMapping = bank === 'Iná banka';

    if (!needsMapping) {
      const parsed = markDuplicates(parseKnownBank(bank, headers, rawRows));
      setParseResult({ bankName: bank, rows: parsed, needsMapping: false, headers, rawRows });
      setRows(parsed);
      setStep('preview');
    } else {
      const defaultMapping: ColMapping = { dateCol: 0, amountCol: 1, descCol: 2 };
      setMapping(defaultMapping);
      setParseResult({ bankName: bank, rows: [], needsMapping: true, headers, rawRows });
      setStep('mapping');
    }
  }

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      processText(text);
    };
    reader.readAsText(file, 'UTF-8');
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function handleMappingConfirm() {
    if (!parseResult) return;
    const parsed = markDuplicates(applyMapping(parseResult.headers, parseResult.rawRows, mapping));
    setRows(parsed);
    setStep('preview');
  }

  // ── import ───────────────────────────────────────────────────────────────────
  function handleImport() {
    const toImport = rows.filter((r) => r.selected && !r.duplicate);
    for (const row of toImport) {
      addSimple({
        companyId,
        date: row.date,
        description: row.description,
        type: row.amountCents > 0 ? 'income' : 'expense',
        category:
          row.amountCents > 0 ? 'other_income' : guessCategory(row.description),
        amountCents: Math.abs(row.amountCents),
        note: 'Import z banky',
      }, 'bulk'); // hromadný import → bez push notifikácie za každý riadok
    }
    setImportedCount(toImport.length);
    setStep('done');
  }

  function handleClose() {
    setStep('upload');
    setParseResult(null);
    setRows([]);
    setImportedCount(0);
    onClose();
  }

  // ── stats ────────────────────────────────────────────────────────────────────
  const selectedRows = rows.filter((r) => r.selected && !r.duplicate);
  const incomeCount = rows.filter((r) => r.amountCents > 0).length;
  const expenseCount = rows.filter((r) => r.amountCents <= 0).length;
  const dupCount = rows.filter((r) => r.duplicate).length;

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: muted,
    textTransform: 'uppercase', letterSpacing: '0.05em',
    marginBottom: 6, display: 'block',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 10,
    border: `1px solid ${inputBorder}`, background: inputBg,
    color: text, fontSize: 13, fontFamily: 'inherit',
  };

  // ── render steps ──────────────────────────────────────────────────────────────

  function renderUpload() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? '#f97316' : cardBorder}`,
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging
              ? (dark ? 'rgba(249,115,22,0.06)' : '#fff7ed')
              : cardBg,
            transition: 'all 0.15s',
          }}
        >
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: dark ? 'rgba(249,115,22,0.12)' : '#fff7ed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Upload size={22} color="#f97316" />
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: text, margin: '0 0 4px' }}>
            Pretiahnite súbor sem alebo kliknite na výber
          </p>
          <p style={{ fontSize: 12, color: muted, margin: 0 }}>Podporované formáty: CSV, XML</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xml"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* Bank badges */}
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Podporované banky
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {(['Tatra banka', 'SLSP', 'VÚB', 'ČSOB', 'Iná banka'] as const).map((b) => (
              <span
                key={b}
                style={{
                  padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 500,
                  background: dark ? 'rgba(255,255,255,0.07)' : '#f3f4f6',
                  color: dark ? 'rgba(255,255,255,0.6)' : '#6b7280',
                  border: `1px solid ${cardBorder}`,
                }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderMapping() {
    if (!parseResult) return null;
    const { headers } = parseResult;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{
          padding: '10px 14px', borderRadius: 10,
          background: dark ? 'rgba(249,115,22,0.1)' : '#fff7ed',
          fontSize: 13, color: '#f97316', fontWeight: 500,
        }}>
          Nebola rozpoznaná banka. Zvoľte, ktorý stĺpec obsahuje dátum, sumu a popis.
        </div>

        {(['dateCol', 'amountCol', 'descCol'] as const).map((field) => {
          const labels: Record<string, string> = { dateCol: 'Dátum', amountCol: 'Suma', descCol: 'Popis' };
          return (
            <div key={field}>
              <label style={labelStyle}>{labels[field]}</label>
              <select
                value={mapping[field]}
                onChange={(e) => setMapping((m) => ({ ...m, [field]: +e.target.value }))}
                style={selectStyle}
              >
                {headers.map((h, i) => (
                  <option key={i} value={i}>{h || `Stĺpec ${i + 1}`}</option>
                ))}
              </select>
            </div>
          );
        })}

        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" fullWidth onClick={() => setStep('upload')}>Späť</Button>
          <Button fullWidth onClick={handleMappingConfirm}>Pokračovať</Button>
        </div>
      </div>
    );
  }

  function renderPreview() {
    if (!parseResult) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Bank badge + stats */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <span style={{
            padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
            background: dark ? 'rgba(249,115,22,0.15)' : '#fff7ed', color: '#f97316',
          }}>
            {parseResult.bankName}
          </span>
          <span style={{ fontSize: 12, color: muted }}>
            Celkom: {rows.length} riadkov | Príjmy: {incomeCount} | Výdavky: {expenseCount} | Duplikáty: {dupCount}
          </span>
        </div>

        {/* Select all / deselect */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setRows((r) => r.map((row) => ({ ...row, selected: !row.duplicate })))}
            style={{
              padding: '5px 12px', borderRadius: 8, border: `1px solid ${cardBorder}`,
              background: 'transparent', color: text, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Vybrať všetky
          </button>
          <button
            onClick={() => setRows((r) => r.map((row) => ({ ...row, selected: false })))}
            style={{
              padding: '5px 12px', borderRadius: 8, border: `1px solid ${cardBorder}`,
              background: 'transparent', color: text, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Zrušiť výber
          </button>
        </div>

        {/* Table */}
        <div style={{ borderRadius: 12, border: `1px solid ${cardBorder}`, overflow: 'hidden', maxHeight: 380, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: dark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
                {['', 'Dátum', 'Popis', 'Suma'].map((h, i) => (
                  <th
                    key={i}
                    style={{
                      padding: '10px 12px', textAlign: i === 3 ? 'right' : 'left',
                      fontSize: 11, fontWeight: 600, color: muted,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: `1px solid ${cardBorder}`,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    background: row.duplicate
                      ? (dark ? 'rgba(234,179,8,0.08)' : '#fefce8')
                      : 'transparent',
                    borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'}`,
                  }}
                >
                  <td style={{ padding: '8px 12px', width: 32 }}>
                    <input
                      type="checkbox"
                      checked={row.selected && !row.duplicate}
                      disabled={row.duplicate}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((r, j) => j === i ? { ...r, selected: e.target.checked } : r)
                        )
                      }
                    />
                  </td>
                  <td style={{ padding: '8px 12px', color: muted, whiteSpace: 'nowrap' }}>{row.date}</td>
                  <td style={{ padding: '8px 12px', color: text, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {row.description}
                    {row.duplicate && (
                      <span style={{
                        marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 999,
                        background: '#fef08a', color: '#92400e', fontWeight: 600,
                      }}>
                        ⚠ duplicát
                      </span>
                    )}
                  </td>
                  <td style={{
                    padding: '8px 12px', textAlign: 'right', fontWeight: 600,
                    color: row.amountCents > 0 ? '#10b981' : '#ef4444',
                    whiteSpace: 'nowrap',
                  }}>
                    {row.amountCents > 0 ? '+' : ''}
                    {(row.amountCents / 100).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="secondary" fullWidth onClick={() => setStep('upload')}>Späť</Button>
          <Button
            fullWidth
            disabled={selectedRows.length === 0}
            onClick={handleImport}
          >
            Importovať vybrané ({selectedRows.length})
          </Button>
        </div>
      </div>
    );
  }

  function renderDone() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 0' }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: dark ? 'rgba(16,185,129,0.12)' : '#ecfdf5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <CheckCircle size={32} color="#10b981" />
        </div>
        <p style={{ fontSize: 17, fontWeight: 700, color: text, margin: 0, textAlign: 'center' }}>
          Úspešne importované {importedCount} transakcií
        </p>
        <Button onClick={handleClose}>Zatvoriť</Button>
      </div>
    );
  }

  const titles: Record<Step, string> = {
    upload: 'Importovať z banky',
    mapping: 'Namapovanie stĺpcov',
    preview: 'Náhľad transakcií',
    done: 'Import dokončený',
  };

  return (
    <Modal open={open} onClose={handleClose} title={titles[step]} size="xl">
      {step === 'upload' && renderUpload()}
      {step === 'mapping' && renderMapping()}
      {step === 'preview' && renderPreview()}
      {step === 'done' && renderDone()}
    </Modal>
  );
}
