import localforage from 'localforage';
import { createJSONStorage } from 'zustand/middleware';

// Configure localforage to use IndexedDB (falls back to WebSQL, then localStorage)
localforage.config({
  driver: [localforage.INDEXEDDB, localforage.WEBSQL, localforage.LOCALSTORAGE],
  name: 'Nelka',
  version: 1.0,
  storeName: 'nelka_db',
  description: 'Nelka účtovná databáza',
});

// Zustand-compatible async storage backed by IndexedDB
const lfStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const val = await localforage.getItem<string>(name);
    return val ?? null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await localforage.setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await localforage.removeItem(name);
  },
};

export const dbStorage = createJSONStorage(() => lfStorage);
