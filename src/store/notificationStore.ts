import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface AppNotification {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  body: string;
  titleEn: string;
  bodyEn: string;
  companyId: string;
  createdAt: string;
  read: boolean;
  dismissedAt?: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  dismissNotification: (id: string) => void;
  getUnread: (companyId: string) => AppNotification[];
  getAll: (companyId: string) => AppNotification[];
  clearAll: (companyId: string) => void;
}

export const useNotificationStore = create<NotificationStore>()(
  persist(
    (set, get) => ({
      notifications: [],

      addNotification: (n) => {
        const notif: AppNotification = { ...n, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false };
        set((s) => ({ notifications: [notif, ...s.notifications] }));
      },

      markRead: (id) => {
        set((s) => ({ notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n) }));
      },

      dismissNotification: (id) => {
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.id === id ? { ...n, dismissedAt: new Date().toISOString(), read: true } : n
          ),
        }));
      },

      getUnread: (companyId) =>
        get().notifications.filter((n) => n.companyId === companyId && !n.read && !n.dismissedAt),

      getAll: (companyId) =>
        get().notifications.filter((n) => n.companyId === companyId && !n.dismissedAt),

      clearAll: (companyId) => {
        set((s) => ({ notifications: s.notifications.filter((n) => n.companyId !== companyId) }));
      },
    }),
    { name: 'nelka_notifications', storage: createJSONStorage(() => localStorage) }
  )
);
