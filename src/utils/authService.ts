import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updatePassword,
  deleteUser,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { isPackagedNativeOrigin } from './apiConfig';

export const firebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firebaseAuth = getAuth(firebaseApp);

const googleIdentityProvider = new GoogleAuthProvider();
googleIdentityProvider.addScope('profile');
googleIdentityProvider.addScope('email');
googleIdentityProvider.setCustomParameters({
  prompt: 'select_account',
});

export interface GoogleIdentityPayload {
  idToken: string;
  firebaseUid: string;
  googleSub: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  photoURL: string;
}

export interface RequiredDomainEntry {
  domain: string;
  label: string;
  isAuthorized: boolean;
}

export interface FirebaseDomainDiagnostics {
  checked: boolean;
  isCurrentDomainAuthorized: boolean;
  currentHostname: string;
  currentOrigin: string;
  projectId: string;
  authDomain: string;
  oAuthClientId: string;
  authorizedDomains: string[];
  requiredDomains: RequiredDomainEntry[];
  missingDomains: RequiredDomainEntry[];
  firebaseConsoleUrl: string;
  gcpCredentialsUrl: string;
}

export function getRequiredFirebaseDomains(): { domain: string; label: string }[] {
  const hostname =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost';

  const domains: { domain: string; label: string }[] = [];
  const addUnique = (domain: string, label: string) => {
    if (domain && !domains.some((d) => d.domain === domain)) {
      domains.push({ domain, label });
    }
  };

  // 1. Current active hostname
  if (hostname.startsWith('ais-dev-')) {
    addUnique(hostname, 'Current Preview Domain (Dev)');
    addUnique(hostname.replace(/^ais-dev-/, 'ais-pre-'), 'Production / Shared App Domain');
    addUnique(hostname.replace(/^ais-dev-/, 'ais-mob-'), 'Mobile Preview Domain');
  } else if (hostname.startsWith('ais-pre-')) {
    addUnique(hostname, 'Current Production / Shared Domain');
    addUnique(hostname.replace(/^ais-pre-/, 'ais-dev-'), 'Preview Domain (Dev)');
    addUnique(hostname.replace(/^ais-pre-/, 'ais-mob-'), 'Mobile Preview Domain');
  } else if (hostname !== 'localhost') {
    addUnique(hostname, 'Current Application Domain');
  }

  // 2. Always include localhost for Capacitor Android WebView (https://localhost) and local dev
  addUnique('localhost', 'Android APK WebView & Localhost');

  return domains;
}

export async function checkFirebaseDomainAuthorization(): Promise<FirebaseDomainDiagnostics> {
  const currentHostname =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost';
  const currentOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://localhost';
  const projectId = firebaseConfig?.projectId || '';
  const authDomain = firebaseConfig?.authDomain || '';
  const oAuthClientId = (firebaseConfig as any)?.oAuthClientId || '';
  const firebaseConsoleUrl = projectId
    ? `https://console.firebase.google.com/project/${projectId}/authentication/settings`
    : 'https://console.firebase.google.com/';
  const gcpCredentialsUrl = projectId
    ? `https://console.cloud.google.com/apis/credentials?project=${projectId}`
    : 'https://console.cloud.google.com/apis/credentials';

  const requiredSpecs = getRequiredFirebaseDomains();

  try {
    const res = await fetch(
      `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig?key=${encodeURIComponent(
        firebaseConfig.apiKey,
      )}`,
      { method: 'GET', cache: 'no-store' },
    );

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    const authorizedDomains: string[] = Array.isArray(data?.authorizedDomains)
      ? data.authorizedDomains
      : [];

    const isCurrentDomainAuthorized = authorizedDomains.includes(currentHostname);
    const requiredDomains: RequiredDomainEntry[] = requiredSpecs.map((spec) => ({
      ...spec,
      isAuthorized: authorizedDomains.includes(spec.domain),
    }));
    const missingDomains = requiredDomains.filter((d) => !d.isAuthorized);

    return {
      checked: true,
      isCurrentDomainAuthorized,
      currentHostname,
      currentOrigin,
      projectId,
      authDomain,
      oAuthClientId,
      authorizedDomains,
      requiredDomains,
      missingDomains,
      firebaseConsoleUrl,
      gcpCredentialsUrl,
    };
  } catch {
    const requiredDomains: RequiredDomainEntry[] = requiredSpecs.map((spec) => ({
      ...spec,
      isAuthorized: false,
    }));
    return {
      checked: false,
      isCurrentDomainAuthorized: true,
      currentHostname,
      currentOrigin,
      projectId,
      authDomain,
      oAuthClientId,
      authorizedDomains: [],
      requiredDomains,
      missingDomains: requiredDomains,
      firebaseConsoleUrl,
      gcpCredentialsUrl,
    };
  }
}

export function getGoogleAuthStatus(): {
  configured: boolean;
  projectId: string;
  authDomain: string;
  oAuthClientId: string;
  currentHostname: string;
  currentOrigin: string;
  isNativeWebView: boolean;
  setupNotice?: string;
} {
  const configured = Boolean(
    firebaseConfig?.apiKey &&
      firebaseConfig?.projectId &&
      firebaseConfig?.authDomain,
  );
  const isNativeWebView = isPackagedNativeOrigin();
  const currentHostname =
    typeof window !== 'undefined' && window.location?.hostname
      ? window.location.hostname
      : 'localhost';
  const currentOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://localhost';

  return {
    configured,
    projectId: firebaseConfig?.projectId || '',
    authDomain: firebaseConfig?.authDomain || '',
    oAuthClientId: (firebaseConfig as any)?.oAuthClientId || '',
    currentHostname,
    currentOrigin,
    isNativeWebView,
    setupNotice: isNativeWebView
      ? 'Android APK WebView detected: Ensure "localhost" is in Firebase Authorized Domains and your APK SHA-1 fingerprint is added in Firebase Project Settings.'
      : undefined,
  };
}

