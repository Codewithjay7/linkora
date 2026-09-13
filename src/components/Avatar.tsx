import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme';
import { initials } from '../utils/format';

interface AvatarProps {
  name: string;
  photoURL?: string;
  size?: number;
}

/** Shows the user's photo, or their initials on a coloured circle as a fallback. */
export function Avatar({ name, photoURL, size = 44 }: AvatarProps) {
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={[styles.image, circle]} />;
  }

  return (
    <View style={[styles.fallback, circle]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: colors.border },
  fallback: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: '#FFFFFF', fontWeight: '700' },
});
