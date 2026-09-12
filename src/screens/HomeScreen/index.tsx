import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppTheme } from '../../theme/useAppTheme';
import { createStyles } from './styles';

type HomeScreenProps = Readonly<{
  onLogout: () => void;
  onOpenSettings: () => void;
}>;

export function HomeScreen({ onLogout, onOpenSettings }: HomeScreenProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Área Segura</Text>
      <Text style={styles.subtitle}>Usuário logado com sucesso!</Text>
      <View style={styles.actions}>
        <PrimaryButton label="Configurações" onPress={onOpenSettings} theme={theme} />
        <PrimaryButton label="Sair" onPress={onLogout} theme={theme} variant="danger" />
      </View>
    </View>
  );
}
