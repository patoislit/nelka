import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface SettingsStore {
  showTooltips: boolean;
  notifyErrors: boolean;
  notifyDeadlines: boolean;
  notifyBrowser: boolean;
  setShowTooltips: (v: boolean) => void;
  setNotifyErrors: (v: boolean) => void;
  setNotifyDeadlines: (v: boolean) => void;
  setNotifyBrowser: (v: boolean) => void;
  resetHints: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      showTooltips: true,
      notifyErrors: true,
      notifyDeadlines: true,
      notifyBrowser: false,
      setShowTooltips: (v) => set({ showTooltips: v }),
      setNotifyErrors: (v) => set({ notifyErrors: v }),
      setNotifyDeadlines: (v) => set({ notifyDeadlines: v }),
      setNotifyBrowser: (v) => set({ notifyBrowser: v }),
      resetHints: () => set({ showTooltips: true }),
    }),
    { name: 'nelka_settings', storage: createJSONStorage(() => localStorage) }
  )
);
