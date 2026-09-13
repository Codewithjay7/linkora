/**
 * Feed posts and likes.
 *
 * Firestore layout:
 *   posts/{postId}                  — the post itself
 *   posts/{postId}/likes/{uid}      — one document per liker, id = liker's UID
 *   posts/{postId}/comments/{id}    — see comments.service.ts
 *
 * Using the liker's UID as the like document id means a user physically cannot
 * like the same post twice, and the security rule stays a one-liner.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit as fsLimit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  writeBatch,
  addDoc,
} from 'firebase/firestore';

import { db } from '../firebase/app';
import type { Post, UserProfile } from '../types';
import { createNotification } from './notifications.service';

const POSTS = 'posts';

function toPost(id: string, data: Record<string, unknown>): Post {
  return {
    id,
    authorId: (data.authorId as string) ?? '',
    authorName: (data.authorName as string) ?? '',
    authorHeadline: (data.authorHeadline as string) ?? '',
    authorPhotoURL: (data.authorPhotoURL as string) ?? '',
    text: (data.text as string) ?? '',
    imageUrl: (data.imageUrl as string) ?? '',
    likeCount: (data.likeCount as number) ?? 0,
    commentCount: (data.commentCount as number) ?? 0,
    createdAt: (data.createdAt as Post['createdAt']) ?? null,
  };
}

/**
 * Watches the newest posts for live updates.
 * Returns an unsubscribe function — always call it when the screen unmounts,
 * otherwise the listener keeps an open connection to Firestore.
 */
export function subscribeToFeed(
  callback: (posts: Post[]) => void,
  onError?: (error: Error) => void,
  max: number = 50,
): () => void {
  return onSnapshot(
    query(collection(db, POSTS), orderBy('createdAt', 'desc'), fsLimit(max)),
    (snapshot) => callback(snapshot.docs.map((d) => toPost(d.id, d.data()))),
    (error) => onError?.(error),
  );
}

/** Watches only one user's posts, for the profile screen. */
export function subscribeToUserPosts(
  uid: string,
  callback: (posts: Post[]) => void,
  onError?: (error: Error) => void,
  max: number = 50,
): () => void {
  return onSnapshot(
    query(
      collection(db, POSTS),
      where('authorId', '==', uid),
      orderBy('createdAt', 'desc'),
      fsLimit(max),
    ),
    (snapshot) => callback(snapshot.docs.map((d) => toPost(d.id, d.data()))),
    (error) => onError?.(error),
  );
}

/** Reads a single post once. */
export async function getPost(postId: string): Promise<Post | null> {
  const snapshot = await getDoc(doc(db, POSTS, postId));
  return snapshot.exists() ? toPost(snapshot.id, snapshot.data()) : null;
}

/**
 * Creates a post. The author's name and photo are copied onto the post so the
 * feed can render without loading every author profile separately.
 */
export async function createPost(params: {
  author: UserProfile;
  text: string;
  imageUrl?: string;
}): Promise<string> {
  const created = await addDoc(collection(db, POSTS), {
    authorId: params.author.uid,
    authorName: params.author.displayName,
    authorHeadline: params.author.headline,
    authorPhotoURL: params.author.photoURL,
    text: params.text.trim(),
    imageUrl: params.imageUrl ?? '',
    likeCount: 0,
    commentCount: 0,
    createdAt: serverTimestamp(),
  });

  return created.id;
}

/** Deletes a post. Security rules allow this only for the post's author. */
export async function deletePost(postId: string): Promise<void> {
  await deleteDoc(doc(db, POSTS, postId));
}

/** Returns true if the given user has already liked the post. */
export async function hasLiked(postId: string, uid: string): Promise<boolean> {
  const snapshot = await getDoc(doc(db, POSTS, postId, 'likes', uid));
  return snapshot.exists();
}

/** Returns the set of post ids (from the given list) that this user has liked. */
export async function getLikedPostIds(postIds: string[], uid: string): Promise<Set<string>> {
  const results = await Promise.all(
    postIds.map(async (postId) => ({
      postId,
      liked: await hasLiked(postId, uid),
    })),
  );

  return new Set(results.filter((r) => r.liked).map((r) => r.postId));
}

/**
 * Adds a like and increments the post's counter in one atomic batch, so the
 * counter can never drift out of sync with the like documents.
 */
export async function likePost(params: {
  post: Post;
  actor: UserProfile;
}): Promise<void> {
  const { post, actor } = params;

  const batch = writeBatch(db);
  batch.set(doc(db, POSTS, post.id, 'likes', actor.uid), {
    uid: actor.uid,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, POSTS, post.id), { likeCount: increment(1) });
  await batch.commit();

  // Do not notify yourself about your own like.
  if (post.authorId !== actor.uid) {
    await createNotification({
      recipientId: post.authorId,
      actor,
      type: 'like',
      targetPostId: post.id,
    });
  }
}

/** Removes a like and decrements the counter atomically. */
export async function unlikePost(params: { postId: string; uid: string }): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, POSTS, params.postId, 'likes', params.uid));
  batch.update(doc(db, POSTS, params.postId), { likeCount: increment(-1) });
  await batch.commit();
}

/**
 * Removes a post's like and comment subcollections.
 *
 * Firestore does not delete subcollections automatically when a parent document
 * is deleted, so this is called before `deletePost` to avoid orphaned data.
 * At personal-project scale a client-side loop is fine; a very popular post
 * would need a Cloud Function instead.
 */
export async function deletePostSubcollections(postId: string): Promise<void> {
  for (const name of ['likes', 'comments'] as const) {
    const snapshot = await getDocs(collection(db, POSTS, postId, name));
    await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  }
}

/** Deletes a post and everything underneath it. */
export async function deletePostCompletely(postId: string): Promise<void> {
  await deletePostSubcollections(postId);
  await deletePost(postId);
}
