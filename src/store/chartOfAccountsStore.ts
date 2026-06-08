import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';

export interface Account {
  code: string;
  name: string;
  type: AccountType;
  class: number;
}

export const DEFAULT_ACCOUNTS: Account[] = [
  { code: '013', name: 'Softvér', type: 'asset', class: 0 },
  { code: '021', name: 'Stavby', type: 'asset', class: 0 },
  { code: '022', name: 'Samostatné hnuteľné veci', type: 'asset', class: 0 },
  { code: '112', name: 'Materiál na sklade', type: 'asset', class: 1 },
  { code: '132', name: 'Tovar na sklade', type: 'asset', class: 1 },
  { code: '211', name: 'Pokladnica', type: 'asset', class: 2 },
  { code: '221', name: 'Bankové účty', type: 'asset', class: 2 },
  { code: '261', name: 'Peniaze na ceste', type: 'asset', class: 2 },
  { code: '311', name: 'Odberatelia', type: 'asset', class: 3 },
  { code: '321', name: 'Dodávatelia', type: 'liability', class: 3 },
  { code: '331', name: 'Zamestnanci', type: 'liability', class: 3 },
  { code: '341', name: 'Daň z príjmov', type: 'liability', class: 3 },
  { code: '343', name: 'DPH', type: 'liability', class: 3 },
  { code: '365', name: 'Záväzky zo sociálneho poistenia', type: 'liability', class: 3 },
  { code: '411', name: 'Základné imanie', type: 'equity', class: 4 },
  { code: '428', name: 'Nerozdelený zisk minulých rokov', type: 'equity', class: 4 },
  { code: '431', name: 'Výsledok hospodárenia', type: 'equity', class: 4 },
  { code: '501', name: 'Spotreba materiálu', type: 'expense', class: 5 },
  { code: '502', name: 'Spotreba energie', type: 'expense', class: 5 },
  { code: '511', name: 'Opravy a udržiavanie', type: 'expense', class: 5 },
  { code: '513', name: 'Náklady na reprezentáciu', type: 'expense', class: 5 },
  { code: '518', name: 'Ostatné služby', type: 'expense', class: 5 },
  { code: '521', name: 'Mzdové náklady', type: 'expense', class: 5 },
  { code: '524', name: 'Zákonné sociálne poistenie', type: 'expense', class: 5 },
  { code: '531', name: 'Daň z motorových vozidiel', type: 'expense', class: 5 },
  { code: '548', name: 'Ostatné náklady', type: 'expense', class: 5 },
  { code: '551', name: 'Odpisy', type: 'expense', class: 5 },
  { code: '562', name: 'Úroky', type: 'expense', class: 5 },
  { code: '601', name: 'Tržby za vlastné výrobky', type: 'revenue', class: 6 },
  { code: '602', name: 'Tržby z predaja služieb', type: 'revenue', class: 6 },
  { code: '604', name: 'Tržby za tovar', type: 'revenue', class: 6 },
  { code: '641', name: 'Tržby z predaja majetku', type: 'revenue', class: 6 },
  { code: '648', name: 'Ostatné výnosy', type: 'revenue', class: 6 },
  { code: '662', name: 'Úrokové výnosy', type: 'revenue', class: 6 },
];

interface ChartStore {
  accounts: Record<string, Account[]>;
  getAccounts: (companyId: string) => Account[];
  addAccount: (companyId: string, account: Account) => void;
  initCompany: (companyId: string) => void;
}

export const useChartStore = create<ChartStore>()(
  persist(
    (set, get) => ({
      accounts: {},
      getAccounts: (companyId) => get().accounts[companyId] ?? DEFAULT_ACCOUNTS,
      initCompany: (companyId) => {
        if (!get().accounts[companyId])
          set((s) => ({ accounts: { ...s.accounts, [companyId]: [...DEFAULT_ACCOUNTS] } }));
      },
      addAccount: (companyId, account) => {
        set((s) => ({
          accounts: { ...s.accounts, [companyId]: [...(s.accounts[companyId] ?? DEFAULT_ACCOUNTS), account] },
        }));
      },
    }),
    { name: 'nelka_chart', storage: createJSONStorage(() => localStorage) }
  )
);
