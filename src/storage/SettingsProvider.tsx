import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

import { DEFAULT_SETTINGS, type Settings } from '../domain/settings';
import { darkTheme } from '../theme/appTheme';
import { tokens } from '../theme/tokens';
import { loadSettings, saveSettings } from './settingsStorage';

type SettingsContextValue = Readonly<{
  settings: Settings;
  updateSettings: (changes: Partial<Settings>) => void;
}>;

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  // O state só muda no próximo render; a ref guarda a última versão para duas chamadas seguidas.
  const latestSettings = useRef<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let active = true;

    loadSettings()
      .then((loaded) => {
        if (active) {
          latestSettings.current = loaded;
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

  const updateSettings = useCallback((changes: Partial<Settings>) => {
    const next: Settings = { ...latestSettings.current, ...changes };
    latestSettings.current = next;
    setSettings(next);
    saveSettings(next).catch((error: unknown) => {
      console.error('Falha ao salvar as configurações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    });
  }, []);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={darkTheme.textSecondary} />
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
    gap: tokens.gap.loading,
    backgroundColor: darkTheme.background,
  },
  loadingText: {
    fontSize: tokens.typography.loading.fontSize,
    color: darkTheme.textSecondary,
  },
});
