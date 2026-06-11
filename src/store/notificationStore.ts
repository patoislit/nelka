import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { showBrowserNotification } from '../utils/browserNotifications';

function isBrowserNotifyEnabled(): boolean {
  try {
    const raw = localStorage.getItem('nelka_settings');
    if (!raw) return false;
    return JSON.parse(raw)?.state?.notifyBrowser === true;
  } catch { return false; }
}

function currentLang(): string {
  return localStorage.getItem('nelka_lang') || 'sk';
}

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
        // Deduplicate: skip if same notification was added in the last 24 hours
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        const duplicate = get().notifications.find(
          (x) =>
            x.companyId === n.companyId &&
            x.title === n.title &&
            x.body === n.body &&
            !x.dismissedAt &&
            new Date(x.createdAt).getTime() > cutoff
        );
        if (duplicate) return;

        const notif: AppNotification = { ...n, id: crypto.randomUUID(), createdAt: new Date().toISOString(), read: false };
        set((s) => ({ notifications: [notif, ...s.notifications] }));

        if (isBrowserNotifyEnabled()) {
          const lang = currentLang();
          const title = lang === 'en' ? n.titleEn : n.title;
          const body = lang === 'en' ? n.bodyEn : n.body;
          showBrowserNotification(title, body);
        }
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