export async function signInWithGooglePopup(): Promise<GoogleIdentityPayload> {
  const status = getGoogleAuthStatus();
  if (!status.configured) {
    throw new Error(
      'Google Sign-In is not configured in firebase-applet-config.json.',
    );
  }

  try {
    const result = await signInWithPopup(firebaseAuth, googleIdentityProvider);
    const user = result.user;
    const idToken = await user.getIdToken();
    const googleProviderInfo = user.providerData?.find(
      (p) => p.providerId === 'google.com',
    );

    return {
      idToken,
      firebaseUid: user.uid,
      googleSub: googleProviderInfo?.uid || user.uid,
      email: user.email || googleProviderInfo?.email || '',
      emailVerified: Boolean(user.emailVerified),
      displayName:
        user.displayName ||
        googleProviderInfo?.displayName ||
        (user.email ? user.email.split('@')[0] : 'Explorer'),
      photoURL: user.photoURL || googleProviderInfo?.photoURL || '',
    };
  } catch (err: any) {
    const code = String(err?.code || '');
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request'
    ) {
      throw new Error('Google Sign-In was cancelled before completion.');
    }
    if (code === 'auth/unauthorized-domain') {
      const diagnostics = await checkFirebaseDomainAuthorization();
      const customErr: any = new Error(
        `Domain "${status.currentHostname}" is not authorized in Firebase project "${status.projectId}". Add it in Firebase Console -> Authentication -> Settings -> Authorized domains.`,
      );
      customErr.code = 'auth/unauthorized-domain';
      customErr.diagnostics = diagnostics;
      throw customErr;
    }
    if (
      code === 'auth/operation-not-supported-in-this-environment' ||
      code === 'auth/popup-blocked'
    ) {
      throw new Error(
        'Google Sign-In popup was blocked by the browser/WebView. Please allow popups or use Username & Password / Guest Mode.',
      );
    }
    throw new Error(err?.message || 'Google Sign-In failed.');
  }
}

/**
 * Attempts to register an email/password account with Firebase Authentication
 * so the user receives a Firebase UID when Email/Password provider is enabled.
 * Gracefully returns null if Email/Password provider is not enabled in Firebase Console.
 */
export async function tryFirebaseEmailRegister(
  email: string,
  password: string,
): Promise<{ firebaseUid: string; idToken: string } | null> {
  const cleanEmail = (email || '').trim();
  const cleanPass = (password || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@') || cleanPass.length < 6) {
    return null;
  }
  try {
    const cred = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPass);
    const idToken = await cred.user.getIdToken();
    return { firebaseUid: cred.user.uid, idToken };
  } catch (err: any) {
    const code = String(err?.code || '');
    if (code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }
    // If Email/Password provider is not enabled in Firebase Console yet, allow backend scrypt auth to proceed
    return null;
  }
}

/**
 * Attempts to sign in with Email & Password via Firebase Authentication.
 */
export async function tryFirebaseEmailSignIn(
  email: string,
  password: string,
): Promise<{ firebaseUid: string; idToken: string; email: string } | null> {
  const cleanEmail = (email || '').trim();
  const cleanPass = (password || '').trim();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanPass) {
    return null;
  }
  try {
    const cred = await signInWithEmailAndPassword(firebaseAuth, cleanEmail, cleanPass);
    const idToken = await cred.user.getIdToken();
    return {
      firebaseUid: cred.user.uid,
      idToken,
      email: cred.user.email || cleanEmail,
    };
  } catch {
    return null;
  }
}

/**
 * Updates password in Firebase Authentication if the user has an active Firebase session.
 */
export async function tryFirebaseUpdatePassword(newPassword: string): Promise<boolean> {
  try {
    if (firebaseAuth.currentUser && newPassword && newPassword.trim().length >= 6) {
      await updatePassword(firebaseAuth.currentUser, newPassword.trim());
      return true;
    }
  } catch (_) {}
  return false;
}

/**
 * Sends a Firebase password reset email if Email/Password provider is active for this email.
 */
export async function trySendFirebasePasswordReset(email: string): Promise<boolean> {
  try {
    const cleanEmail = (email || '').trim();
    if (!cleanEmail || !cleanEmail.includes('@')) return false;
    await sendPasswordResetEmail(firebaseAuth, cleanEmail);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes the currently signed-in Firebase Authentication user record (if any)
 * and signs out of Firebase.
 */
export async function deleteFirebaseCurrentUser(): Promise<void> {
  try {
    if (firebaseAuth.currentUser) {
      await deleteUser(firebaseAuth.currentUser);
    }
  } catch (_) {
    // Re-authentication may be required by Firebase if session is old; still sign out cleanly
  }
  try {
    await signOut(firebaseAuth);
  } catch (_) {}
}

export async function signOutFirebaseIdentity(): Promise<void> {
  try {
    await signOut(firebaseAuth);
  } catch (_) {}
}
