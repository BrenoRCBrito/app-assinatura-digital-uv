import React, { useMemo } from 'react';
import { Image, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { cartaoDeAcessoRapidoPresets } from './presets';

type CartaoDeAcessoRapidoProps = Readonly<{
  fotoBase64: string | null;
  titulo: string;
  subtitulo: string | null;
}>;

export function CartaoDeAcessoRapido({ fotoBase64, titulo, subtitulo }: CartaoDeAcessoRapidoProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => cartaoDeAcessoRapidoPresets.default(theme), [theme]);

  return (
    <View style={styles.cartao}>
      {fotoBase64 === null ? (
        <View style={styles.semFoto}>
          <Icon name="profile" size="boxed" color={theme.onPrimaryMuted} />
        </View>
      ) : (
        <Image
          accessibilityLabel="Foto de perfil"
          source={{ uri: `data:image/jpeg;base64,${fotoBase64}` }}
          style={styles.foto}
        />
      )}
      <View style={styles.textos}>
        <Text preset="itemTitle" numberOfLines={1}>
          {titulo}
        </Text>
        {subtitulo === null ? null : (
          <Text preset="meta" numberOfLines={1}>
            {subtitulo}
          </Text>
        )}
      </View>
    </View>
  );
}
