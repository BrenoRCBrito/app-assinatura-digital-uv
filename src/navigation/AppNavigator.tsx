import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAuthentication } from '../hooks/useAuthentication';
import { AssinaturasScreen } from '../screens/AssinaturasScreen';
import { DigitalizarDocumentoScreen } from '../screens/DigitalizarDocumentoScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NovaAssinaturaScreen } from '../screens/NovaAssinaturaScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { createNavigationTheme } from '../theme/createNavigationTheme';
import { useAppTheme } from '../theme/useAppTheme';
import type { RootStackParamList } from './types';

type AppNavigation = NativeStackNavigationProp<RootStackParamList, keyof RootStackParamList>;

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
              {({ navigation }: { navigation: AppNavigation }) => (
                <HomeScreen
                  onDigitalizarDocumento={() => navigation.navigate('DigitalizarDocumento')}
                  onOpenAssinaturas={() => navigation.navigate('Assinaturas')}
                  onOpenSettings={() => navigation.navigate('Settings')}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Assinaturas" options={{ title: 'Minhas assinaturas' }}>
              {({ navigation }: { navigation: AppNavigation }) => (
                <AssinaturasScreen onNovaAssinatura={() => navigation.navigate('NovaAssinatura')} />
              )}
            </Stack.Screen>
            <Stack.Screen name="NovaAssinatura" options={{ title: 'Nova assinatura', gestureEnabled: false }}>
              {({ navigation }: { navigation: AppNavigation }) => (
                <NovaAssinaturaScreen onSalva={() => navigation.goBack()} />
              )}
            </Stack.Screen>
            <Stack.Screen name="DigitalizarDocumento" options={{ headerShown: false }}>
              {({ navigation }: { navigation: AppNavigation }) => (
                <DigitalizarDocumentoScreen onFechar={() => navigation.goBack()} />
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
