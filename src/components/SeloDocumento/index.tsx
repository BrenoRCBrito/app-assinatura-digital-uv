import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { Desenho } from '../../domain/desenho';
import type { CorDoSelo, LayoutDoSelo } from '../../domain/selo';
import { TINTAS_DO_SELO } from '../../theme';
import { DesenhoSvg } from '../DesenhoSvg';
import { Text } from '../Text';

type SeloDocumentoProps = Readonly<{
  desenho: Desenho;
  layout: LayoutDoSelo;
  linhas: readonly [string, string];
  cor: CorDoSelo;
}>;

export function SeloDocumento({ desenho, layout, linhas, cor }: SeloDocumentoProps) {
  const medidas = useMemo(
    () => ({
      selo: { width: layout.tamanho.width, height: layout.tamanho.height },
      desenho: { height: layout.alturaDoDesenho },
      faixa: { height: layout.alturaDaFaixa },
      texto: { fontSize: layout.tamanhoDaFonte, lineHeight: layout.alturaDaLinha },
    }),
    [layout],
  );
  const textoDaFaixa = cor === 'clara' ? 'stampLight' : 'stamp';

  return (
    <View accessibilityLabel="Selo da assinatura" style={medidas.selo}>
      <View style={medidas.desenho}>
        <DesenhoSvg desenho={desenho} cor={TINTAS_DO_SELO[cor]} />
      </View>
      <View style={medidas.faixa}>
        <Text preset={textoDaFaixa} numberOfLines={1} sizing={medidas.texto}>
          {linhas[0]}
        </Text>
        <Text preset={textoDaFaixa} numberOfLines={1} sizing={medidas.texto}>
          {linhas[1]}
        </Text>
      </View>
    </View>
  );
}
