import React, { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { createPost } from '../services/posts.service';
import { uploadPostImage } from '../services/storage.service';
import { colors, fontSize, radius, spacing } from '../theme';
import { describeError } from '../utils/errors';
import type { MainScreenProps } from '../navigation/types';

export function CreatePostScreen({ navigation }: MainScreenProps<'CreatePost'>) {
  const { profile } = useAuth();

  const [text, setText] = useState('');
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePickImage() {
    setError(null);

    // Ask the OS for photo library access. Expo shows the system dialog.
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Linkora needs permission to open your photos to attach an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets.length > 0) {
      setLocalImageUri(result.assets[0].uri);
    }
  }

  async function handlePublish() {
    setError(null);

    if (!profile) {
      setError('Your profile has not loaded yet. Wait a moment and try again.');
      return;
    }
    if (text.trim().length === 0 && !localImageUri) {
      setError('Write something, or attach an image.');
      return;
    }

    setBusy(true);
    try {
      // Upload the image first so the post document is written complete.
      let imageUrl = '';
      if (localImageUri) {
        imageUrl = await uploadPostImage(profile.uid, localImageUri);
      }

      await createPost({ author: profile, text, imageUrl });
      navigation.goBack();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />

      <Input
        label="What do you want to share?"
        value={text}
        onChangeText={setText}
        multiline
        placeholder="Share an update, an idea, or something you learned…"
      />

      {localImageUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: localImageUri }} style={styles.preview} resizeMode="cover" />
          <Pressable onPress={() => setLocalImageUri(null)} style={styles.removeButton}>
            <Text style={styles.removeText}>Remove image</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={handlePickImage} style={styles.attachButton}>
          <Text style={styles.attachText}>📷  Attach an image</Text>
        </Pressable>
      )}

      <Button
        label="Publish post"
        onPress={handlePublish}
        loading={busy}
        style={styles.publish}
      />

      <Text style={styles.footnote}>
        Posts are stored in your own Firebase project. Anyone signed in to your Linkora can
        read them.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  attachButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  attachText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.md },
  previewWrap: { marginBottom: spacing.md },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.border,
  },
  removeButton: { paddingVertical: spacing.md, alignItems: 'center' },
  removeText: { color: colors.danger, fontWeight: '600', fontSize: fontSize.sm },
  publish: { marginTop: spacing.xl },
  footnote: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 17,
  },
});
