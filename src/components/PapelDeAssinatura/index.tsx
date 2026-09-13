import React, { useMemo } from 'react';
import { View } from 'react-native';

import type { Traco } from '../../domain/desenho';
import { SignaturePad } from '../../gestures/SignaturePad';
import { useAppTheme } from '../../theme';
import { Text } from '../Text';
import { papelDeAssinaturaPresets } from './presets';

type PapelDeAssinaturaProps = Readonly<{
  tracos: readonly Traco[];
  aoMudarTracos: (tracos: readonly Traco[]) => void;
}>;

export function PapelDeAssinatura({ tracos, aoMudarTracos }: PapelDeAssinaturaProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => papelDeAssinaturaPresets.default(theme), [theme]);

  return (
    <View style={styles.paper}>
      <SignaturePad tracos={tracos} aoMudarTracos={aoMudarTracos} />
      <View style={styles.guide}>
        <View style={styles.guideRow}>
          <Text preset="paperMark">X</Text>
          <View style={styles.guideLine} />
        </View>
        <Text preset="paperHint">Assine acima da linha</Text>
      </View>
    </View>
  );
}
