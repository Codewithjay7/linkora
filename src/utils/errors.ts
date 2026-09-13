/**
 * Turns raw Firebase error codes into sentences a human can act on.
 *
 * Firebase throws errors like `auth/invalid-credential`, which is accurate but
 * unhelpful in a UI. The mapping below covers the codes Linkora can actually
 * produce.
 */

interface FirebaseLikeError {
  code?: string;
  message?: string;
}

const MESSAGES: Record<string, string> = {
  // Authentication
  'auth/email-already-in-use': 'That email address already has a Linkora account. Try signing in.',
  'auth/invalid-email': 'That does not look like a valid email address.',
  'auth/weak-password': 'Please choose a password with at least 6 characters.',
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/user-not-found': 'No account exists for that email address.',
  'auth/wrong-password': 'Wrong email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed':
    'Could not reach Firebase. Check that this device has internet access.',

  // Firestore
  'permission-denied':
    'Firestore refused this operation. Your security rules do not allow it — see the Security section of the README.',
  unauthenticated: 'You need to sign in before doing that.',
  unavailable: 'Could not reach Firestore. Check this device has internet access.',
  'failed-precondition':
    'Firestore needs an index for this query. Open the link in the terminal error to create it.',

  // Storage
  'storage/unauthorized':
    'Firebase Storage refused this upload. Check your storage rules allow writing to your own folder.',
  'storage/canceled': 'The upload was cancelled.',
  'storage/retry-limit-exceeded': 'The upload timed out. Check your connection and try again.',
};

/** Best-effort human-readable message for any thrown value. */
export function describeError(error: unknown): string {
  const candidate = error as FirebaseLikeError;

  if (candidate?.code && MESSAGES[candidate.code]) {
    return MESSAGES[candidate.code];
  }

  if (candidate?.message) {
    return candidate.message;
  }

  return 'Something went wrong. Please try again.';
}
