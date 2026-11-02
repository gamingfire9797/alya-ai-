import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import {
  firebaseAuth,
  checkFirebaseDomainAuthorization,
} from './authService';

// Reuse shared Firebase Auth instance
export const auth = firebaseAuth;

// Google Workspace Presentation scope for Google Slides API
export const PRESENTATIONS_SCOPE = 'https://www.googleapis.com/auth/presentations';
export const SCOPES = [PRESENTATIONS_SCOPE];

const provider = new GoogleAuthProvider();
provider.addScope(PRESENTATIONS_SCOPE);
provider.setCustomParameters({
  prompt: 'select_account',
});

// Flag to indicate ongoing sign-in
let isSigningIn = false;
// Cached access token in memory ONLY (never localStorage or sessionStorage)
let cachedAccessToken: string | null = null;

/**
 * Initialize auth state listener. Clears cached token when signed out.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void,
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Token not in memory; user needs interactive sign-in to obtain fresh OAuth access token
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Interactive Sign-in with Google to obtain user and OAuth access token
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google Slides access token from authentication.');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    if (String(error?.code || '') === 'auth/unauthorized-domain') {
      const diag = await checkFirebaseDomainAuthorization();
      const customErr: any = new Error(
        `Domain "${diag.currentHostname}" is not yet authorized in Firebase Authentication (${diag.projectId}). Add "${diag.currentHostname}" in Firebase Console -> Authentication -> Settings -> Authorized domains.`,
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.diagnostics = diag;
      throw customErr;
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Retrieves the in-memory access token
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Sign out and clear in-memory token
 */
export const logout = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};
