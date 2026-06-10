import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '../../store/invoiceStore';
import { calcInvoiceSubtotalCents, calcInvoiceTotalCents } from '../../store/invoiceStore';
import { centsToEur } from '../../store/transactionStore';
import type { Company } from '../../store/companyStore';
import { pd } from '../../utils/pdfHelpers';

const ORANGE = [249, 115, 22]  as [number, number, number];
const DARK   = [12,  12,  14]  as [number, number, number];
const GRAY   = [120, 120, 130] as [number, number, number];
const LGRAY  = [246, 247, 249] as [number, number, number];
const WHITE  = [255, 255, 255] as [number, number, number];

function eur(cents: number) { return centsToEur(cents) + ' EUR'; }

export function exportInvoicePdf(invoice: Invoice, company: Company, lang: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const sk  = lang === 'sk';
  const W   = 210;
  const H   = 297;
  const PAD = 14;

  /* ── COMPANY LOGO (top-left) ──────────────────────────────────────── */
  let logoEndY = PAD;
  if (company.logoDataUrl) {
    try {
      doc.addImage(company.logoDataUrl, 'PNG', PAD, PAD, 28, 28);
      logoEndY = PAD + 30;
    } catch (_) { /* ignore invalid image */ }
  }

  /* ── SUPPLIER INFO (top-left) ─────────────────────────────────────── */
  const suppX = company.logoDataUrl ? PAD + 32 : PAD;
  let sy = PAD + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...DARK);
  doc.text(pd(company.name), suppX, sy);
  sy += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);

  if (company.address) { doc.text(pd(company.address), suppX, sy); sy += 5; }
  if (company.city || company.zip) {
    const line = [company.zip, company.city].filter(Boolean).join(' ');
    doc.text(pd(line), suppX, sy); sy += 5;
  }
  if (company.ico) { doc.text(`ICO: ${company.ico}`, suppX, sy); sy += 5; }
  if (company.dic) { doc.text(`DIC: ${company.dic}`, suppX, sy); sy += 5; }
  if (company.email) { doc.text(pd(company.email), suppX, sy); sy += 5; }
  if (company.phone) { doc.text(pd(company.phone), suppX, sy); sy += 5; }

  /* ── INVOICE HEADER (top-right) ───────────────────────────────────── */
  const rightX = W - PAD;
  let hy = PAD + 4;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(...ORANGE);
  doc.text(sk ? 'FAKTURA' : 'INVOICE', rightX, hy, { align: 'right' });
  hy += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...DARK);
  doc.text(pd(invoice.number), rightX, hy, { align: 'right' });
  hy += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);

  doc.text(`${sk ? 'Datum vystavenia' : 'Issue date'}:`, rightX - 44, hy);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.issueDate, rightX, hy, { align: 'right' });
  hy += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...GRAY);
  doc.text(`${sk ? 'Datum splatnosti' : 'Due date'}:`, rightX - 44, hy);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'bold');
  doc.text(invoice.dueDate, rightX, hy, { align: 'right' });
  hy += 5.5;

  if (company.iban) {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text('IBAN:', rightX - 44, hy);
    doc.setTextColor(...DARK);
    doc.setFont('helvetica', 'bold');
    doc.text(pd(company.iban), rightX, hy, { align: 'right' });
    hy += 5.5;
  }

  /* ── ORANGE DIVIDER ───────────────────────────────────────────────── */
  const divY = Math.max(sy, hy, logoEndY) + 6;
  doc.setDrawColor(...ORANGE);
  doc.setLineWidth(0.8);
  doc.line(PAD, divY, W - PAD, divY);

  /* ── SUPPLIER / CUSTOMER BOXES ────────────────────────────────────── */
  const boxY  = divY + 6;
  const halfW = (W - 2 * PAD - 10) / 2;

  // Supplier
  doc.setFillColor(...LGRAY);
  doc.roundedRect(PAD, boxY, halfW, 34, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...ORANGE);
  doc.text(sk ? 'DODAVATEL' : 'SUPPLIER', PAD + 5, boxY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  doc.text(pd(company.name), PAD + 5, boxY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  let sLine = boxY + 19;
  if (company.address) { doc.text(pd(company.address), PAD + 5, sLine); sLine += 5; }
  const cityZip = [company.zip, company.city].filter(Boolean).join(' ');
  if (cityZip) { doc.text(pd(cityZip), PAD + 5, sLine); }

  // Customer
  const cx = PAD + halfW + 10;
  doc.setFillColor(...LGRAY);
  doc.roundedRect(cx, boxY, halfW, 34, 3, 3, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...ORANGE);
  doc.text(sk ? 'ODBERATEL' : 'CUSTOMER', cx + 5, boxY + 6);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...DARK);
  if (invoice.customerName) doc.text(pd(invoice.customerName), cx + 5, boxY + 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  let cLine = boxY + 19;
  if (invoice.customerAddress) { doc.text(pd(invoice.customerAddress), cx + 5, cLine, { maxWidth: halfW - 10 }); cLine += 5; }
  const custInfo = [
    invoice.customerIco ? `ICO: ${invoice.customerIco}` : '',
    invoice.customerDic ? `DIC: ${invoice.customerDic}` : '',
  ].filter(Boolean).join('   ');
  if (custInfo) doc.text(custInfo, cx + 5, cLine);

  /* ── ITEMS TABLE ──────────────────────────────────────────────────── */
  const tableY = boxY + 40;

  autoTable(doc, {
    startY: tableY,
    head: [[
      sk ? 'Popis' : 'Description',
      sk ? 'Mnoz.' : 'Qty',
      'MJ',
      sk ? 'Jedn. cena' : 'Unit price',
      'DPH %',
      sk ? 'Zaklad DPH' : 'VAT base',
      sk ? 'Celkom s DPH' : 'Total',
    ]],
    body: invoice.items.map((item) => {
      const base  = Math.round(item.quantity * item.unitPriceCents);
      const total = Math.round(base * (1 + item.vatRate / 100));
      return [
        pd(item.name),
        String(item.quantity),
        pd((item as unknown as { unit?: string }).unit ?? 'ks'),
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
      fontSize: 8.5,
    },
    bodyStyles: { fontSize: 8.5, textColor: DARK },
    alternateRowStyles: { fillColor: LGRAY },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'right', cellWidth: 14 },
      2: { halign: 'center', cellWidth: 12 },
      3: { halign: 'right', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 26 },
      6: { halign: 'right', cellWidth: 26, fontStyle: 'bold' },
    },
    margin: { left: PAD, right: PAD },
  });

  /* ── TOTALS BOX ────────────────────────────────────────────────────── */
  const tableEnd = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const subtotal = calcInvoiceSubtotalCents(invoice.items);
  const total    = calcInvoiceTotalCents(invoice.items);
  const boxX     = W - PAD - 78;
  let   ty       = tableEnd + 10;

  // VAT breakdown
  const vatByRate: Record<number, number> = {};
  invoice.items.forEach((item) => {
    if (item.vatRate > 0) {
      const base = Math.round(item.quantity * item.unitPriceCents);
      vatByRate[item.vatRate] = (vatByRate[item.vatRate] ?? 0) + Math.round(base * item.vatRate / 100);
    }
  });

  const lineH = 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
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

  // Orange total bar
  doc.setFillColor(...ORANGE);
  doc.roundedRect(boxX - 4, ty - 5, W - PAD - boxX + 4 + PAD, 12, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...WHITE);
  doc.text(sk ? 'CELKOM K UHRADE:' : 'TOTAL DUE:', boxX, ty + 3);
  doc.text(eur(total), W - PAD, ty + 3, { align: 'right' });
  ty += 18;

  /* ── PAYMENT INFO ──────────────────────────────────────────────────── */
  if (company.iban || company.bank) {
    doc.setFillColor(...LGRAY);
    doc.roundedRect(PAD, ty - 4, W - 2 * PAD, 28, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...ORANGE);
    doc.text(sk ? 'PLATOBNE UDAJE' : 'PAYMENT DETAILS', PAD + 5, ty + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const cols = W - 2 * PAD - 10;
    const c1x = PAD + 5;
    const c2x = PAD + 5 + cols / 3;
    const c3x = PAD + 5 + (cols * 2) / 3;
    const py  = ty + 11;

    doc.setTextColor(...GRAY);
    doc.text('IBAN:', c1x, py);
    if (company.bank) doc.text(sk ? 'Banka:' : 'Bank:', c2x, py);
    doc.text(sk ? 'Variabilny symbol:' : 'Variable symbol:', c3x, py);
    const py2 = py + 5.5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...DARK);
    if (company.iban) doc.text(pd(company.iban), c1x, py2);
    if (company.bank) doc.text(pd(company.bank), c2x, py2);
    doc.text(invoice.number.replace(/\D/g, ''), c3x, py2);

    ty += 34;
  }

  /* ── NOTE ──────────────────────────────────────────────────────────── */
  if (invoice.note) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    doc.text(sk ? 'Poznamka:' : 'Note:', PAD, ty);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(pd(invoice.note), PAD, ty + 6, { maxWidth: W - 2 * PAD - 80 });
    ty += 18;
  }

  /* ── FOOTER ────────────────────────────────────────────────────────── */
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.4);
  doc.line(PAD, H - 16, W - PAD, H - 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  doc.text(
    sk
      ? 'Faktura bola vystavena v sulade so zakonom c. 222/2004 Z. z. o dani z pridanej hodnoty'
      : 'Invoice issued in accordance with applicable tax regulations',
    PAD, H - 10
  );
  doc.text(`1 / 1`, W - PAD, H - 10, { align: 'right' });

  doc.save(`faktura-${invoice.number}.pdf`);
}
