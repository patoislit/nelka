import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthStore {
  user: User;
  updateProfile: (data: Partial<Pick<User, 'name' | 'email'>>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: { id: 'local', name: 'Používateľ', email: '' },
      updateProfile: (data) => set((s) => ({ user: { ...s.user, ...data } })),
    }),
    { name: 'nelka_auth', storage: createJSONStorage(() => localStorage) }
  )
);
