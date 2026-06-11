import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, SHARED_ID } from './firebase';

// VAPID public key — verejná časť páru, súkromný kľúč je v GitHub Actions secret VAPID_PRIVATE_KEY
export const VAPID_PUBLIC_KEY = 'BDzx2SrNCSUYQMvZWEY4a5YCjTh2PqpFsL0zND42N9x05bWq9xb71JnjPFRHjjRly5ukPQaJBnTmnlsm4E-duvg';

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
    await setDoc(doc(db, 'push_subscriptions', endpointDocId(sub.endpoint)), {
      userId: SHARED_ID,
      endpoint: sub.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? '', auth: json.keys?.auth ?? '' },
      lang: localStorage.getItem('nelka_lang') || 'sk',
      userAgent: navigator.userAgent,
      updatedAt: new Date().toISOString(),
    });
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
  } catch (e) {
    console.error('push unsubscribe:', e);
  }
}
