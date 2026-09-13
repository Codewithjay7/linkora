import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import {
  acceptConnectionRequest,
  removeConnection,
  sendConnectionRequest,
  subscribeToMyConnections,
} from '../services/connections.service';
import { listOtherUsers } from '../services/users.service';
import { colors, fontSize, radius, spacing } from '../theme';
import { describeError } from '../utils/errors';
import { connectionIdFor, type Connection, type UserProfile } from '../types';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export function NetworkScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuth();

  const [people, setPeople] = useState<UserProfile[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pendingUid, setPendingUid] = useState<string | null>(null);

  // Load the directory of other people once.
  useEffect(() => {
    if (!profile) return;

    listOtherUsers(profile.uid)
      .then(setPeople)
      .catch((caught) => setError(describeError(caught)));
  }, [profile]);

  // Watch my connections so buttons update the moment something changes.
  useEffect(() => {
    if (!profile) return;

    const unsubscribe = subscribeToMyConnections(
      profile.uid,
      setConnections,
      (listenerError) => setError(describeError(listenerError)),
    );

    return unsubscribe;
  }, [profile]);

  /** Requests waiting for me to accept. */
  const incoming = useMemo(
    () =>
      connections.filter(
        (connection) =>
          connection.status === 'pending' && connection.recipientId === profile?.uid,
      ),
    [connections, profile],
  );

  /** Fast lookup from connection id to connection. */
  const byId = useMemo(
    () => new Map(connections.map((connection) => [connection.id, connection])),
    [connections],
  );

  function relationshipWith(uid: string): Connection | undefined {
    if (!profile) return undefined;
    return byId.get(connectionIdFor(profile.uid, uid));
  }

  async function handleConnect(target: UserProfile) {
    if (!profile) return;

    setPendingUid(target.uid);
    setError(null);
    try {
      await sendConnectionRequest({ requester: profile, recipientId: target.uid });
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setPendingUid(null);
    }
  }

  async function handleAccept(connection: Connection) {
    if (!profile) return;

    setError(null);
    try {
      await acceptConnectionRequest({ connection, accepter: profile });
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  async function handleRemove(connection: Connection) {
    setError(null);
    try {
      await removeConnection(connection.id);
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  /** Renders the right button for whatever state this person is in. */
  function actionFor(person: UserProfile) {
    const connection = relationshipWith(person.uid);

    if (!connection) {
      return (
        <Button
          label="Connect"
          variant="secondary"
          loading={pendingUid === person.uid}
          onPress={() => handleConnect(person)}
          style={styles.actionButton}
        />
      );
    }

    if (connection.status === 'accepted') {
      return (
        <Pressable onPress={() => handleRemove(connection)}>
          <Text style={styles.mutedAction}>Connected · Remove</Text>
        </Pressable>
      );
    }

    if (connection.recipientId === profile?.uid) {
      return (
        <Button
          label="Accept"
          onPress={() => handleAccept(connection)}
          style={styles.actionButton}
        />
      );
    }

    return <Text style={styles.mutedAction}>Request sent</Text>;
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Text style={styles.title}>My network</Text>

      <FlatList
        data={people}
        keyExtractor={(person) => person.uid}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <ErrorBanner message={error} />

            {incoming.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Invitations ({incoming.length})
                </Text>
                {incoming.map((connection) => {
                  const requester = people.find((p) => p.uid === connection.requesterId);
                  return (
                    <View key={connection.id} style={styles.row}>
                      <Avatar
                        name={requester?.displayName ?? 'Member'}
                        photoURL={requester?.photoURL}
                        size={44}
                      />
                      <View style={styles.rowText}>
                        <Text style={styles.name}>
                          {requester?.displayName ?? 'Linkora member'}
                        </Text>
                        <Text style={styles.headline}>wants to connect</Text>
                      </View>
                      <View style={styles.rowActions}>
                        <Button
                          label="Accept"
                          onPress={() => handleAccept(connection)}
                          style={styles.actionButton}
                        />
                        <Pressable onPress={() => handleRemove(connection)}>
                          <Text style={styles.declineText}>Decline</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>People on Linkora</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.rowMain}
              onPress={() => navigation.navigate('UserProfile', { uid: item.uid })}
            >
              <Avatar name={item.displayName} photoURL={item.photoURL} size={44} />
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.displayName || 'Linkora member'}
                </Text>
                {item.headline ? (
                  <Text style={styles.headline} numberOfLines={1}>
                    {item.headline}
                  </Text>
                ) : null}
              </View>
            </Pressable>
            <View style={styles.rowActions}>{actionFor(item)}</View>
          </View>
        )}
        ListEmptyComponent={
          <EmptyState
            title="Nobody else here yet"
            message="Register a second account to try out connections."
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  list: { padding: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowText: { marginLeft: spacing.md, flex: 1 },
  rowActions: { marginLeft: spacing.md, alignItems: 'flex-end' },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  headline: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 1 },
  actionButton: { minHeight: 36, paddingHorizontal: spacing.lg },
  mutedAction: { fontSize: fontSize.xs, color: colors.textMuted, fontWeight: '600' },
  declineText: {
    fontSize: fontSize.xs,
    color: colors.danger,
    fontWeight: '600',
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});
