import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import { AuthenticationProvider } from './src/hooks/useAuthentication';
import { AppNavigator } from './src/navigation/AppNavigator';
import { RepositoriesProvider } from './src/storage/RepositoriesProvider';
import { SettingsProvider } from './src/storage/SettingsProvider';
import { useAppTheme } from './src/theme/useAppTheme';

function ThemedApp() {
  const { themeName } = useAppTheme();

  return (
    <>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
      <Toast />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <RepositoriesProvider>
          <AuthenticationProvider>
            <ThemedApp />
          </AuthenticationProvider>
        </RepositoriesProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
