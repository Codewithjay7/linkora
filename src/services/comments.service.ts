/**
 * Comments, stored at `posts/{postId}/comments/{commentId}`.
 *
 * A comment lives underneath its post, so deleting the post's subcollections
 * removes its comments too (see posts.service.ts).
 */

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';

import { db } from '../firebase/app';
import type { Comment, Post, UserProfile } from '../types';
import { createNotification } from './notifications.service';

/**
 * Watches the comments on one post, oldest first.
 * Returns an unsubscribe function.
 */
export function subscribeToComments(
  postId: string,
  callback: (comments: Comment[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc')),
    (snapshot) =>
      callback(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            postId,
            authorId: (data.authorId as string) ?? '',
            authorName: (data.authorName as string) ?? '',
            authorPhotoURL: (data.authorPhotoURL as string) ?? '',
            text: (data.text as string) ?? '',
            createdAt: (data.createdAt as Comment['createdAt']) ?? null,
          };
        }),
      ),
    (error) => onError?.(error),
  );
}

/**
 * Adds a comment and bumps the post's `commentCount`.
 *
 * These are two separate writes rather than one batch because the comment is
 * created with `addDoc` (server-generated id). If the counter update fails the
 * comment still exists, which is the safer of the two failure modes.
 */
export async function addComment(params: {
  post: Post;
  author: UserProfile;
  text: string;
}): Promise<string> {
  const { post, author, text } = params;

  const created = await addDoc(collection(db, 'posts', post.id, 'comments'), {
    authorId: author.uid,
    authorName: author.displayName,
    authorPhotoURL: author.photoURL,
    text: text.trim(),
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'posts', post.id), { commentCount: increment(1) });

  if (post.authorId !== author.uid) {
    await createNotification({
      recipientId: post.authorId,
      actor: author,
      type: 'comment',
      targetPostId: post.id,
    });
  }

  return created.id;
}

/** Deletes a comment. Rules allow this for the comment author or the post author. */
export async function deleteComment(postId: string, commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
  await updateDoc(doc(db, 'posts', postId), { commentCount: increment(-1) });
}
