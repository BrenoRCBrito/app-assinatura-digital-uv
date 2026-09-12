import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthentication } from '../hooks/useAuthentication';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { createNavigationTheme } from '../theme/createNavigationTheme';
import { useAppTheme } from '../theme/useAppTheme';
import type { RootStackParamList } from './types';

type HomeNavigation = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { isUnlocked } = useAuthentication();
  const { theme, themeName } = useAppTheme();
  const navigationTheme = useMemo(() => createNavigationTheme(theme, themeName), [theme, themeName]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator>
        {isUnlocked ? (
          <>
            <Stack.Screen name="Home" options={{ title: 'Início' }}>
              {({ navigation }: { navigation: HomeNavigation }) => (
                <HomeScreen onOpenSettings={() => navigation.navigate('Settings')} />
              )}
            </Stack.Screen>
            <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Configurações' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
