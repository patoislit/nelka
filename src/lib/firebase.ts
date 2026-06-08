import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
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
