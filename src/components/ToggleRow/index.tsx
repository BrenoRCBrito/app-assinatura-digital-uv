import React, { useMemo } from 'react';
import { Switch, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Card } from '../Card';
import { Text } from '../Text';
import { toggleRowPresets, type ToggleRowPresetName } from './presets';

type ToggleRowProps = Readonly<{
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  preset?: ToggleRowPresetName;
}>;

export function ToggleRow({ title, description, value, onValueChange, preset = 'default' }: ToggleRowProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => toggleRowPresets[preset](theme), [preset, theme]);

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.texts}>
          <Text preset="itemTitle">{title}</Text>
          <Text preset="supporting">{description}</Text>
        </View>
        <Switch
          accessibilityLabel={title}
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: theme.switchTrackOff, true: theme.switchTrackOn }}
          thumbColor={theme.switchThumb}
        />
      </View>
    </Card>
  );
}
