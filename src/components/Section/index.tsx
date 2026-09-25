import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Text } from '../Text';
import { sectionPresets, type SectionPresetName } from './presets';

type SectionProps = Readonly<{
  label: string;
  children: React.ReactNode;
  preset?: SectionPresetName;
}>;

export function Section({ label, children, preset = 'default' }: SectionProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => sectionPresets[preset](theme), [preset, theme]);

  return (
    <View style={styles.section}>
      <Text preset={styles.labelPreset}>{label}</Text>
      {children}
    </View>
  );
}

