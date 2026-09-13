import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { Assinatura } from '../../domain/assinatura';
import { formatDate } from '../../domain/format';
import { useAppTheme } from '../../theme';
import { DesenhoSvg } from '../DesenhoSvg';
import { IconButton } from '../IconButton';
import { Text } from '../Text';
import { assinaturaItemPresets } from './presets';

type AssinaturaItemProps = Readonly<{
  assinatura: Assinatura;
  onExcluir: () => void;
}>;

export function AssinaturaItem({ assinatura, onExcluir }: AssinaturaItemProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => assinaturaItemPresets.default(theme), [theme]);

  return (
    <View style={styles.item}>
      <View style={styles.preview}>
        <DesenhoSvg desenho={assinatura.desenho} />
      </View>
      <View style={styles.texts}>
        <Text preset="itemTitle" numberOfLines={1}>
          {assinatura.nome}
        </Text>
        <Text preset="meta">Criada em {formatDate(assinatura.criadaEm)}</Text>
      </View>
      <IconButton icon="trash" label={`Excluir ${assinatura.nome}`} onPress={onExcluir} />
    </View>
  );
}
