import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <SettingsProvider>
          <RepositoriesProvider>
            <AuthenticationProvider>
              <ThemedApp />
            </AuthenticationProvider>
          </RepositoriesProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
