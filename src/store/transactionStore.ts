import { create } from 'zustand';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';
import { db, getLocalUserId } from '../lib/firebase';

export type SimpleCategory =
  | 'sales' | 'services' | 'other_income'
  | 'supplies' | 'rent' | 'utilities' | 'salaries' | 'marketing' | 'other';

export interface SimpleTransaction {
  id: string; companyId: string; date: string; description: string;
  type: 'income' | 'expense'; category: SimpleCategory;
  amountCents: number; note: string; createdAt: string;
}

export interface JournalLine {
  id: string; accountCode: string; accountName: string;
  debitCents: number; creditCents: number;
}

export interface JournalEntry {
  id: string; companyId: string; entryNo: number;
  date: string; description: string; lines: JournalLine[];
  createdAt: string; createdBy: string;
  docType?: string; docNo?: string;
}

interface TransactionStore {
  simpleTransactions: SimpleTransaction[];
  journalEntries: JournalEntry[];
  loadForUser: (userId: string) => Promise<void>;
  clearData: () => void;
  addSimple: (t: Omit<SimpleTransaction, 'id' | 'createdAt'>) => void;
  deleteSimple: (id: string) => void;
  getSimple: (companyId: string) => SimpleTransaction[];
  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'entryNo' | 'createdAt'>) => JournalEntry | null;
  deleteJournalEntry: (id: string) => void;
  getJournalEntries: (companyId: string) => JournalEntry[];
  getAccountBalance: (companyId: string, accountCode: string) => { debitCents: number; creditCents: number };
}

function isBalanced(lines: Pick<JournalLine, 'debitCents' | 'creditCents'>[]): boolean {
  const d = lines.reduce((s, l) => s + l.debitCents, 0);
  const c = lines.reduce((s, l) => s + l.creditCents, 0);
  return d === c && d > 0;
}

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  simpleTransactions: [],
  journalEntries: [],

  loadForUser: async (userId) => {
      const [simpleSnap, entriesSnap] = await Promise.all([
        getDocs(query(collection(db, 'simple_transactions'), where('userId', '==', userId))),
        getDocs(query(collection(db, 'journal_entries'),     where('userId', '==', userId))),
      ]);
      set({
        simpleTransactions: simpleSnap.docs
          .map((d) => { const r = d.data(); return { id: d.id, companyId: r.companyId, date: r.date, description: r.description, type: r.type, category: r.category, amountCents: r.amountCents, note: r.note, createdAt: r.createdAt }; })
          .sort((a, b) => b.date.localeCompare(a.date)),
        journalEntries: entriesSnap.docs
          .map((d) => { const r = d.data(); return { id: d.id, companyId: r.companyId, entryNo: r.entryNo, date: r.date, description: r.description, lines: r.lines ?? [], createdAt: r.createdAt, createdBy: r.createdBy ?? '', docType: r.docType ?? '', docNo: r.docNo ?? '' }; })
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      });
  },

  clearData: () => set({ simpleTransactions: [], journalEntries: [] }),

  addSimple: (t) => {
    const userId = getLocalUserId();
    const tx: SimpleTransaction = { ...t, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    set((s) => ({ simpleTransactions: [tx, ...s.simpleTransactions] }));
    setDoc(doc(db, 'simple_transactions', tx.id), { userId, companyId: tx.companyId, date: tx.date, description: tx.description, type: tx.type, category: tx.category, amountCents: tx.amountCents, note: tx.note, createdAt: tx.createdAt })
      .catch((e) => console.error('simple add:', e));
  },

  deleteSimple: (id) => {
    set((s) => ({ simpleTransactions: s.simpleTransactions.filter((t) => t.id !== id) }));
    deleteDoc(doc(db, 'simple_transactions', id)).catch((e) => console.error('simple del:', e));
  },

  getSimple: (companyId) => get().simpleTransactions.filter((t) => t.companyId === companyId),

  addJournalEntry: (entry) => {
    if (!isBalanced(entry.lines)) return null;
    const userId  = getLocalUserId();
    const entryNo = get().journalEntries.filter((e) => e.companyId === entry.companyId).length + 1;
    const je: JournalEntry = { ...entry, id: crypto.randomUUID(), entryNo, createdAt: new Date().toISOString() };
    set((s) => ({ journalEntries: [je, ...s.journalEntries] }));
    setDoc(doc(db, 'journal_entries', je.id), { userId, companyId: je.companyId, entryNo: je.entryNo, date: je.date, description: je.description, lines: je.lines, createdBy: je.createdBy, createdAt: je.createdAt, docType: je.docType ?? '', docNo: je.docNo ?? '' })
      .catch((e) => console.error('je add:', e));
    return je;
  },

  deleteJournalEntry: (id) => {
    set((s) => ({ journalEntries: s.journalEntries.filter((e) => e.id !== id) }));
    deleteDoc(doc(db, 'journal_entries', id)).catch((e) => console.error('je del:', e));
  },

  getJournalEntries: (companyId) => get().journalEntries.filter((e) => e.companyId === companyId),

  getAccountBalance: (companyId, accountCode) => {
    let debitCents = 0, creditCents = 0;
    for (const entry of get().journalEntries.filter((e) => e.companyId === companyId))
      for (const line of entry.lines)
        if (line.accountCode === accountCode) { debitCents += line.debitCents; creditCents += line.creditCents; }
    return { debitCents, creditCents };
  },
}));

export function centsToEur(cents: number): string {
  return (cents / 100).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function eurToCents(value: string): number {
  const n = parseFloat(value.replace(',', '.'));
  return isNaN(n) ? 0 : Math.round(n * 100);
}
export { isBalanced };
