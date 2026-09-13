import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { HomeScreen } from '../screens/HomeScreen';
import { NetworkScreen } from '../screens/NetworkScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

/**
 * Emoji are used as tab icons so the project has no icon-font dependency.
 * Swap in `@expo/vector-icons` later if you want a more polished look.
 */
function tabIcon(symbol: string) {
  return function TabIcon({ color }: { color: string }) {
    return <Text style={{ fontSize: 20, color }}>{symbol}</Text>;
  };
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: tabIcon('🏠') }}
      />
      <Tab.Screen
        name="Network"
        component={NetworkScreen}
        options={{ tabBarIcon: tabIcon('👥') }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarIcon: tabIcon('🔔') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: tabIcon('👤') }}
      />
    </Tab.Navigator>
  );
}
