/**
 * Environment configuration for Linkora.
 *
 * All values come from `.env` at the project root and are injected at BUILD time
 * by Expo's built-in support for `EXPO_PUBLIC_*` variables. See `.env.example`.
 *
 * IMPORTANT — read this before you add anything here:
 *
 * Every `EXPO_PUBLIC_*` value is embedded in plain text inside the compiled app
 * bundle. Anyone who downloads the app can read them. That is fine for Firebase
 * *client* configuration (the API key below is a public project identifier, not
 * a password — Google documents it as safe to ship). It is NOT fine for private
 * keys, service-account JSON, database passwords, or any admin credential.
 *
 * Linkora's actual access control lives in `firestore.rules` and `storage.rules`,
 * enforced by Google's servers. Never rely on hiding a value in the app instead.
 */

/** Reads one required variable and fails loudly if it is missing or a placeholder. */
function required(name: string, value: string | undefined): string {
  const trimmed = (value ?? '').trim();

  if (trimmed.length === 0) {
    throw new Error(
      `[Linkora] Missing environment variable ${name}.\n` +
        `Copy .env.example to .env and fill in your Firebase values, then restart ` +
        `the dev server with:  npx expo start --clear`,
    );
  }

  // Guard against shipping the placeholder text from .env.example by mistake.
  if (trimmed.startsWith('your_') || trimmed === 'CHANGE_ME') {
    throw new Error(
      `[Linkora] Environment variable ${name} still contains the placeholder value ` +
        `from .env.example. Replace it with the real value from your Firebase console.`,
    );
  }

  return trimmed;
}

/**
 * Firebase client configuration.
 *
 * These fields must all belong to the SAME personal Firebase project. Linkora is
 * designed to talk to exactly one backend and nothing else.
 */
export const firebaseConfig = {
  apiKey: required('EXPO_PUBLIC_FIREBASE_API_KEY', process.env.EXPO_PUBLIC_FIREBASE_API_KEY),
  authDomain: required('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: required('EXPO_PUBLIC_FIREBASE_PROJECT_ID', process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: required('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: required(
    'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: required('EXPO_PUBLIC_FIREBASE_APP_ID', process.env.EXPO_PUBLIC_FIREBASE_APP_ID),
} as const;

/**
 * The ONLY Firebase project Linkora is allowed to talk to.
 *
 * This is a deliberate tripwire. If a `.env` file ever points the app at a
 * different project — a company project, a colleague's project, a staging
 * project — the app refuses to start instead of silently reading or writing
 * data somewhere it should not.
 */
export const ALLOWED_FIREBASE_PROJECT_ID = 'linkora-a274a';

/** Throws if `.env` points at any Firebase project other than the personal one. */
export function assertPersonalFirebaseProject(): void {
  if (firebaseConfig.projectId !== ALLOWED_FIREBASE_PROJECT_ID) {
    throw new Error(
      `[Linkora] Refusing to start.\n` +
        `EXPO_PUBLIC_FIREBASE_PROJECT_ID is "${firebaseConfig.projectId}" but Linkora is ` +
        `locked to "${ALLOWED_FIREBASE_PROJECT_ID}".\n` +
        `Linkora is a personal application and must never connect to another Firebase ` +
        `project. Fix your .env file, or change ALLOWED_FIREBASE_PROJECT_ID in ` +
        `src/config/env.ts if you genuinely renamed your own project.`,
    );
  }
}
