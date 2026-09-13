/**
 * In-app notifications, stored at `users/{uid}/notifications/{notificationId}`.
 *
 * Note this is *in-app* only: the list is read from Firestore while the app is
 * open. Push notifications (Firebase Cloud Messaging) are NOT implemented —
 * see the README. Adding them would require a development build rather than
 * Expo Go, plus a server component to send the messages.
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/app';
import type { AppNotification, NotificationType, UserProfile } from '../types';

/** Path helper: the notifications subcollection for one user. */
function notificationsOf(uid: string) {
  return collection(db, 'users', uid, 'notifications');
}

/**
 * Creates a notification for another user.
 *
 * Security rules deliberately allow writing into someone else's notifications
 * subcollection — that is how "X liked your post" works — but only with your own
 * UID as `actorId`, so nobody can forge a notification that appears to be from
 * someone else.
 */
export async function createNotification(params: {
  recipientId: string;
  actor: UserProfile;
  type: NotificationType;
  targetPostId: string;
}): Promise<void> {
  const { recipientId, actor, type, targetPostId } = params;

  await addDoc(notificationsOf(recipientId), {
    recipientId,
    actorId: actor.uid,
    actorName: actor.displayName,
    actorPhotoURL: actor.photoURL,
    type,
    targetPostId,
    read: false,
    createdAt: serverTimestamp(),
  });
}

/** Watches the signed-in user's notifications, newest first. */
export function subscribeToNotifications(
  uid: string,
  callback: (notifications: AppNotification[]) => void,
  onError?: (error: Error) => void,
  max: number = 50,
): () => void {
  return onSnapshot(
    query(notificationsOf(uid), orderBy('createdAt', 'desc'), fsLimit(max)),
    (snapshot) =>
      callback(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            recipientId: (data.recipientId as string) ?? uid,
            actorId: (data.actorId as string) ?? '',
            actorName: (data.actorName as string) ?? '',
            actorPhotoURL: (data.actorPhotoURL as string) ?? '',
            type: (data.type as NotificationType) ?? 'like',
            targetPostId: (data.targetPostId as string) ?? '',
            read: Boolean(data.read),
            createdAt: (data.createdAt as AppNotification['createdAt']) ?? null,
          };
        }),
      ),
    (error) => onError?.(error),
  );
}

/** Marks one notification as read. */
export async function markNotificationRead(uid: string, notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), { read: true });
}

/** Marks every unread notification as read. */
export async function markAllNotificationsRead(uid: string): Promise<void> {
  const snapshot = await getDocs(query(notificationsOf(uid), where('read', '==', false)));
  await Promise.all(snapshot.docs.map((d) => updateDoc(d.ref, { read: true })));
}

/** Deletes one notification. */
export async function deleteNotification(uid: string, notificationId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'notifications', notificationId));
}
