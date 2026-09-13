/**
 * Linkora — application entry point.
 *
 * The provider order matters:
 *   SafeAreaProvider  — supplies screen inset measurements
 *     AuthProvider    — supplies the signed-in user to every screen
 *       RootNavigator — decides between the signed-out and signed-in app
 */

import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from './src/context/AuthContext';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
