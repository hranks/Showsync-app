import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User
} from 'firebase/auth';

import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Explicitly configure persistence so cross-origin popups maintain state
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Could not set browserLocalPersistence:', err);
  });
}

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.setCustomParameters({
  prompt: 'select_account'
});

export interface StoredGoogleUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

// Both tokens live strictly in JS memory (never in localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;
let appSessionToken: string | null = null;

export const setAppSessionToken = (token: string | null) => {
  appSessionToken = token;
};

export const getAppSessionToken = (): string | null => {
  return appSessionToken;
};

export const getStoredGoogleUser = (): StoredGoogleUser | null => {
  if (!auth.currentUser) return null;
  return {
    displayName: auth.currentUser.displayName,
    email: auth.currentUser.email,
    photoURL: auth.currentUser.photoURL,
    uid: auth.currentUser.uid,
  };
};

const checkAndClearExpiredToken = (): boolean => {
  if (cachedAccessToken && cachedTokenExpiry > 0 && Date.now() > cachedTokenExpiry) {
    cachedAccessToken = null;
    cachedTokenExpiry = 0;
    return true;
  }
  return false;
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    checkAndClearExpiredToken();
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (!user && !isSigningIn) {
      cachedAccessToken = null;
      cachedTokenExpiry = 0;
      if (onAuthFailure) onAuthFailure();
    } else if (!cachedAccessToken && !isSigningIn) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{
  user: User;
  accessToken: string;
  idToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google.');
    }

    const idToken = await result.user.getIdToken();
    cachedAccessToken = credential.accessToken;
    cachedTokenExpiry = Date.now() + 3500 * 1000;

    return { user: result.user, accessToken: cachedAccessToken, idToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    const msg = error?.message || '';
    const code = error?.code || '';

    if (msg.includes('missing initial state') || msg.includes('sessionStorage') || code === 'auth/missing-initial-state') {
      throw new Error(
        'El navegador bloqueó el almacenamiento de la sesión (sessionStorage o cookies de terceros). ' +
        'Esto ocurre frecuentemente al usar modo incógnito, bloqueadores de anuncios (como Brave Shields o uBlock), ' +
        'o cuando la ventana emergente no puede compartir estado con la aplicación. ' +
        'Por favor, abre la app en una pestaña normal (no incógnito) y desactiva el bloqueo de cookies para este sitio.'
      );
    }

    if (code === 'auth/popup-blocked') {
      throw new Error('La ventana emergente de inicio de sesión fue bloqueada por tu navegador. Por favor permite las ventanas emergentes (popups) para este sitio.');
    }

    if (code === 'auth/popup-closed-by-user') {
      throw new Error('Cerraste la ventana de Google antes de finalizar el inicio de sesión.');
    }

    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  checkAndClearExpiredToken();
  return cachedAccessToken;
};

export const clearGoogleToken = () => {
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('Sign out error:', e);
  }
  clearGoogleToken();
  appSessionToken = null;
};

/**
 * Restores app session token in memory using active Firebase user ID token if available.
 */
export const restoreSessionFromFirebase = async (): Promise<string | null> => {
  if (appSessionToken) return appSessionToken;
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  try {
    const idToken = await currentUser.getIdToken();
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({})
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.sessionToken) {
      appSessionToken = data.sessionToken;
      return appSessionToken;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Authenticated fetch wrapper that injects the in-memory Bearer session token.
 */
export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  if (!appSessionToken) {
    await restoreSessionFromFirebase();
  }

  const headers = new Headers(init.headers || {});
  if (appSessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${appSessionToken}`);
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 && auth.currentUser) {
    // Attempt one silent session refresh via Firebase ID token
    appSessionToken = null;
    const refreshed = await restoreSessionFromFirebase();
    if (refreshed) {
      const retryHeaders = new Headers(init.headers || {});
      retryHeaders.set('Authorization', `Bearer ${refreshed}`);
      return fetch(input, { ...init, headers: retryHeaders });
    }
  }

  return response;
};
