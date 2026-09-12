import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { DesenhoSvg } from '../../components/DesenhoSvg';
import { PrimaryButton } from '../../components/PrimaryButton';
import type { Assinatura } from '../../domain/assinatura';
import { formatDate } from '../../domain/format';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { useAppTheme } from '../../theme/useAppTheme';
import { createStyles } from './styles';

type AssinaturasScreenProps = Readonly<{
  onNovaAssinatura: () => void;
}>;

export function AssinaturasScreen({ onNovaAssinatura }: AssinaturasScreenProps) {
  const { assinaturas: repositorio } = useRepositories();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [assinaturas, setAssinaturas] = useState<readonly Assinatura[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setAssinaturas(await repositorio.list());
    } catch (error) {
      console.error('Falha ao carregar as assinaturas:', error);
      setAssinaturas([]);
      Alert.alert('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, [repositorio]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  async function excluir(assinatura: Assinatura) {
    try {
      await repositorio.delete(assinatura.id);
      await carregar();
    } catch (error) {
      console.error('Falha ao excluir a assinatura:', error);
      Alert.alert('Erro', 'Não foi possível excluir a assinatura.');
    }
  }

  function confirmarExclusao(assinatura: Assinatura) {
    Alert.alert('Excluir assinatura', `Excluir "${assinatura.nome}"? Documentos já assinados não mudam.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          void excluir(assinatura);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <FlatList
        data={assinaturas}
        keyExtractor={(assinatura) => assinatura.id}
        contentContainerStyle={styles.lista}
        ListEmptyComponent={
          carregando ? (
            <ActivityIndicator color={theme.textSecondary} />
          ) : (
            <Text style={styles.vazio}>Nenhuma assinatura salva. Toque em Nova assinatura para desenhar a primeira.</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={styles.cartao}>
            <View style={styles.previa}>
              <DesenhoSvg desenho={item.desenho} />
            </View>
            <View style={styles.textos}>
              <Text style={styles.nome} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={styles.data}>Criada em {formatDate(item.criadaEm)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Excluir ${item.nome}`}
              style={styles.excluir}
              onPress={() => confirmarExclusao(item)}
            >
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path d="M4 7h16" stroke={theme.textSecondary} strokeWidth={1.8} strokeLinecap="round" fill="none" />
                <Path d="M9.5 7V4.5h5V7" stroke={theme.textSecondary} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
                <Path d="M6.5 7l1 13h9l1-13" stroke={theme.textSecondary} strokeWidth={1.8} strokeLinejoin="round" fill="none" />
              </Svg>
            </Pressable>
          </View>
        )}
      />
      <View style={styles.rodape}>
        <PrimaryButton label="Nova assinatura" onPress={onNovaAssinatura} theme={theme} />
      </View>
    </SafeAreaView>
  );
}
