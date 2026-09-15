import React, { useMemo } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  type NativeStackNavigationProp,
  type NativeStackScreenProps,
} from '@react-navigation/native-stack';

import { useAuthentication } from '../hooks/useAuthentication';
import { AssinaturasScreen } from '../screens/AssinaturasScreen';
import { DigitalizarDocumentoScreen } from '../screens/DigitalizarDocumentoScreen';
import { DocumentoScreen } from '../screens/DocumentoScreen';
import { HistoricoScreen } from '../screens/HistoricoScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { NovaAssinaturaScreen } from '../screens/NovaAssinaturaScreen';
import { PosicionarAssinaturaScreen } from '../screens/PosicionarAssinaturaScreen';
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
                  onOpenHistorico={() => navigation.navigate('Historico')}
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
                <DigitalizarDocumentoScreen
                  onFechar={() => navigation.goBack()}
                  onUsarFoto={(foto) => navigation.replace('PosicionarAssinatura', { foto })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen
              name="PosicionarAssinatura"
              options={{ title: 'Posicionar assinatura', gestureEnabled: false }}
            >
              {({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'PosicionarAssinatura'>) => (
                <PosicionarAssinaturaScreen
                  foto={route.params.foto}
                  onNovaAssinatura={() => navigation.navigate('NovaAssinatura')}
                  onAssinado={(documentoId) => navigation.replace('Documento', { documentoId })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Historico" options={{ title: 'Histórico' }}>
              {({ navigation }: { navigation: AppNavigation }) => (
                <HistoricoScreen
                  onAbrirDocumento={(documentoId) => navigation.navigate('Documento', { documentoId })}
                />
              )}
            </Stack.Screen>
            <Stack.Screen name="Documento" options={{ title: 'Documento assinado' }}>
              {({ navigation, route }: NativeStackScreenProps<RootStackParamList, 'Documento'>) => (
                <DocumentoScreen
                  documentoId={route.params.documentoId}
                  onNaoEncontrado={() => navigation.goBack()}
                />
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
