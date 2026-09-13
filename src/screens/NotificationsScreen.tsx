import React, { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Avatar } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '../services/notifications.service';
import { colors, fontSize, radius, spacing } from '../theme';
import { describeError } from '../utils/errors';
import { timeAgo } from '../utils/format';
import type { AppNotification } from '../types';
import type { MainStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

/** Turns a notification type into the sentence shown in the list. */
function describeNotification(notification: AppNotification): string {
  switch (notification.type) {
    case 'like':
      return 'liked your post';
    case 'comment':
      return 'commented on your post';
    case 'connection_request':
      return 'wants to connect with you';
    case 'connection_accepted':
      return 'accepted your connection request';
    default:
      return 'interacted with you';
  }
}

export function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { profile } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    const unsubscribe = subscribeToNotifications(
      profile.uid,
      setNotifications,
      (listenerError) => setError(describeError(listenerError)),
    );

    return unsubscribe;
  }, [profile]);

  async function handleOpen(notification: AppNotification) {
    if (!profile) return;

    if (!notification.read) {
      markNotificationRead(profile.uid, notification.id).catch(() => {
        // Not being able to mark it read must not block navigation.
      });
    }

    if (notification.targetPostId) {
      navigation.navigate('PostDetail', { postId: notification.targetPostId });
    } else {
      navigation.navigate('UserProfile', { uid: notification.actorId });
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && profile ? (
          <Pressable onPress={() => markAllNotificationsRead(profile.uid)}>
            <Text style={styles.markAll}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<ErrorBanner message={error} />}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleOpen(item)}
            style={[styles.row, !item.read && styles.rowUnread]}
          >
            <Avatar name={item.actorName} photoURL={item.actorPhotoURL} size={40} />
            <View style={styles.rowText}>
              <Text style={styles.message}>
                <Text style={styles.actor}>{item.actorName || 'Someone'}</Text>{' '}
                {describeNotification(item)}
              </Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            {!item.read ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="No notifications"
            message="Likes, comments and connection requests will show up here."
          />
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
  title: { fontSize: fontSize.xl, fontWeight: '800', color: colors.text },
  markAll: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  list: { padding: spacing.lg },
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
  rowUnread: { borderColor: colors.primary, borderWidth: 1.5 },
  rowText: { flex: 1, marginLeft: spacing.md },
  message: { fontSize: fontSize.md, color: colors.text, lineHeight: 20 },
  actor: { fontWeight: '700' },
  time: { fontSize: fontSize.xs, color: colors.textMuted, marginTop: 2 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
    marginLeft: spacing.sm,
  },
});
