/**
 * Route names and their parameters.
 *
 * Typing these means TypeScript catches a typo in `navigation.navigate(...)`
 * at compile time instead of at runtime on the device.
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Screens shown when signed out. */
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

/** Screens shown when signed in. */
export type MainStackParamList = {
  Tabs: undefined;
  CreatePost: undefined;
  PostDetail: { postId: string };
  EditProfile: undefined;
  Settings: undefined;
  UserProfile: { uid: string };
};

/** The four bottom tabs. */
export type MainTabParamList = {
  Home: undefined;
  Network: undefined;
  Notifications: undefined;
  Profile: undefined;
};

export type AuthScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

export type MainScreenProps<T extends keyof MainStackParamList> = NativeStackScreenProps<
  MainStackParamList,
  T
>;
