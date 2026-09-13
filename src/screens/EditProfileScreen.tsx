import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { Input } from '../components/Input';
import { useAuth } from '../context/AuthContext';
import { uploadAvatar } from '../services/storage.service';
import { updateUserProfile } from '../services/users.service';
import { colors, fontSize, spacing } from '../theme';
import { describeError } from '../utils/errors';
import type { MainScreenProps } from '../navigation/types';

export function EditProfileScreen({ navigation }: MainScreenProps<'EditProfile'>) {
  const { profile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [location, setLocation] = useState(profile?.location ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handlePickPhoto() {
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Linkora needs permission to open your photos to change your picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      setLocalPhotoUri(result.assets[0].uri);
    }
  }

  async function handleSave() {
    setError(null);

    if (!profile) {
      setError('Your profile has not loaded yet.');
      return;
    }
    if (displayName.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }

    setBusy(true);
    try {
      // Upload the new photo first, so the profile write includes its URL.
      let photoURL = profile.photoURL;
      if (localPhotoUri) {
        photoURL = await uploadAvatar(profile.uid, localPhotoUri);
      }

      await updateUserProfile(profile.uid, {
        displayName: displayName.trim(),
        headline: headline.trim(),
        location: location.trim(),
        bio: bio.trim(),
        photoURL,
      });

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

      <View style={styles.photoBlock}>
        <Avatar
          name={displayName}
          photoURL={localPhotoUri ?? profile?.photoURL}
          size={96}
        />
        <Pressable onPress={handlePickPhoto} style={styles.changePhoto}>
          <Text style={styles.changePhotoText}>Change photo</Text>
        </Pressable>
      </View>

      <Input label="Full name" value={displayName} onChangeText={setDisplayName} />

      <Input
        label="Headline"
        value={headline}
        onChangeText={setHeadline}
        placeholder="Backend developer · React Native enthusiast"
        hint="One short line describing what you do."
      />

      <Input
        label="Location"
        value={location}
        onChangeText={setLocation}
        placeholder="Chennai, India"
      />

      <Input
        label="About"
        value={bio}
        onChangeText={setBio}
        multiline
        placeholder="A few sentences about your work and interests."
      />

      <Button label="Save changes" onPress={handleSave} loading={busy} />

      <Text style={styles.note}>
        Your email address cannot be changed here — it is your Firebase Authentication
        identity.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  photoBlock: { alignItems: 'center', marginBottom: spacing.xl },
  changePhoto: { marginTop: spacing.md },
  changePhotoText: { color: colors.primary, fontWeight: '600', fontSize: fontSize.sm },
  note: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    lineHeight: 17,
  },
});
