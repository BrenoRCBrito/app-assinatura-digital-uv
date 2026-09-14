import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Text } from '../Text';
import { cardPresets, type CardPresetName } from './presets';

type CardProps = Readonly<{
  title?: string;
  description?: string;
  children: React.ReactNode;
  preset?: CardPresetName;
}>;

export function Card({ title, description, children, preset = 'default' }: CardProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => cardPresets[preset](theme), [preset, theme]);

  return (
    <View style={styles.card}>
      {title === undefined ? null : (
        <View style={styles.heading}>
          <Text preset="itemTitle">{title}</Text>
          {description === undefined ? null : <Text preset="supporting">{description}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}
