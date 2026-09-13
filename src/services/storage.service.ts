/**
 * File uploads to Firebase Storage in project `linkora-a274a`.
 *
 * Only two kinds of file are ever uploaded:
 *   users/{uid}/avatar.jpg      — profile photo
 *   posts/{uid}/{timestamp}.jpg — image attached to a post
 *
 * Both paths start with the uploader's UID, which lets `storage.rules` enforce
 * "you may only write inside your own folder" with a simple path match.
 */

import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { storage } from '../firebase/app';

/**
 * React Native gives us a local `file://` URI from the image picker, but
 * Firebase Storage needs binary data. `fetch` on a local file URI is the
 * standard React Native way to read it — this is a device-local read, not a
 * network request.
 */
async function uriToBlob(localUri: string): Promise<Blob> {
  const response = await fetch(localUri);
  if (!response.ok) {
    throw new Error(`Could not read the selected image (status ${response.status}).`);
  }
  return await response.blob();
}

/** Uploads a profile photo and returns its public download URL. */
export async function uploadAvatar(uid: string, localUri: string): Promise<string> {
  const blob = await uriToBlob(localUri);
  const target = ref(storage, `users/${uid}/avatar.jpg`);

  await uploadBytes(target, blob, { contentType: 'image/jpeg' });
  return await getDownloadURL(target);
}

/** Uploads an image for a post and returns its public download URL. */
export async function uploadPostImage(uid: string, localUri: string): Promise<string> {
  const blob = await uriToBlob(localUri);
  const target = ref(storage, `posts/${uid}/${Date.now()}.jpg`);

  await uploadBytes(target, blob, { contentType: 'image/jpeg' });
  return await getDownloadURL(target);
}
