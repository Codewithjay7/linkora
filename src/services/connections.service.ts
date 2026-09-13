/**
 * Connections between users, stored at `connections/{connectionId}`.
 *
 * The document id is the two UIDs sorted and joined with `_`, so a pair of users
 * can only ever have one connection document. That removes an entire class of
 * duplicate-request bugs without needing a query first.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { db } from '../firebase/app';
import { connectionIdFor, type Connection, type UserProfile } from '../types';
import { createNotification } from './notifications.service';

const CONNECTIONS = 'connections';

function toConnection(id: string, data: Record<string, unknown>): Connection {
  return {
    id,
    members: (data.members as string[]) ?? [],
    requesterId: (data.requesterId as string) ?? '',
    recipientId: (data.recipientId as string) ?? '',
    status: (data.status as Connection['status']) ?? 'pending',
    createdAt: (data.createdAt as Connection['createdAt']) ?? null,
    updatedAt: (data.updatedAt as Connection['updatedAt']) ?? null,
  };
}

/** Reads the connection between two users, or null if they have none. */
export async function getConnectionBetween(
  uidA: string,
  uidB: string,
): Promise<Connection | null> {
  const snapshot = await getDoc(doc(db, CONNECTIONS, connectionIdFor(uidA, uidB)));
  return snapshot.exists() ? toConnection(snapshot.id, snapshot.data()) : null;
}

/**
 * Watches every connection the user is part of — both pending and accepted.
 * The Network screen splits them apart locally.
 */
export function subscribeToMyConnections(
  uid: string,
  callback: (connections: Connection[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, CONNECTIONS), where('members', 'array-contains', uid)),
    (snapshot) => callback(snapshot.docs.map((d) => toConnection(d.id, d.data()))),
    (error) => onError?.(error),
  );
}

/** Sends a connection request from `requester` to `recipientId`. */
export async function sendConnectionRequest(params: {
  requester: UserProfile;
  recipientId: string;
}): Promise<void> {
  const { requester, recipientId } = params;
  const id = connectionIdFor(requester.uid, recipientId);

  await setDoc(doc(db, CONNECTIONS, id), {
    members: [requester.uid, recipientId].sort(),
    requesterId: requester.uid,
    recipientId,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    recipientId,
    actor: requester,
    type: 'connection_request',
    targetPostId: '',
  });
}

/**
 * Accepts a pending request.
 * Security rules allow this only for the recipient of that request.
 */
export async function acceptConnectionRequest(params: {
  connection: Connection;
  accepter: UserProfile;
}): Promise<void> {
  const { connection, accepter } = params;

  await updateDoc(doc(db, CONNECTIONS, connection.id), {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });

  await createNotification({
    recipientId: connection.requesterId,
    actor: accepter,
    type: 'connection_accepted',
    targetPostId: '',
  });
}

/**
 * Removes a connection entirely.
 * Used both to decline a pending request and to disconnect from someone.
 */
export async function removeConnection(connectionId: string): Promise<void> {
  await deleteDoc(doc(db, CONNECTIONS, connectionId));
}
