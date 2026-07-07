import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';

// We get this configuration from firebase-applet-config.json
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Workspace scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null;
let cachedTokenExpiry: number = typeof window !== 'undefined' ? Number(localStorage.getItem('google_access_token_expiry') || '0') : 0;

const checkAndClearExpiredToken = () => {
  if (typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem('google_access_token');
    cachedTokenExpiry = Number(localStorage.getItem('google_access_token_expiry') || '0');
    
    // Google tokens usually last 1 hour. If it's expired (or near expiration), clear it.
    if (cachedAccessToken && (Date.now() > cachedTokenExpiry || cachedTokenExpiry === 0)) {
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_access_token_expiry');
    }
  }
};

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  checkAndClearExpiredToken();

  return onAuthStateChanged(auth, async (user: User | null) => {
    checkAndClearExpiredToken();
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem('google_access_token');
          localStorage.removeItem('google_access_token_expiry');
        }
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('google_access_token');
        localStorage.removeItem('google_access_token_expiry');
      }
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    // Set expiry to 3540 seconds (59 minutes) from now to be safe
    cachedTokenExpiry = Date.now() + 3540 * 1000;
    if (typeof window !== 'undefined') {
      localStorage.setItem('google_access_token', cachedAccessToken);
      localStorage.setItem('google_access_token_expiry', cachedTokenExpiry.toString());
    }
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  checkAndClearExpiredToken();
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_access_token_expiry');
  }
};
