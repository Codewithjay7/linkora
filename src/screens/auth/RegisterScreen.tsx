import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Input } from '../../components/Input';
import { register } from '../../services/auth.service';
import { colors, fontSize, spacing } from '../../theme';
import { describeError } from '../../utils/errors';
import { looksLikeEmail } from '../../utils/format';
import type { AuthScreenProps } from '../../navigation/types';

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleRegister() {
    setError(null);

    if (displayName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!looksLikeEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Your password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    try {
      await register({ email, password, displayName });
      // RootNavigator switches to the signed-in app automatically.
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create your account</Text>

        <ErrorBanner message={error} />

        <Input
          label="Full name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          placeholder="Jordan Smith"
        />

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          hint="At least 6 characters."
        />

        <Input
          label="Confirm password"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
        />

        <Button label="Create account" onPress={handleRegister} loading={busy} />

        <Pressable onPress={() => navigation.goBack()} style={styles.linkRow}>
          <Text style={styles.link}>I already have an account</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  linkRow: { paddingVertical: spacing.lg, alignItems: 'center' },
  link: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
});
