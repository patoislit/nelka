import { create } from 'zustand';
import { collection, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, getLocalUserId, listen } from '../lib/firebase';

let unsubInvoices: (() => void) | null = null;

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  id: string; name: string; quantity: number;
  unitPriceCents: number; vatRate: number; warehouseItemId?: string;
}

export interface Invoice {
  id: string; number: string; companyId: string;
  issueDate: string; dueDate: string;
  customerName: string; customerAddress: string;
  customerIco: string; customerDic: string;
  items: InvoiceItem[]; status: InvoiceStatus;
  note: string; journalEntryId?: string; createdAt: string;
}

interface InvoiceStore {
  invoices: Invoice[];
  loadForUser: (userId: string) => Promise<void>;
  clearData: () => void;
  addInvoice(data: Omit<Invoice, 'id' | 'createdAt'>): Invoice;
  updateInvoice(id: string, data: Partial<Invoice>): void;
  deleteInvoice(id: string): void;
  getInvoicesForCompany(companyId: string): Invoice[];
  getNextNumber(companyId: string, year: number): string;
}

const COL = 'invoices';

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: [],

  loadForUser: (userId) => {
    // realtime — zmeny z iného zariadenia sa prejavia okamžite
    unsubInvoices?.();
    const { ready, unsub } = listen(query(collection(db, COL), where('userId', '==', userId)), (snap) => {
      set({
        invoices: snap.docs
          .map((d) => {
            const r = d.data();
            return {
              id: d.id, number: r.number, companyId: r.companyId,
              issueDate: r.issueDate, dueDate: r.dueDate,
              customerName: r.customerName, customerAddress: r.customerAddress,
              customerIco: r.customerIco, customerDic: r.customerDic,
              items: r.items ?? [], status: r.status, note: r.note,
              journalEntryId: r.journalEntryId ?? undefined, createdAt: r.createdAt,
            };
          })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      });
    });
    unsubInvoices = unsub;
    return ready;
  },

  clearData: () => {
    unsubInvoices?.(); unsubInvoices = null;
    set({ invoices: [] });
  },

  addInvoice(data) {
    const userId = getLocalUserId();
    const invoice: Invoice = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set((s) => ({ invoices: [invoice, ...s.invoices] }));
    setDoc(doc(db, COL, invoice.id), { userId, ...invoice })
      .catch((e) => console.error('invoice add:', e));
    return invoice;
  },

  updateInvoice(id, data) {
    set((s) => ({ invoices: s.invoices.map((inv) => inv.id === id ? { ...inv, ...data } : inv) }));
    updateDoc(doc(db, COL, id), data as Record<string, unknown>)
      .catch((e) => console.error('invoice update:', e));
  },

  deleteInvoice(id) {
    set((s) => ({ invoices: s.invoices.filter((inv) => inv.id !== id) }));
    deleteDoc(doc(db, COL, id)).catch((e) => console.error('invoice del:', e));
  },

  getInvoicesForCompany(companyId) {
    return get().invoices.filter((inv) => inv.companyId === companyId);
  },

  getNextNumber(companyId, year) {
    const existing = get().invoices.filter((inv) => inv.companyId === companyId && inv.number.startsWith(`${year}-`));
    return `${year}-${String(existing.length + 1).padStart(3, '0')}`;
  },
}));

export function calcInvoiceSubtotalCents(items: InvoiceItem[]): number {
  return items.reduce((sum, it) => sum + Math.round(it.quantity * it.unitPriceCents), 0);
}
export function calcInvoiceVatCents(items: InvoiceItem[]): number {
  return items.reduce((sum, it) => { const b = Math.round(it.quantity * it.unitPriceCents); return sum + Math.round(b * it.vatRate / 100); }, 0);
}
export function calcInvoiceTotalCents(items: InvoiceItem[]): number {
  return calcInvoiceSubtotalCents(items) + calcInvoiceVatCents(items);
}
