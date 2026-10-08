import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile } from './types';

import { Platform } from 'react-native';

const STORAGE_KEY_SERVER_URL = '@indowings_server_url';
const STORAGE_KEY_AUTH_TOKEN = '@indowings_auth_token';
const STORAGE_KEY_USER_PROFILE = '@indowings_user_profile';

export const getAutoServerUrl = (): string => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location) {
    const hostname = window.location.hostname || 'localhost';
    return `http://${hostname}:5000`;
  }
  return 'http://192.168.21.152:5000';
};

export const DEFAULT_SERVER_URL = getAutoServerUrl();

export const getServerUrl = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY_SERVER_URL);
    if (saved && saved.trim()) {
      return saved.trim();
    }
    return getAutoServerUrl();
  } catch {
    return getAutoServerUrl();
  }
};

export const setServerUrl = async (url: string): Promise<void> => {
  try {
    const cleanUrl = url.trim().replace(/\/+$/, '');
    await AsyncStorage.setItem(STORAGE_KEY_SERVER_URL, cleanUrl);
  } catch (err) {
    console.error('Failed to save server URL', err);
  }
};

export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_AUTH_TOKEN);
  } catch {
    return null;
  }
};

export const setAuthToken = async (token: string | null): Promise<void> => {
  try {
    if (token) {
      await AsyncStorage.setItem(STORAGE_KEY_AUTH_TOKEN, token);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_AUTH_TOKEN);
    }
  } catch (err) {
    console.error('Failed to save auth token', err);
  }
};

export const getUserProfile = async (): Promise<UserProfile | null> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_USER_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setUserProfile = async (profile: UserProfile | null): Promise<void> => {
  try {
    if (profile) {
      await AsyncStorage.setItem(STORAGE_KEY_USER_PROFILE, JSON.stringify(profile));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_USER_PROFILE);
    }
  } catch (err) {
    console.error('Failed to save user profile', err);
  }
};

export const getPilotName = async (): Promise<string> => {
  try {
    const profile = await getUserProfile();
    return profile?.name || 'Pilot';
  } catch {
    return 'Pilot';
  }
};

export const setPilotName = async (name: string): Promise<void> => {
  try {
    const profile = await getUserProfile();
    if (profile) {
      profile.name = name;
      await setUserProfile(profile);
    }
  } catch (err) {
    console.error('Failed to set pilot name', err);
  }
};

