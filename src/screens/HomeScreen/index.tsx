import React, { useMemo } from 'react';
import { Text, View } from 'react-native';

import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthentication } from '../../hooks/useAuthentication';
import { useAppTheme } from '../../theme/useAppTheme';
import { createStyles } from './styles';

type HomeScreenProps = Readonly<{
  onOpenAssinaturas: () => void;
  onOpenSettings: () => void;
}>;

export function HomeScreen({ onOpenAssinaturas, onOpenSettings }: HomeScreenProps) {
  const { theme } = useAppTheme();
  const { lock } = useAuthentication();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Área Segura</Text>
      <Text style={styles.subtitle}>Usuário logado com sucesso!</Text>
      <View style={styles.actions}>
        <PrimaryButton label="Minhas assinaturas" onPress={onOpenAssinaturas} theme={theme} />
        <PrimaryButton label="Configurações" onPress={onOpenSettings} theme={theme} variant="secondary" />
        <PrimaryButton label="Sair" onPress={lock} theme={theme} variant="danger" />
      </View>
    </View>
  );
}
