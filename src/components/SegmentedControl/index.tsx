import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import type { AppTheme } from '../../theme/appTheme';
import { createStyles } from './styles';

export type SegmentOption<Value extends string> = Readonly<{
  value: Value;
  label: string;
}>;

type SegmentedControlProps<Value extends string> = Readonly<{
  options: readonly SegmentOption<Value>[];
  selected: Value;
  onSelect: (value: Value) => void;
  theme: AppTheme;
}>;

export function SegmentedControl<Value extends string>({
  options,
  selected,
  onSelect,
  theme,
}: SegmentedControlProps<Value>) {
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.track} accessibilityRole="radiogroup">
      {options.map((option) => {
        const isSelected = option.value === selected;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            style={[styles.segment, isSelected && styles.segmentSelected]}
            onPress={() => onSelect(option.value)}
          >
            <Text style={isSelected ? styles.labelSelected : styles.label}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
