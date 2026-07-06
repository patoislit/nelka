import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  collection, doc, setDoc, updateDoc, deleteDoc, query, where,
} from 'firebase/firestore';
import { db, getLocalUserId, listen } from '../lib/firebase';

let unsubCompanies: (() => void) | null = null;

export type AccountingType = 'simple' | 'double';

export interface Company {
  id: string;
  name: string;
  ico: string;
  dic: string;
  type: AccountingType;
  createdAt: string;
  ownerId: string;
  address?: string;
  city?: string;
  zip?: string;
  email?: string;
  phone?: string;
  iban?: string;
  bank?: string;
  logoDataUrl?: string;
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

      loadForUser: (userId) => {
        // realtime — zmeny z iného zariadenia sa prejavia okamžite
        unsubCompanies?.();
        const { ready, unsub } = listen(query(collection(db, COL), where('userId', '==', userId)), (snap) => {
          const docs = [...snap.docs].sort((a, b) => (a.data().createdAt ?? '').localeCompare(b.data().createdAt ?? ''));
          set({
            companies: docs.map((d) => {
              const r = d.data();
              return {
                id: d.id, name: r.name, ico: r.ico, dic: r.dic, type: r.type, createdAt: r.createdAt, ownerId: r.userId,
                address: r.address, city: r.city, zip: r.zip, email: r.email, phone: r.phone,
                iban: r.iban, bank: r.bank, logoDataUrl: r.logoDataUrl,
              };
            }),
          });
        });
        unsubCompanies = unsub;
        return ready;
      },

      clearData: () => {
        unsubCompanies?.(); unsubCompanies = null;
        set({ companies: [] });
      },

      addCompany: (data) => {
        const userId = getLocalUserId();
        const company: Company = { ...data, ownerId: userId, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
        set((s) => ({ companies: [...s.companies, company] }));
        setDoc(doc(db, COL, company.id), {
          userId, name: company.name, ico: company.ico, dic: company.dic, type: company.type, createdAt: company.createdAt,
          address: company.address ?? null, city: company.city ?? null, zip: company.zip ?? null,
          email: company.email ?? null, phone: company.phone ?? null, iban: company.iban ?? null,
          bank: company.bank ?? null, logoDataUrl: company.logoDataUrl ?? null,
        })
          .catch((e) => console.error('company add:', e));
        return company;
      },

      updateCompany: (id, data) => {
        set((s) => ({ companies: s.companies.map((c) => c.id === id ? { ...c, ...data } : c) }));
        const patch: Record<string, unknown> = {};
        if (data.name    !== undefined) patch.name    = data.name;
        if (data.ico     !== undefined) patch.ico     = data.ico;
        if (data.dic     !== undefined) patch.dic     = data.dic;
        if (data.type    !== undefined) patch.type    = data.type;
        if (data.address !== undefined) patch.address = data.address;
        if (data.city    !== undefined) patch.city    = data.city;
        if (data.zip     !== undefined) patch.zip     = data.zip;
        if (data.email   !== undefined) patch.email   = data.email;
        if (data.phone   !== undefined) patch.phone   = data.phone;
        if (data.iban    !== undefined) patch.iban    = data.iban;
        if (data.bank    !== undefined) patch.bank    = data.bank;
        if (data.logoDataUrl !== undefined) patch.logoDataUrl = data.logoDataUrl;
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
