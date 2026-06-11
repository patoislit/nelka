// Tracks which notifications were already shown this browser session (prevents spam on re-renders)
const _shownThisSession = new Set<string>();

export function showBrowserNotification(title: string, body: string): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const key = `${title}::${body}`;
  if (_shownThisSession.has(key)) return;
  _shownThisSession.add(key);
  try {
    new Notification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });
  } catch {
    // Safari / restricted contexts may throw
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  return Notification.requestPermission();
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}
