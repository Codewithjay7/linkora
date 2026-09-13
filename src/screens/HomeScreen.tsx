import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { PostCard } from '../components/PostCard';
import { useAuth } from '../context/AuthContext';
import {
  deletePostCompletely,
  getLikedPostIds,
  likePost,
  subscribeToFeed,
  unlikePost,
} from '../services/posts.service';
import { colors, fontSize, radius, spacing } from '../theme';
import { describeError } from '../utils/errors';
import type { Post } from '../types';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Live feed. The unsubscribe returned here closes the Firestore listener.
  useEffect(() => {
    const unsubscribe = subscribeToFeed(
      (nextPosts) => {
        setPosts(nextPosts);
        setLoading(false);
        setError(null);
      },
      (listenerError) => {
        setError(describeError(listenerError));
        setLoading(false);
      },
    );

    return unsubscribe;
  }, []);

  /**
   * A stable key describing *which* posts are on screen, ignoring their
   * like/comment counts.
   *
   * This matters for cost. The feed listener fires on every change to any
   * visible post — including someone else's like. `posts` is a brand-new array
   * each time, so keying the effect below on `posts` would re-check "have I
   * liked this?" for all 50 posts on every single like by anyone, which burns
   * through the free Firestore read quota very quickly. Keying on the id list
   * instead means the check only re-runs when a post is actually added or
   * removed.
   */
  const postIdsKey = useMemo(() => posts.map((post) => post.id).join(','), [posts]);

  // Work out which of the visible posts this user has already liked.
  useEffect(() => {
    if (!profile || posts.length === 0) {
      return;
    }

    let cancelled = false;

    getLikedPostIds(
      posts.map((post) => post.id),
      profile.uid,
    )
      .then((ids) => {
        if (!cancelled) {
          setLikedIds(ids);
        }
      })
      .catch(() => {
        // A failure here only means the heart icons are not pre-filled.
        // It must not break the feed, so it is intentionally swallowed.
      });

    return () => {
      cancelled = true;
    };
    // `posts` is read inside but deliberately not a dependency — see postIdsKey above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postIdsKey, profile?.uid]);

  const handleToggleLike = useCallback(
    async (post: Post) => {
      if (!profile) return;

      const alreadyLiked = likedIds.has(post.id);

      // Update the icon immediately so the tap feels instant, then write.
      setLikedIds((previous) => {
        const next = new Set(previous);
        if (alreadyLiked) {
          next.delete(post.id);
        } else {
          next.add(post.id);
        }
        return next;
      });

      try {
        if (alreadyLiked) {
          await unlikePost({ postId: post.id, uid: profile.uid });
        } else {
          await likePost({ post, actor: profile });
        }
      } catch (caught) {
        // Roll the icon back if the write failed.
        setLikedIds((previous) => {
          const next = new Set(previous);
          if (alreadyLiked) {
            next.add(post.id);
          } else {
            next.delete(post.id);
          }
          return next;
        });
        setError(describeError(caught));
      }
    },
    [likedIds, profile],
  );

  const handleDelete = useCallback((post: Post) => {
    Alert.alert('Delete post', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePostCompletely(post.id);
          } catch (caught) {
            setError(describeError(caught));
          }
        },
      },
    ]);
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>Linkora</Text>
        <Pressable
          onPress={() => navigation.navigate('CreatePost')}
          style={styles.newPostButton}
          accessibilityRole="button"
        >
          <Text style={styles.newPostText}>+ Post</Text>
        </Pressable>
      </View>

      <View style={styles.bannerWrap}>
        <ErrorBanner message={error} />
      </View>

      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            liked={likedIds.has(item.id)}
            onToggleLike={() => handleToggleLike(item)}
            onOpenComments={() => navigation.navigate('PostDetail', { postId: item.id })}
            onOpenAuthor={() => navigation.navigate('UserProfile', { uid: item.authorId })}
            onDelete={item.authorId === profile?.uid ? () => handleDelete(item) : undefined}
          />
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="Your feed is empty"
              message="Tap “+ Post” to share the first update on your Linkora."
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  newPostButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  newPostText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSize.sm },
  bannerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
});
