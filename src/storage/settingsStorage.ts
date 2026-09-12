import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS, parseSettings, type Settings } from '../domain/settings';

export const SETTINGS_STORAGE_KEY = '@assinaaqui/settings';

export async function loadSettings(): Promise<Settings> {
  try {
    const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored === null) {
      return DEFAULT_SETTINGS;
    }
    return parseSettings(JSON.parse(stored));
  } catch (error) {
    console.error('Falha ao carregar as configurações:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
