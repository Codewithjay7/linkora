/**
 * Holds the signed-in user and their Firestore profile for the whole app.
 *
 * Two separate things are tracked:
 *   - `user`    the Firebase Auth record (identity: uid, email)
 *   - `profile` the Firestore document at users/{uid} (name, headline, photo)
 *
 * Screens almost always want `profile`. It is kept live with a snapshot
 * listener, so editing the profile updates every screen immediately.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from 'firebase/auth';

import { subscribeToAuthState } from '../services/auth.service';
import { subscribeToUserProfile } from '../services/users.service';
import type { UserProfile } from '../types';

interface AuthContextValue {
  /** Firebase Auth user, or null when signed out. */
  user: User | null;
  /** Firestore profile, or null when signed out or still loading. */
  profile: UserProfile | null;
  /** True until the first auth state check completes. */
  initialising: boolean;
  /** Set when the profile listener fails, usually a security-rules problem. */
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [initialising, setInitialising] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Watch login / logout.
  useEffect(() => {
    const unsubscribe = subscribeToAuthState((nextUser) => {
      setUser(nextUser);
      setInitialising(false);

      if (!nextUser) {
        setProfile(null);
      }
    });

    return unsubscribe;
  }, []);

  // Watch the profile document for whoever is currently signed in.
  useEffect(() => {
    if (!user) {
      return;
    }

    const unsubscribe = subscribeToUserProfile(
      user.uid,
      (nextProfile) => {
        setProfile(nextProfile);
        setError(null);
      },
      (listenerError) => {
        setError(
          `Could not load your profile: ${listenerError.message}. ` +
            `If this says "permission denied", check your Firestore security rules.`,
        );
      },
    );

    return unsubscribe;
  }, [user]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, profile, initialising, error, clearError }),
    [user, profile, initialising, error, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Reads the auth context. Throws if used outside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }

  return context;
}
