import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppTheme } from '../../theme/useAppTheme';
import { createStyles } from './styles';

type HomeScreenProps = Readonly<{
  onLogout: () => void;
}>;

export function HomeScreen({ onLogout }: HomeScreenProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Área Segura</Text>
      <Text style={styles.subtitle}>Usuário logado com sucesso!</Text>
      <View style={styles.actions}>
        <PrimaryButton label="Sair" onPress={onLogout} theme={theme} variant="danger" />
      </View>
    </View>
  );
}
