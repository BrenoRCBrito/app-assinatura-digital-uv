import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import type { DocumentoAssinado } from '../../domain/documento';
import { formatDateTime, formatLocal } from '../../domain/format';
import { useAppTheme } from '../../theme';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { documentoItemPresets } from './presets';

type DocumentoItemProps = Readonly<{
  documento: DocumentoAssinado;
  onPress: () => void;
}>;

export function DocumentoItem({ documento, onPress }: DocumentoItemProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => documentoItemPresets.default(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      <View style={styles.iconBox}>
        <Icon name="document" size="boxed" color={styles.iconColor} />
      </View>
      <View style={styles.texts}>
        <Text preset="itemTitle" numberOfLines={1}>
          {documento.titulo}
        </Text>
        <Text preset="meta" numberOfLines={1}>
          {`${formatDateTime(documento.assinadoEm)} · ${formatLocal(documento.local)}`}
        </Text>
      </View>
      <Icon name="chevronRight" size="trailing" color={styles.chevronColor} />
    </Pressable>
  );
}
