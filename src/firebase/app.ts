/**
 * The single Firebase entry point for Linkora.
 *
 * ARCHITECTURAL RULE: this file is the ONLY place in the app that is allowed to
 * initialise a network backend. Every other file must import `auth`, `db` or
 * `storage` from here. Nothing in `src/` calls `fetch`, `axios`, `XMLHttpRequest`
 * or any other HTTP client directly.
 *
 * Why this matters: it makes the app's entire network surface auditable by
 * reading one short file. If this file only ever points at `linkora-a274a`, the
 * app cannot be talking to anything else.
 */

import { Platform } from 'react-native';
import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

import { assertPersonalFirebaseProject, firebaseConfig } from '../config/env';

// Fail fast if .env points anywhere other than the personal project.
assertPersonalFirebaseProject();

/**
 * Initialise once. Metro's fast refresh can re-run this module during
 * development, and calling `initializeApp` twice throws, so reuse any existing
 * app instance.
 */
export const firebaseApp: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

/**
 * Auth with persistent login.
 *
 * By default the Firebase JS SDK keeps the session in memory only, which means
 * the user is logged out every time the app restarts. `getReactNativePersistence`
 * stores the session in AsyncStorage (the device's own local storage) so the
 * login survives a restart.
 *
 * The import lives in a `require` with a fallback because the symbol only exists
 * in the SDK's React Native build. Under Metro it resolves; under a plain Node
 * script (for example a lint or test run) it does not, and we fall back to
 * in-memory auth rather than crashing.
 */
function createAuth(app: FirebaseApp): Auth {
  // On web the Firebase JS SDK persists sessions in localStorage automatically,
  // and `@react-native-async-storage/async-storage` has no web implementation.
  // Returning the default `getAuth` keeps login working on iPhone and browser
  // against the SAME Firebase project.
  if (Platform.OS === 'web') {
    return getAuth(app);
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default as {
      getItem: (key: string) => Promise<string | null>;
      setItem: (key: string, value: string) => Promise<void>;
      removeItem: (key: string) => Promise<void>;
    };
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getReactNativePersistence } = require('firebase/auth') as {
      getReactNativePersistence?: (storage: unknown) => unknown;
    };

    if (typeof getReactNativePersistence === 'function') {
      return initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage) as never,
      });
    }
  } catch {
    // Auth was already initialised (fast refresh), or we are not on React Native.
  }

  return getAuth(app);
}

export const auth: Auth = createAuth(firebaseApp);

/** Cloud Firestore — Linkora's only database. */
export const db: Firestore = getFirestore(firebaseApp);

/** Firebase Storage — profile photos and post images only. */
export const storage: FirebaseStorage = getStorage(firebaseApp);
