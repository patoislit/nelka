import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '../../store/invoiceStore';
import { calcInvoiceSubtotalCents, calcInvoiceTotalCents } from '../../store/invoiceStore';
import { centsToEur } from '../../store/transactionStore';

const ORANGE  = [249, 115, 22]  as [number, number, number];
const DARK    = [15,  15,  20]  as [number, number, number];
const GRAY    = [100, 100, 110] as [number, number, number];
const LGRAY   = [240, 240, 245] as [number, number, number];
const WHITE   = [255, 255, 255] as [number, number, number];

function eur(cents: number) { return centsToEur(cents) + ' €'; }

export function exportInvoicePdf(invoice: Invoice, companyName: string, lang: string): void {
  const doc   = new jsPDF({ unit: 'mm', format: 'a4' });
  const sk    = lang === 'sk';
  const W     = 210;
  const PAD   = 14;

  /* ── HEADER BAR ─────────────────────────────────────────────────────── */
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, W, 28, 'F');

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text(companyName, PAD, 12);

  // "FAKTÚRA" label
  doc.setFontSize(20);
  doc.text(sk ? 'FAKTURA' : 'INVOICE', W - PAD, 12, { align: 'right' });

  // Invoice number small
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`c. ${invoice.number}`, W - PAD, 20, { align: 'right' });

  /* ── META ROW ────────────────────────────────────────────────────────── */
  let y = 36;
  const metaItems = [
    { label: sk ? 'Datum vystavenia' : 'Issue date', value: invoice.issueDate },
    { label: sk ? 'Datum splatnosti' : 'Due date',   value: invoice.dueDate   },
    { label: sk ? 'Stav' : 'Status',
      value: sk
        ? { draft: 'Koncept', sent: 'Odoslana', paid: 'Zaplatena', overdue: 'Po splatnosti', cancelled: 'Stornovana' }[invoice.status] ?? invoice.status
        : invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)
    },
  ];
  const colW = (W - 2 * PAD) / metaItems.length;
  doc.setFillColor(...LGRAY);
  doc.rect(PAD, y - 5, W - 2 * PAD, 14, 'F');
  metaItems.forEach((m, i) => {
    const x = PAD + i * colW + 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(m.label, x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(m.value, x, y + 5);
  });

  /* ── SUPPLIER / CUSTOMER ─────────────────────────────────────────────── */
  y += 20;
  const halfW = (W - 2 * PAD - 10) / 2;

  // Supplier box
  doc.setFillColor(...LGRAY);
  doc.rect(PAD, y, halfW, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...ORANGE);
  doc.text(sk ? 'DODAVATEL' : 'SUPPLIER', PAD + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(companyName, PAD + 4, y + 13);

  // Customer box
  const cx = PAD + halfW + 10;
  doc.setFillColor(...LGRAY);
  doc.rect(cx, y, halfW, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...ORANGE);
  doc.text(sk ? 'ODBERATEL' : 'CUSTOMER', cx + 4, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  if (invoice.customerName) doc.text(invoice.customerName, cx + 4, y + 13);
  if (invoice.customerAddress) doc.text(invoice.customerAddress, cx + 4, y + 19, { maxWidth: halfW - 8 });
  const infoY = y + (invoice.customerAddress ? 25 : 19);
  const infoLine = [invoice.customerIco ? `IČO: ${invoice.customerIco}` : '', invoice.customerDic ? `DIČ: ${invoice.customerDic}` : ''].filter(Boolean).join('   ');
  if (infoLine) doc.text(infoLine, cx + 4, infoY);

  /* ── ITEMS TABLE ─────────────────────────────────────────────────────── */
  y += 38;

  autoTable(doc, {
    startY: y,
    head: [[
      sk ? 'Popis' : 'Description',
      sk ? 'Množ.' : 'Qty',
      sk ? 'J.cena' : 'Unit price',
      'DPH',
      sk ? 'Základ' : 'Base',
      sk ? 'Celkom' : 'Total',
    ]],
    body: invoice.items.map((item) => {
      const base  = Math.round(item.quantity * item.unitPriceCents);
      const total = Math.round(base * (1 + item.vatRate / 100));
      return [
        item.name,
        String(item.quantity),
        eur(item.unitPriceCents),
        item.vatRate + '%',
        eur(base),
        eur(total),
      ];
    }),
    headStyles: {
      fillColor: ORANGE,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 9, textColor: DARK },
    alternateRowStyles: { fillColor: [250, 250, 252] as [number, number, number] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 16 },
      2: { halign: 'right', cellWidth: 26 },
      3: { halign: 'center', cellWidth: 14 },
      4: { halign: 'right', cellWidth: 26 },
      5: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
    },
    margin: { left: PAD, right: PAD },
  });

  /* ── TOTALS BOX ──────────────────────────────────────────────────────── */
  const tableEnd = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const subtotal = calcInvoiceSubtotalCents(invoice.items);
  const total    = calcInvoiceTotalCents(invoice.items);
  const boxX     = W - PAD - 72;
  const lineH    = 7;
  let   ty       = tableEnd + 8;

  // VAT breakdown by rate
  const vatByRate: Record<number, number> = {};
  invoice.items.forEach((item) => {
    if (item.vatRate > 0) {
      const base = Math.round(item.quantity * item.unitPriceCents);
      vatByRate[item.vatRate] = (vatByRate[item.vatRate] ?? 0) + Math.round(base * item.vatRate / 100);
    }
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  doc.text(sk ? 'Zaklad DPH:' : 'Subtotal:', boxX, ty);
  doc.setTextColor(...DARK);
  doc.text(eur(subtotal), W - PAD, ty, { align: 'right' });
  ty += lineH;

  Object.entries(vatByRate).forEach(([rate, vatAmt]) => {
    doc.setTextColor(...GRAY);
    doc.text(`DPH ${rate}%:`, boxX, ty);
    doc.setTextColor(...DARK);
    doc.text(eur(vatAmt), W - PAD, ty, { align: 'right' });
    ty += lineH;
  });

  // Total line with orange background
  doc.setFillColor(...ORANGE);
  doc.rect(boxX - 4, ty - 5, W - PAD - boxX + 4 + PAD, 11, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text(sk ? 'CELKOM:' : 'TOTAL:', boxX, ty + 2);

  doc.text(eur(total), W - PAD, ty + 2, { align: 'right' });

  /* ── NOTE ────────────────────────────────────────────────────────────── */
  if (invoice.note) {
    ty += 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(sk ? 'Poznamka:' : 'Note:', PAD, ty);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.note, PAD, ty + 6, { maxWidth: W - 2 * PAD - 80 });
  }

  /* ── FOOTER ──────────────────────────────────────────────────────────── */
  doc.setFillColor(...DARK);
  doc.rect(0, 282, W, 15, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text('Vygenerované aplikáciou Nelka Economics and Logistics', PAD, 291);
  doc.text(`© ${new Date().getFullYear()} Furiel`, W - PAD, 291, { align: 'right' });

  doc.save(`faktura-${invoice.number}.pdf`);
}
