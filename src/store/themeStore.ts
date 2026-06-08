import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

function applyThemeToDOM(mode: ThemeMode) {
  const dark =
    mode === 'dark' ||
    (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Body class for CSS background (fills safe-area behind status bar)
  document.body.classList.toggle('dark-mode', dark);

  // theme-color meta tag (Android status bar + PWA chrome)
  const meta = document.getElementById('theme-color-meta') as HTMLMetaElement | null;
  if (meta) meta.content = dark ? '#0c0c0e' : '#ffffff';
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      mode: 'light',
      setMode: (mode) => {
        set({ mode });
        applyThemeToDOM(mode);
      },
    }),
    {
      name: 'nelka_theme',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeToDOM(state.mode);
      },
    }
  )
);

export function useDark(): boolean {
  const mode = useThemeStore((s) => s.mode);
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
