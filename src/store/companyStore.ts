import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, where,
} from 'firebase/firestore';
import { db, getLocalUserId } from '../lib/firebase';

export type AccountingType = 'simple' | 'double';

export interface Company {
  id: string;
  name: string;
  ico: string;
  dic: string;
  type: AccountingType;
  createdAt: string;
  ownerId: string;
}

interface CompanyStore {
  companies: Company[];
  activeCompanyId: string | null;
  loadForUser: (userId: string) => Promise<void>;
  clearData: () => void;
  addCompany: (data: Omit<Company, 'id' | 'createdAt'>) => Company;
  updateCompany: (id: string, data: Partial<Omit<Company, 'id'>>) => void;
  deleteCompany: (id: string) => void;
  setActiveCompany: (id: string | null) => void;
  getActiveCompany: () => Company | undefined;
  getCompaniesForUser: (userId: string) => Company[];
}

const COL = 'companies';

export const useCompanyStore = create<CompanyStore>()(
  persist(
    (set, get) => ({
      companies: [],
      activeCompanyId: null,

      loadForUser: async (userId) => {
        const snap = await getDocs(query(collection(db, COL), where('userId', '==', userId)));
        const docs = snap.docs.sort((a, b) => (a.data().createdAt ?? '').localeCompare(b.data().createdAt ?? ''));
        set({
          companies: docs.map((d) => {
            const r = d.data();
            return { id: d.id, name: r.name, ico: r.ico, dic: r.dic, type: r.type, createdAt: r.createdAt, ownerId: r.userId };
          }),
        });
      },

      clearData: () => set({ companies: [] }),

      addCompany: (data) => {
        const userId = getLocalUserId();
        const company: Company = { ...data, ownerId: userId, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ companies: [...s.companies, company] }));
        setDoc(doc(db, COL, company.id), { userId, name: company.name, ico: company.ico, dic: company.dic, type: company.type, createdAt: company.createdAt })
          .catch((e) => console.error('company add:', e));
        return company;
      },

      updateCompany: (id, data) => {
        set((s) => ({ companies: s.companies.map((c) => c.id === id ? { ...c, ...data } : c) }));
        const patch: Record<string, unknown> = {};
        if (data.name !== undefined) patch.name = data.name;
        if (data.ico  !== undefined) patch.ico  = data.ico;
        if (data.dic  !== undefined) patch.dic  = data.dic;
        if (data.type !== undefined) patch.type = data.type;
        updateDoc(doc(db, COL, id), patch).catch((e) => console.error('company update:', e));
      },

      deleteCompany: (id) => {
        set((s) => ({ companies: s.companies.filter((c) => c.id !== id), activeCompanyId: s.activeCompanyId === id ? null : s.activeCompanyId }));
        deleteDoc(doc(db, COL, id)).catch((e) => console.error('company delete:', e));
      },

      setActiveCompany: (id) => set({ activeCompanyId: id }),
      getActiveCompany: () => { const { companies, activeCompanyId } = get(); return companies.find((c) => c.id === activeCompanyId); },
      getCompaniesForUser: (userId) => get().companies.filter((c) => c.ownerId === userId),
    }),
    { name: 'nelka_ui_prefs', storage: createJSONStorage(() => localStorage), partialize: (s) => ({ activeCompanyId: s.activeCompanyId }) }
  )
);
