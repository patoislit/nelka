import { initializeApp } from 'firebase/app';
import { getFirestore, onSnapshot } from 'firebase/firestore';
import type { Query, QuerySnapshot, DocumentData } from 'firebase/firestore';

// Firebase config — tieto hodnoty NIE SÚ tajné, sú súčasťou verejného JS bundle
// Bezpečnosť je riešená cez Firestore Security Rules
const firebaseConfig = {
  apiKey:            'AIzaSyBTJpr785xyYjqHjrsNpqN0g9zSl8ahxAQ',
  authDomain:        'nelka-87b28.firebaseapp.com',
  projectId:         'nelka-87b28',
  storageBucket:     'nelka-87b28.firebasestorage.app',
  messagingSenderId: '289460063694',
  appId:             '1:289460063694:web:fc269935bdc741521c2f9f',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// ── Shared workspace ID – all users see the same data ─────────────────────────
export const SHARED_ID = 'nelka-shared';

export function getLocalUserId(): string {
  return SHARED_ID;
}

// ── Local display name ─────────────────────────────────────────────────────────
export function getDisplayName(): string | null {
  return localStorage.getItem('nelka_name');
}
export function setDisplayName(name: string): void {
  localStorage.setItem('nelka_name', name.trim());
}

// ── Realtime odber ──────────────────────────────────────────────────────────────
/**
 * Prihlási realtime listener na query. `apply` sa zavolá pri každej zmene
 * (aj zo iného zariadenia — okamžitá synchronizácia). Vrátená `ready` promise
 * sa vyrieši po prvom načítaní (zlyhanie prvého = reject, nech appka ukáže chybu).
 */
export function listen(
  q: Query<DocumentData>,
  apply: (snap: QuerySnapshot<DocumentData>) => void,
): { ready: Promise<void>; unsub: () => void } {
  let resolveFn: () => void = () => {};
  let rejectFn: (e: unknown) => void = () => {};
  const ready = new Promise<void>((res, rej) => { resolveFn = res; rejectFn = rej; });
  let first = true;

  const unsub = onSnapshot(q, (snap) => {
    apply(snap);
    if (first) { first = false; resolveFn(); }
  }, (err) => {
    console.error('onSnapshot:', err);
    if (first) { first = false; rejectFn(err); }
  });

  return { ready, unsub };
}
