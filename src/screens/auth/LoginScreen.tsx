import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button } from '../../components/Button';
import { ErrorBanner } from '../../components/ErrorBanner';
import { Input } from '../../components/Input';
import { login, requestPasswordReset } from '../../services/auth.service';
import { colors, fontSize, spacing } from '../../theme';
import { describeError } from '../../utils/errors';
import { looksLikeEmail } from '../../utils/format';
import type { AuthScreenProps } from '../../navigation/types';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin() {
    setError(null);
    setNotice(null);

    if (!looksLikeEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length === 0) {
      setError('Please enter your password.');
      return;
    }

    setBusy(true);
    try {
      await login(email, password);
      // No navigation call needed — RootNavigator swaps automatically on login.
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function handleReset() {
    setError(null);
    setNotice(null);

    if (!looksLikeEmail(email)) {
      setError('Enter your email address first, then tap "Forgot password".');
      return;
    }

    try {
      await requestPasswordReset(email);
      setNotice('Password reset email sent. Check your inbox.');
    } catch (caught) {
      setError(describeError(caught));
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.brand}>Linkora</Text>
        <Text style={styles.tagline}>Your personal professional network.</Text>

        <ErrorBanner message={error} />
        {notice ? <Text style={styles.notice}>{notice}</Text> : null}

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          placeholder="you@example.com"
        />

        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          placeholder="Your password"
        />

        <Button label="Sign in" onPress={handleLogin} loading={busy} />

        <Pressable onPress={handleReset} style={styles.linkRow}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        <View style={styles.divider} />

        <Button
          label="Create a new account"
          variant="secondary"
          onPress={() => navigation.navigate('Register')}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  brand: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  notice: {
    color: colors.success,
    fontSize: fontSize.sm,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  linkRow: { paddingVertical: spacing.md, alignItems: 'center' },
  link: { color: colors.primary, fontSize: fontSize.sm, fontWeight: '600' },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
});
