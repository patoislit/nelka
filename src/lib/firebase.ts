import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
