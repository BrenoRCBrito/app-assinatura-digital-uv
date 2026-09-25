import React, { useMemo } from 'react';
import { Image, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon } from '../Icon';
import { IconButton } from '../IconButton';
import { avatarPresets } from './presets';

type AvatarProps = Readonly<{
  fotoBase64: string | null;
  onEditar?: () => void;
}>;

export function Avatar({ fotoBase64, onEditar }: AvatarProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => avatarPresets.default(theme), [theme]);

  return (
    <View style={styles.container}>
      {fotoBase64 === null ? (
        <View style={styles.placeholder}>
          <Icon name="profile" size="standalone" color={theme.onPrimaryMuted} />
        </View>
      ) : (
        <Image
          accessibilityLabel="Foto de perfil"
          source={{ uri: `data:image/jpeg;base64,${fotoBase64}` }}
          style={styles.photo}
        />
      )}
      {onEditar === undefined ? null : (
        <View style={styles.badge}>
          <IconButton icon="edit" label="Editar foto de perfil" onPress={onEditar} preset="badge"  />
        </View>
      )}
    </View>
  );
}
