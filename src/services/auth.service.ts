/**
 * Authentication against Firebase Auth in project `linkora-a274a`.
 *
 * Linkora uses email + password only. There is deliberately no company SSO, no
 * LDAP, no Active Directory and no third-party identity provider.
 */

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';

import { auth } from '../firebase/app';
import { createUserProfile } from './users.service';

/** Registers a new account and creates the matching `users/{uid}` document. */
export async function register(params: {
  email: string;
  password: string;
  displayName: string;
}): Promise<User> {
  const { email, password, displayName } = params;

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);

  // Set the name on the Auth record so it is available immediately.
  await updateProfile(credential.user, { displayName: displayName.trim() });

  // Then create the Firestore profile the rest of the app reads from.
  await createUserProfile({
    uid: credential.user.uid,
    email: credential.user.email ?? email.trim(),
    displayName: displayName.trim(),
  });

  return credential.user;
}

/** Signs an existing user in. */
export async function login(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  return credential.user;
}

/** Signs the current user out and clears the stored session. */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/** Sends a password reset email via Firebase. */
export async function requestPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Subscribes to login/logout events.
 * Returns an unsubscribe function — call it when the component unmounts.
 */
export function subscribeToAuthState(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/** The currently signed-in user, or null. */
export function currentUser(): User | null {
  return auth.currentUser;
}
