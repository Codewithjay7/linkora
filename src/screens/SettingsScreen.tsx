import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { ErrorBanner } from '../components/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { firebaseConfig } from '../config/env';
import { logout } from '../services/auth.service';
import { colors, fontSize, radius, spacing } from '../theme';
import { describeError } from '../utils/errors';

/** One label/value line in the info card. */
function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} selectable numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function SettingsScreen() {
  const { user, profile } = useAuth();
  const [error, setError] = useState<string | null>(null);

  function confirmLogout() {
    Alert.alert('Sign out', 'You will need to sign in again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (caught) {
            setError(describeError(caught));
          }
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ErrorBanner message={error} />

      <Text style={styles.sectionTitle}>Account</Text>
      <View style={styles.card}>
        <Row label="Name" value={profile?.displayName || '—'} />
        <Row label="Email" value={user?.email ?? '—'} />
        <Row label="User ID" value={user?.uid ?? '—'} />
      </View>

      {/*
        This card exists so you can confirm, on the device itself, exactly which
        backend the running app is talking to. If it ever shows a project ID
        other than linkora-a274a, something is wrong with your .env file.
      */}
      <Text style={styles.sectionTitle}>Backend</Text>
      <View style={styles.card}>
        <Row label="Firebase project" value={firebaseConfig.projectId} />
        <Row label="Auth domain" value={firebaseConfig.authDomain} />
        <Row label="Storage bucket" value={firebaseConfig.storageBucket} />
      </View>
      <Text style={styles.note}>
        Linkora talks to this Firebase project and nothing else. It does not use any company
        server, database, VPN or network.
      </Text>

      <Button
        label="Sign out"
        variant="danger"
        onPress={confirmLogout}
        style={styles.signOut}
      />

      <Text style={styles.version}>Linkora 1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  row: {
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: fontSize.xs, color: colors.textMuted, marginBottom: 2 },
  rowValue: { fontSize: fontSize.md, color: colors.text },
  note: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    marginTop: spacing.md,
    lineHeight: 17,
  },
  signOut: { marginTop: spacing.xxl },
  version: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
