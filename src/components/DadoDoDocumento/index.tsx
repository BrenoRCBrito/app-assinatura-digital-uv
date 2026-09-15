import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Text } from '../Text';
import { dadoDoDocumentoPresets, type DadoDoDocumentoPresetName } from './presets';

type DadoDoDocumentoProps = Readonly<{
  rotulo: string;
  valor: string;
  preset?: DadoDoDocumentoPresetName;
}>;

export function DadoDoDocumento({ rotulo, valor, preset = 'default' }: DadoDoDocumentoProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => dadoDoDocumentoPresets[preset](theme), [preset, theme]);

  return (
    <View style={styles.dado}>
      <Text preset="dataLabel">{rotulo}</Text>
      <Text preset={styles.valor}>{valor}</Text>
    </View>
  );
}
