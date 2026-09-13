import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from './Avatar';
import { colors, fontSize, radius, spacing } from '../theme';
import { timeAgo } from '../utils/format';
import type { Post } from '../types';

interface PostCardProps {
  post: Post;
  liked: boolean;
  onToggleLike: () => void;
  onOpenComments: () => void;
  onOpenAuthor: () => void;
  onDelete?: () => void;
}

export function PostCard({
  post,
  liked,
  onToggleLike,
  onOpenComments,
  onOpenAuthor,
  onDelete,
}: PostCardProps) {
  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={onOpenAuthor}>
        <Avatar name={post.authorName} photoURL={post.authorPhotoURL} size={44} />
        <View style={styles.headerText}>
          <Text style={styles.author} numberOfLines={1}>
            {post.authorName || 'Linkora member'}
          </Text>
          {post.authorHeadline ? (
            <Text style={styles.headline} numberOfLines={1}>
              {post.authorHeadline}
            </Text>
          ) : null}
          <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
        </View>
      </Pressable>

      {post.text ? <Text style={styles.body}>{post.text}</Text> : null}

      {post.imageUrl ? (
        <Image source={{ uri: post.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : null}

      <View style={styles.counts}>
        <Text style={styles.countText}>
          {post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}
        </Text>
        <Text style={styles.countText}>
          {post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onToggleLike}
          style={styles.action}
          accessibilityRole="button"
          accessibilityLabel={liked ? 'Unlike this post' : 'Like this post'}
        >
          <Text style={[styles.actionText, liked && styles.actionTextActive]}>
            {liked ? '♥  Liked' : '♡  Like'}
          </Text>
        </Pressable>

        <Pressable onPress={onOpenComments} style={styles.action} accessibilityRole="button">
          <Text style={styles.actionText}>💬  Comment</Text>
        </Pressable>

        {onDelete ? (
          <Pressable onPress={onDelete} style={styles.action} accessibilityRole="button">
            <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { marginLeft: spacing.md, flex: 1 },
  author: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  headline: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 1 },
  time: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  body: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    marginTop: spacing.md,
    backgroundColor: colors.border,
  },
  counts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  countText: { fontSize: fontSize.xs, color: colors.textMuted },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  action: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center' },
  actionText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textMuted },
  actionTextActive: { color: colors.primary },
  deleteText: { color: colors.danger },
});
