/**
 * Small display helpers. No network access, no external dependencies.
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * Turns a Firestore timestamp into "just now", "5m", "3h", "2d" or a date.
 *
 * `createdAt` is null for a moment after writing, because `serverTimestamp()`
 * is filled in by Google's servers and the local snapshot arrives first.
 */
export function timeAgo(timestamp: Timestamp | null): string {
  if (!timestamp) {
    return 'just now';
  }

  const then = timestamp.toDate();
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;

  return then.toLocaleDateString();
}

/** First letters of a name, for the fallback avatar. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();

  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/** Basic email shape check, used before hitting Firebase. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
