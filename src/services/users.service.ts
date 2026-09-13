/**
 * User profile reads and writes against `users/{uid}` in Firestore.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/app';
import type { EditableProfileFields, UserProfile } from '../types';

const USERS = 'users';

/** Converts a Firestore snapshot into a fully populated UserProfile. */
function toProfile(id: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: id,
    email: (data.email as string) ?? '',
    displayName: (data.displayName as string) ?? '',
    headline: (data.headline as string) ?? '',
    bio: (data.bio as string) ?? '',
    location: (data.location as string) ?? '',
    photoURL: (data.photoURL as string) ?? '',
    createdAt: (data.createdAt as UserProfile['createdAt']) ?? null,
    updatedAt: (data.updatedAt as UserProfile['updatedAt']) ?? null,
  };
}

/**
 * Creates the profile document for a brand new account.
 * Called once, immediately after registration.
 */
export async function createUserProfile(params: {
  uid: string;
  email: string;
  displayName: string;
}): Promise<void> {
  await setDoc(doc(db, USERS, params.uid), {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName,
    headline: '',
    bio: '',
    location: '',
    photoURL: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Reads one profile. Returns null if the document does not exist. */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, USERS, uid));
  if (!snapshot.exists()) {
    return null;
  }
  return toProfile(snapshot.id, snapshot.data());
}

/**
 * Watches one profile for live changes.
 * Returns an unsubscribe function.
 */
export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    doc(db, USERS, uid),
    (snapshot) => callback(snapshot.exists() ? toProfile(snapshot.id, snapshot.data()) : null),
    (error) => onError?.(error),
  );
}

/** Updates the signed-in user's own profile. Security rules block editing anyone else. */
export async function updateUserProfile(
  uid: string,
  changes: Partial<EditableProfileFields>,
): Promise<void> {
  await updateDoc(doc(db, USERS, uid), {
    ...changes,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Lists other users so they can be discovered on the Network screen.
 *
 * Firestore has no substring search, so this returns a page of users ordered by
 * name and filters locally. That is fine at personal-project scale. If the user
 * base ever grows past a few hundred, the standard fix is a dedicated search
 * index — but that would mean adding a third-party service, so it is not done here.
 */
export async function listOtherUsers(
  currentUid: string,
  max: number = 50,
): Promise<UserProfile[]> {
  const snapshot = await getDocs(
    query(collection(db, USERS), orderBy('displayName'), fsLimit(max)),
  );

  return snapshot.docs
    .map((d) => toProfile(d.id, d.data()))
    .filter((profile) => profile.uid !== currentUid);
}

/** Looks up a profile by exact email address. Used for finding a specific person. */
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  const snapshot = await getDocs(
    query(collection(db, USERS), where('email', '==', email.trim().toLowerCase()), fsLimit(1)),
  );

  const first = snapshot.docs[0];
  return first ? toProfile(first.id, first.data()) : null;
}
