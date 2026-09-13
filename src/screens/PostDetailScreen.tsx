import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { addComment, deleteComment, subscribeToComments } from '../services/comments.service';
import { getPost } from '../services/posts.service';
import { colors, fontSize, radius, spacing } from '../theme';
import { describeError } from '../utils/errors';
import { timeAgo } from '../utils/format';
import type { Comment, Post } from '../types';
import type { MainScreenProps } from '../navigation/types';

export function PostDetailScreen({ route }: MainScreenProps<'PostDetail'>) {
  const { postId } = route.params;
  const { profile } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the post once — its text does not change while the screen is open.
  useEffect(() => {
    getPost(postId)
      .then(setPost)
      .catch((caught) => setError(describeError(caught)));
  }, [postId]);

  // Comments are live, so a new comment appears without a refresh.
  useEffect(() => {
    const unsubscribe = subscribeToComments(
      postId,
      setComments,
      (listenerError) => setError(describeError(listenerError)),
    );

    return unsubscribe;
  }, [postId]);

  async function handleSend() {
    if (!profile || !post || draft.trim().length === 0) {
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await addComment({ post, author: profile, text: draft });
      setDraft('');
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(comment: Comment) {
    try {
      await deleteComment(postId, comment.id);
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={comments}
        keyExtractor={(comment) => comment.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <ErrorBanner message={error} />
            {post ? (
              <View style={styles.postBlock}>
                <View style={styles.postHeader}>
                  <Avatar name={post.authorName} photoURL={post.authorPhotoURL} size={40} />
                  <View style={styles.postHeaderText}>
                    <Text style={styles.postAuthor}>{post.authorName}</Text>
                    <Text style={styles.postTime}>{timeAgo(post.createdAt)}</Text>
                  </View>
                </View>
                <Text style={styles.postText}>{post.text}</Text>
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>
              Comments {comments.length > 0 ? `(${comments.length})` : ''}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Avatar name={item.authorName} photoURL={item.authorPhotoURL} size={34} />
            <View style={styles.commentBody}>
              <Text style={styles.commentAuthor}>{item.authorName}</Text>
              <Text style={styles.commentText}>{item.text}</Text>
              <View style={styles.commentMeta}>
                <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
                {item.authorId === profile?.uid ? (
                  <Pressable onPress={() => handleDelete(item)}>
                    <Text style={styles.commentDelete}>Delete</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState title="No comments yet" message="Be the first to reply." />
        }
      />

      <View style={styles.composer}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a comment…"
          placeholderTextColor={colors.textMuted}
          style={styles.composerInput}
          multiline
        />
        <Pressable
          onPress={handleSend}
          disabled={busy || draft.trim().length === 0}
          style={[
            styles.sendButton,
            (busy || draft.trim().length === 0) && styles.sendButtonDisabled,
          ]}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg },
  postBlock: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center' },
  postHeaderText: { marginLeft: spacing.md },
  postAuthor: { fontWeight: '700', fontSize: fontSize.md, color: colors.text },
  postTime: { fontSize: fontSize.xs, color: colors.textMuted },
  postText: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 22,
    marginTop: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
  },
  comment: { flexDirection: 'row', marginBottom: spacing.lg },
  commentBody: {
    flex: 1,
    marginLeft: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  commentAuthor: { fontWeight: '700', fontSize: fontSize.sm, color: colors.text },
  commentText: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: 2,
    lineHeight: 20,
  },
  commentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  commentTime: { fontSize: fontSize.xs, color: colors.textMuted },
  commentDelete: { fontSize: fontSize.xs, color: colors.danger, fontWeight: '600' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  composerInput: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.text,
  },
  sendButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
  },
  sendButtonDisabled: { opacity: 0.4 },
  sendText: { color: '#FFFFFF', fontWeight: '700', fontSize: fontSize.sm },
});
