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
provider.setCustomParameters({
  prompt: 'select_account'
});

export interface StoredGoogleUser {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  uid: string;
}

let isSigningIn = false;
let cachedAccessToken: string | null = typeof window !== 'undefined' ? localStorage.getItem('google_access_token') : null;
let cachedTokenExpiry: number = typeof window !== 'undefined' ? Number(localStorage.getItem('google_access_token_expiry') || '0') : 0;

export const getStoredGoogleUser = (): StoredGoogleUser | null => {
  if (typeof window === 'undefined') return null;
  const str = localStorage.getItem('google_user_profile');
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

const checkAndClearExpiredToken = (): boolean => {
  if (typeof window !== 'undefined') {
    cachedAccessToken = localStorage.getItem('google_access_token');
    cachedTokenExpiry = Number(localStorage.getItem('google_access_token_expiry') || '0');
    
    // Only clear if cachedTokenExpiry is specifically set and in the past
    if (cachedAccessToken && cachedTokenExpiry > 0 && Date.now() > cachedTokenExpiry) {
      cachedAccessToken = null;
      localStorage.removeItem('google_access_token');
      localStorage.removeItem('google_access_token_expiry');
      return true;
    }
  }
  return false;
};

export const initAuth = (
  onAuthSuccess?: (user: User | StoredGoogleUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Immediately check localStorage on mount so UI doesn't flicker or request re-auth
  const isExpired = checkAndClearExpiredToken();
  const storedUser = getStoredGoogleUser();
  if (cachedAccessToken && !isExpired && storedUser) {
    if (onAuthSuccess) onAuthSuccess(storedUser, cachedAccessToken);
  } else if (!cachedAccessToken) {
    if (onAuthFailure) onAuthFailure();
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    checkAndClearExpiredToken();
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (cachedAccessToken && storedUser) {
      // If Firebase session is pending/restoring but token is valid in storage, keep connected
      if (onAuthSuccess) onAuthSuccess(storedUser, cachedAccessToken);
    } else if (!cachedAccessToken) {
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
    // Set expiry to 3600 seconds (1 hour) from now
    cachedTokenExpiry = Date.now() + 3600 * 1000;
    if (typeof window !== 'undefined') {
      localStorage.setItem('google_access_token', cachedAccessToken);
      localStorage.setItem('google_access_token_expiry', cachedTokenExpiry.toString());
      localStorage.setItem('google_user_profile', JSON.stringify({
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        uid: result.user.uid
      }));
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

export const clearGoogleToken = () => {
  cachedAccessToken = null;
  cachedTokenExpiry = 0;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_access_token_expiry');
  }
};

export const logout = async () => {
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('Sign out error:', e);
  }
  clearGoogleToken();
  if (typeof window !== 'undefined') {
    localStorage.removeItem('google_user_profile');
  }
};
