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
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { SiteConfig } from './types';
import { DEFAULT_SITE_CONFIG, normalizeSiteConfig } from './defaultData';

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
export const storage = getStorage(app);

// Export Storage SDK primitives
export { ref, uploadBytes, getDownloadURL };

/**
 * Lädt eine Bilddatei mit dem firebase/storage SDK per ref() und uploadBytes()
 * in den Ordner 'images/' im Firebase Storage hoch und liefert die Download-URL von getDownloadURL().
 */
export async function uploadImageToStorage(
  file: File,
  folder: string = 'images'
): Promise<string> {
  const timestamp = Date.now();
  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `${folder}/${timestamp}_${cleanName}`;
  const storageRef = ref(storage, filePath);

  const metadata = {
    contentType: file.type || 'image/jpeg',
  };

  const snapshot = await uploadBytes(storageRef, file, metadata);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

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

export interface AdminCheckResult {
  exists: boolean;
  data?: any;
  error?: string;
}

/**
 * 1. Zentraler Admin-Check nach dem Google-Login:
 * Prüft, ob in der Collection 'admins' ein Dokument existiert,
 * dessen Document-ID genau der E-Mail-Adresse des Nutzers entspricht:
 * db.collection('admins').doc(user.email).get()
 */
export async function checkIsAdmin(email: string): Promise<AdminCheckResult> {
  if (!email) return { exists: false, error: 'Keine E-Mail-Adresse im Google-Konto gefunden.' };
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
  } catch (error: any) {
    console.error(`Fehler bei der Admin-Prüfung in Firestore (admins/${email}):`, error);
    let errorMsg = error?.message || 'Unbekannter Firestore-Fehler';
    if (error?.code === 'permission-denied') {
      errorMsg = 'Firestore-Berechtigung verweigert: Sicherheitsregeln blockieren den Lesezugriff auf "admins".';
    }
    return { exists: false, error: errorMsg };
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
      const merged = normalizeSiteConfig(cloudData);
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
      return normalizeSiteConfig(parsed);
    }
  } catch (err) {
    console.warn('Could not read from local storage:', err);
  }
  return JSON.parse(JSON.stringify(DEFAULT_SITE_CONFIG));
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
          const merged = normalizeSiteConfig(cloudData);
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
