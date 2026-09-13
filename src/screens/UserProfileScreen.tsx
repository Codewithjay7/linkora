import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import {
  acceptConnectionRequest,
  getConnectionBetween,
  removeConnection,
  sendConnectionRequest,
} from '../services/connections.service';
import { subscribeToUserPosts } from '../services/posts.service';
import { getUserProfile } from '../services/users.service';
import { colors, fontSize, radius, spacing } from '../theme';
import { describeError } from '../utils/errors';
import { timeAgo } from '../utils/format';
import type { Connection, Post, UserProfile } from '../types';
import type { MainScreenProps } from '../navigation/types';

/** Somebody else's profile, opened from the feed or the network list. */
export function UserProfileScreen({ route }: MainScreenProps<'UserProfile'>) {
  const { uid } = route.params;
  const { profile: me } = useAuth();

  const [person, setPerson] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [connection, setConnection] = useState<Connection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const isMe = me?.uid === uid;

  useEffect(() => {
    getUserProfile(uid)
      .then(setPerson)
      .catch((caught) => setError(describeError(caught)))
      .finally(() => setLoading(false));
  }, [uid]);

  useEffect(() => {
    const unsubscribe = subscribeToUserPosts(
      uid,
      setPosts,
      (listenerError) => setError(describeError(listenerError)),
    );

    return unsubscribe;
  }, [uid]);

  /** Re-reads the connection state after any change. */
  async function refreshConnection() {
    if (!me || isMe) return;

    try {
      setConnection(await getConnectionBetween(me.uid, uid));
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  useEffect(() => {
    refreshConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me, uid]);

  async function handleConnect() {
    if (!me) return;

    setBusy(true);
    setError(null);
    try {
      await sendConnectionRequest({ requester: me, recipientId: uid });
      await refreshConnection();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleAccept() {
    if (!me || !connection) return;

    setBusy(true);
    try {
      await acceptConnectionRequest({ connection, accepter: me });
      await refreshConnection();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!connection) return;

    setBusy(true);
    try {
      await removeConnection(connection.id);
      setConnection(null);
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  /** The connect / accept / remove button, depending on the current state. */
  function connectionAction() {
    if (isMe) return null;

    if (!connection) {
      return <Button label="Connect" onPress={handleConnect} loading={busy} />;
    }
    if (connection.status === 'accepted') {
      return (
        <Button label="Remove connection" variant="secondary" onPress={handleRemove} loading={busy} />
      );
    }
    if (connection.recipientId === me?.uid) {
      return <Button label="Accept request" onPress={handleAccept} loading={busy} />;
    }
    return <Button label="Request sent" variant="secondary" onPress={handleRemove} loading={busy} />;
  }

  if (loading) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!person) {
    return (
      <View style={styles.centre}>
        <EmptyState title="Profile not found" message="This person may have deleted their account." />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      data={posts}
      keyExtractor={(post) => post.id}
      contentContainerStyle={styles.list}
      ListHeaderComponent={
        <View>
          <ErrorBanner message={error} />

          <View style={styles.card}>
            <Avatar name={person.displayName} photoURL={person.photoURL} size={84} />
            <Text style={styles.name}>{person.displayName || 'Linkora member'}</Text>
            {person.headline ? <Text style={styles.headline}>{person.headline}</Text> : null}
            {person.location ? <Text style={styles.location}>📍 {person.location}</Text> : null}
            {person.bio ? <Text style={styles.bio}>{person.bio}</Text> : null}

            <View style={styles.actionWrap}>{connectionAction()}</View>
          </View>

          <Text style={styles.sectionTitle}>Posts ({posts.length})</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.postRow}>
          <Text style={styles.postText}>{item.text || '(image post)'}</Text>
          <Text style={styles.postMeta}>
            {timeAgo(item.createdAt)} · {item.likeCount} likes · {item.commentCount} comments
          </Text>
        </View>
      )}
      ListEmptyComponent={<EmptyState title="No posts yet" />}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
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
  location: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: spacing.xs },
  bio: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
    lineHeight: 21,
  },
  actionWrap: { alignSelf: 'stretch', marginTop: spacing.lg },
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
