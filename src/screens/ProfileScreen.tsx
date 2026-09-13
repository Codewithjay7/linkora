import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { subscribeToUserPosts } from '../services/posts.service';
import { colors, fontSize, radius, spacing } from '../theme';
import { describeError } from '../utils/errors';
import { timeAgo } from '../utils/format';
import type { Post } from '../types';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

/** The signed-in user's own profile. */
export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, error: authError } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    const unsubscribe = subscribeToUserPosts(
      profile.uid,
      setPosts,
      (listenerError) => setError(describeError(listenerError)),
    );

    return unsubscribe;
  }, [profile]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <ErrorBanner message={authError ?? error} />

            <View style={styles.card}>
              <Avatar name={profile?.displayName ?? ''} photoURL={profile?.photoURL} size={84} />
              <Text style={styles.name}>{profile?.displayName || 'Your name'}</Text>
              {profile?.headline ? (
                <Text style={styles.headline}>{profile.headline}</Text>
              ) : (
                <Text style={styles.placeholder}>Add a headline to describe what you do.</Text>
              )}
              {profile?.location ? (
                <Text style={styles.location}>📍 {profile.location}</Text>
              ) : null}
              {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}

              <View style={styles.buttonRow}>
                <Button
                  label="Edit profile"
                  variant="secondary"
                  onPress={() => navigation.navigate('EditProfile')}
                  style={styles.flexButton}
                />
                <Pressable
                  onPress={() => navigation.navigate('Settings')}
                  style={styles.settingsButton}
                >
                  <Text style={styles.settingsText}>⚙︎</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.sectionTitle}>My posts ({posts.length})</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.postRow}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
          >
            <Text style={styles.postText} numberOfLines={3}>
              {item.text || '(image post)'}
            </Text>
            <Text style={styles.postMeta}>
              {timeAgo(item.createdAt)} · {item.likeCount} likes · {item.commentCount} comments
            </Text>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState title="You have not posted yet" message="Your posts will appear here." />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    alignItems: 'center',
  },
  name: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  headline: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  placeholder: {
    fontSize: fontSize.sm,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  location: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  bio: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 21,
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    alignSelf: 'stretch',
  },
  flexButton: { flex: 1 },
  settingsButton: {
    marginLeft: spacing.md,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsText: { fontSize: 20, color: colors.primary },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  postRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  postText: { fontSize: fontSize.md, color: colors.text, lineHeight: 20 },
  postMeta: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: spacing.sm },
});
