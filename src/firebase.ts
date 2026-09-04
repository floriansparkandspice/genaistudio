import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
} from 'firebase/firestore';
import { SiteConfig } from './types';
import { DEFAULT_SITE_CONFIG } from './defaultData';

export const firebaseConfig = {
  apiKey: "AIzaSyC1-9CFyVzfrXfXlPscs9UQ5so7AcAArLI",
  authDomain: "genai-studio-one.firebaseapp.com",
  projectId: "genai-studio-one",
  storageBucket: "genai-studio-one.firebasestorage.app",
  messagingSenderId: "773340105935",
  appId: "1:773340105935:web:8315b78045bccea8443bba",
  measurementId: "G-R5CTJ5CW13",
};

// Initialize Firebase
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);

// Google Auth Provider (Google Login only)
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

const CONFIG_DOC_PATH = 'settings/siteConfig';
const LOCAL_STORAGE_KEY = 'genai_studio_site_config';

export async function loginWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

/**
 * 1. Zentraler Admin-Check nach dem Google-Login:
 * Prüft, ob in der Collection 'admins' ein Dokument existiert,
 * dessen Document-ID genau der E-Mail-Adresse des Nutzers entspricht:
 * db.collection('admins').doc(user.email).get()
 */
export async function checkIsAdmin(email: string): Promise<{ exists: boolean; data?: any }> {
  if (!email) return { exists: false };
  try {
    const adminDocRef = doc(db, 'admins', email);
    const adminDocSnap = await getDoc(adminDocRef);
    if (adminDocSnap.exists()) {
      return { exists: true, data: adminDocSnap.data() };
    }

    // Zusätzlicher Fallback: Falls die E-Mail in Firestore kleingeschrieben hinterlegt wurde
    const lower = email.toLowerCase();
    if (lower !== email) {
      const lowerRef = doc(db, 'admins', lower);
      const lowerSnap = await getDoc(lowerRef);
      if (lowerSnap.exists()) {
        return { exists: true, data: lowerSnap.data() };
      }
    }

    return { exists: false };
  } catch (error) {
    console.error(`Fehler bei der Admin-Prüfung in Firestore (admins/${email}):`, error);
    return { exists: false };
  }
}

/**
 * 2. Lade Brand-Colors, Schriften und Content-Daten aus Firestore
 */
export async function loadSiteConfigFromFirestore(): Promise<SiteConfig | null> {
  try {
    let docRef = doc(db, 'site_settings', 'main');
    let docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      docRef = doc(db, 'settings', 'siteConfig');
      docSnap = await getDoc(docRef);
    }
    if (docSnap.exists()) {
      const cloudData = docSnap.data() as Partial<SiteConfig>;
      const merged: SiteConfig = {
        ...DEFAULT_SITE_CONFIG,
        ...cloudData,
        theme: { ...DEFAULT_SITE_CONFIG.theme, ...cloudData.theme },
        segments: { ...DEFAULT_SITE_CONFIG.segments, ...cloudData.segments },
        team: Array.isArray(cloudData.team) && cloudData.team.length ? cloudData.team : DEFAULT_SITE_CONFIG.team,
      };
      saveLocalConfig(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Konnte Konfiguration nicht direkt aus Firestore laden:', err);
  }
  return null;
}

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function loadLocalConfig(): SiteConfig {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SITE_CONFIG,
        ...parsed,
        theme: { ...DEFAULT_SITE_CONFIG.theme, ...parsed.theme },
        segments: { ...DEFAULT_SITE_CONFIG.segments, ...parsed.segments },
        team: Array.isArray(parsed.team) && parsed.team.length ? parsed.team : DEFAULT_SITE_CONFIG.team,
      };
    }
  } catch (err) {
    console.warn('Could not read from local storage:', err);
  }
  return DEFAULT_SITE_CONFIG;
}

export function saveLocalConfig(config: SiteConfig): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Could not write to local storage:', err);
  }
}

export function subscribeToSiteConfig(
  onConfigUpdated: (config: SiteConfig) => void,
  onError?: (err: Error) => void
) {
  const docRef = doc(db, 'site_settings', 'main');

  // First deliver cached/local immediately
  const local = loadLocalConfig();
  onConfigUpdated(local);

  // Then subscribe to live Firestore document
  try {
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const cloudData = docSnap.data() as Partial<SiteConfig>;
          const merged: SiteConfig = {
            ...DEFAULT_SITE_CONFIG,
            ...cloudData,
            theme: { ...DEFAULT_SITE_CONFIG.theme, ...cloudData.theme },
            segments: { ...DEFAULT_SITE_CONFIG.segments, ...cloudData.segments },
            team: Array.isArray(cloudData.team) && cloudData.team.length ? cloudData.team : DEFAULT_SITE_CONFIG.team,
          };
          saveLocalConfig(merged);
          onConfigUpdated(merged);
        } else {
          // If no doc exists yet in Firestore, save defaults
          console.info('No config in Firestore yet, using defaults.');
        }
      },
      (error) => {
        console.warn('Firestore subscription error (fallback to local data):', error);
        if (onError) onError(error);
      }
    );

    return unsubscribe;
  } catch (e) {
    console.warn('Failed to attach Firestore listener:', e);
    return () => {};
  }
}

export async function saveSiteConfigToFirebase(config: SiteConfig, user?: User | null): Promise<void> {
  // Always save locally first for instant snappy response
  const updatedConfig: SiteConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: user?.email || user?.displayName || 'Admin',
  };
  saveLocalConfig(updatedConfig);

  // Save to Firestore
  try {
    const docRef = doc(db, 'site_settings', 'main');
    await setDoc(docRef, updatedConfig, { merge: true });
    console.info('Successfully saved site config to Firestore');
  } catch (err: any) {
    console.error('Error saving to Firestore:', err);
    throw err;
  }
}
