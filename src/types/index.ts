/**
 * Shared data shapes for Linkora.
 *
 * These mirror the documents stored in Cloud Firestore under project
 * `linkora-a274a`. Keep them in sync with `firestore.rules`.
 */

import type { Timestamp } from 'firebase/firestore';

/** A registered Linkora user. Stored at `users/{uid}`. */
export interface UserProfile {
  /** Firebase Auth UID. Always equal to the document id. */
  uid: string;
  email: string;
  displayName: string;
  /** Short professional headline, e.g. "Backend developer". */
  headline: string;
  bio: string;
  location: string;
  /** Download URL of the avatar in Firebase Storage, or empty string. */
  photoURL: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

/** Fields a user is allowed to change on their own profile. */
export type EditableProfileFields = Pick<
  UserProfile,
  'displayName' | 'headline' | 'bio' | 'location' | 'photoURL'
>;

/** A feed post. Stored at `posts/{postId}`. */
export interface Post {
  id: string;
  authorId: string;
  /** Denormalised so the feed renders without an extra read per post. */
  authorName: string;
  authorHeadline: string;
  authorPhotoURL: string;
  text: string;
  /** Download URL of an attached image in Firebase Storage, or empty string. */
  imageUrl: string;
  likeCount: number;
  commentCount: number;
  createdAt: Timestamp | null;
}

/** A comment. Stored at `posts/{postId}/comments/{commentId}`. */
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string;
  text: string;
  createdAt: Timestamp | null;
}

/**
 * A connection between two users. Stored at `connections/{connectionId}` where
 * the id is the two UIDs sorted alphabetically and joined with an underscore.
 * Using a deterministic id makes duplicate requests impossible.
 */
export interface Connection {
  id: string;
  /** Both UIDs, sorted. Used for `array-contains` queries. */
  members: string[];
  requesterId: string;
  recipientId: string;
  status: ConnectionStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export type ConnectionStatus = 'pending' | 'accepted';

/** A notification. Stored at `users/{uid}/notifications/{notificationId}`. */
export interface AppNotification {
  id: string;
  /** Who should see this. Always equal to the parent user document id. */
  recipientId: string;
  /** Who caused it. */
  actorId: string;
  actorName: string;
  actorPhotoURL: string;
  type: NotificationType;
  /** Post id for like/comment notifications, otherwise empty string. */
  targetPostId: string;
  read: boolean;
  createdAt: Timestamp | null;
}

export type NotificationType =
  | 'like'
  | 'comment'
  | 'connection_request'
  | 'connection_accepted';

/** Builds the deterministic connection document id for a pair of users. */
export function connectionIdFor(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join('_');
}
