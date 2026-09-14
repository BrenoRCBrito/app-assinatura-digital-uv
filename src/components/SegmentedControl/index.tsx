import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Text } from '../Text';
import { segmentedControlPresets, type SegmentedControlPresetName } from './presets';

export type SegmentOption<Value extends string> = Readonly<{
  value: Value;
  label: string;
}>;

type SegmentedControlProps<Value extends string> = Readonly<{
  options: readonly SegmentOption<Value>[];
  selected: Value;
  onSelect: (value: Value) => void;
  preset?: SegmentedControlPresetName;
}>;

export function SegmentedControl<Value extends string>({
  options,
  selected,
  onSelect,
  preset = 'default',
}: SegmentedControlProps<Value>) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => segmentedControlPresets[preset](theme), [preset, theme]);

  return (
    <View style={styles.track} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = option.value === selected;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            style={({ pressed }) => [styles.segment, isSelected && styles.segmentSelected, pressed && styles.segmentPressed]}
            onPress={() => onSelect(option.value)}
          >
            <Text preset={isSelected ? 'segmentSelected' : 'segment'}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
