import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useBiometrics } from '../hooks/useBiometrics';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { createNavigationTheme } from '../theme/createNavigationTheme';
import { useAppTheme } from '../theme/useAppTheme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { hasHardware, isAuthenticated, authenticate, logout } = useBiometrics();
  const { theme, themeName } = useAppTheme();
  const navigationTheme = useMemo(() => createNavigationTheme(theme, themeName), [theme, themeName]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        {isAuthenticated ? (
          <Stack.Screen name="Home" options={{ title: 'Início' }}>
            {() => <HomeScreen onLogout={logout} />}
          </Stack.Screen>
        ) : (
          <Stack.Screen name="Login" options={{ headerShown: false }}>
            {() => <LoginScreen hasHardware={hasHardware} onLogin={authenticate} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
