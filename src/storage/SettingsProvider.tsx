import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_SETTINGS, type Settings } from '../domain/settings';
import { lightTheme } from '../theme/appTheme';
import { loadSettings, saveSettings } from './settingsStorage';

type SettingsContextValue = Readonly<{
  settings: Settings;
  updateSettings: (changes: Partial<Settings>) => void;
}>;

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    loadSettings()
      .then((loaded) => {
        if (active) {
          setSettings(loaded);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(
    (changes: Partial<Settings>) => {
      const next: Settings = { ...settings, ...changes };
      setSettings(next);
      saveSettings(next).catch((error: unknown) => {
        console.error('Falha ao salvar as configurações:', error);
        Alert.alert('Erro', 'Não foi possível salvar as configurações.');
      });
    },
    [settings],
  );

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={lightTheme.textSecondary} />
        <Text style={styles.loadingText}>Carregando…</Text>
      </View>
    );
  }

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (context === null) {
    throw new Error('useSettings precisa estar dentro de SettingsProvider.');
  }
  return context;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: lightTheme.background,
  },
  loadingText: {
    fontSize: 15,
    color: lightTheme.textSecondary,
  },
});
