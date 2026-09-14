import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { Desenho } from '../../domain/desenho';
import type { LayoutDoSelo } from '../../domain/selo';
import { DesenhoSvg } from '../DesenhoSvg';
import { Text } from '../Text';

type SeloDocumentoProps = Readonly<{
  desenho: Desenho;
  layout: LayoutDoSelo;
  linhas: readonly [string, string];
}>;

export function SeloDocumento({ desenho, layout, linhas }: SeloDocumentoProps) {
  const medidas = useMemo(
    () => ({
      selo: { width: layout.tamanho.width, height: layout.tamanho.height },
      desenho: { height: layout.alturaDoDesenho },
      faixa: { height: layout.alturaDaFaixa },
      texto: { fontSize: layout.tamanhoDaFonte, lineHeight: layout.alturaDaLinha },
    }),
    [layout],
  );

  return (
    <View accessibilityLabel="Selo da assinatura" style={medidas.selo}>
      <View style={medidas.desenho}>
        <DesenhoSvg desenho={desenho} />
      </View>
      <View style={medidas.faixa}>
        <Text preset="stamp" numberOfLines={1} sizing={medidas.texto}>
          {linhas[0]}
        </Text>
        <Text preset="stamp" numberOfLines={1} sizing={medidas.texto}>
          {linhas[1]}
        </Text>
      </View>
    </View>
  );
}
