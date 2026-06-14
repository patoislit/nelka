import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, SHARED_ID } from './firebase';

// VAPID public key — verejná časť páru. Súkromný kľúč je vo Firebase Secret Manager
// (secret VAPID_PRIVATE_KEY) a používa ho Cloud Function functions/index.js (businessAlerts).
export const VAPID_PUBLIC_KEY = 'BDMHxhszk0BhHw9Hge_AAQgEAPLCDqn7m0vBavnfIpViM5824wPE-J1_y5eM5tppWsWOFTszAZoxMHkDLawdTag';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

function endpointDocId(endpoint: string): string {
  // djb2 hash — stable doc id per device/endpoint
  let h1 = 5381, h2 = 52711;
  for (let i = 0; i < endpoint.length; i++) {
    const c = endpoint.charCodeAt(i);
    h1 = ((h1 * 33) ^ c) >>> 0;
    h2 = ((h2 * 33) ^ c) >>> 0;
  }
  return `sub_${h1.toString(16)}${h2.toString(16)}`;
}

const ORIGIN_KEY = 'nelka_push_sub_id';

/**
 * ID push prihlásenia tohto zariadenia (ak má zapnuté notifikácie), inak ''.
 * Pri vytvorení záznamu sa ním označí `_origin` — Cloud Function potom pošle
 * upozornenie na VŠETKY zariadenia okrem toho, kde sa zmena spravila.
 */
export function deviceOrigin(): string {
  try { return localStorage.getItem(ORIGIN_KEY) || ''; } catch { return ''; }
}

function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  // navigator.serviceWorker.ready never resolves when no SW is registered (dev mode, Electron)
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
  ]);
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Subscribes this device to push and saves the subscription to Firestore. */
export async function ensurePushSubscription(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await getRegistration();
    if (!reg) return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
    const json = sub.toJSON();
    const subId = endpointDocId(sub.endpoint);
    await setDoc(doc(db, 'push_subscriptions', subId), {
      userId: SHARED_ID,
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
      lang: localStorage.getItem('nelka_lang') || 'sk',
      userAgent: navigator.userAgent,
      updatedAt: new Date().toISOString(),
    });
    try { localStorage.setItem(ORIGIN_KEY, subId); } catch { /* ignore */ }
    return true;
  } catch (e) {
    console.error('push subscribe:', e);
    return false;
  }
}

/** Unsubscribes this device and removes the subscription from Firestore. */
export async function removePushSubscription(): Promise<void> {
  if (!isPushSupported()) return;
  try {
    const reg = await getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await deleteDoc(doc(db, 'push_subscriptions', endpointDocId(sub.endpoint))).catch(() => {});
      await sub.unsubscribe();
    }
    try { localStorage.removeItem(ORIGIN_KEY); } catch { /* ignore */ }
  } catch (e) {
    console.error('push unsubscribe:', e);
  }
}
