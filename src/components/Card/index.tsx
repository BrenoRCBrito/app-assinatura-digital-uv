import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { cardPresets, type CardPresetName } from './presets';

type CardProps = Readonly<{
  children: React.ReactNode;
  preset?: CardPresetName;
}>;

export function Card({ children, preset = 'default' }: CardProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => cardPresets[preset](theme), [preset, theme]);

  return <View style={styles.card}>{children}</View>;
}
