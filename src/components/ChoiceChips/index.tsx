import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon } from '../Icon';
import { Text } from '../Text';
import { choiceChipsPresets } from './presets';

export type ChoiceOption<Value extends string> = Readonly<{
  value: Value;
  label: string;
}>;

type ChoiceChipsProps<Value extends string> = Readonly<{
  options: readonly ChoiceOption<Value>[];
  selected: Value | null;
  onSelect: (value: Value) => void;
  accessibilityLabel: string;
}>;

export function ChoiceChips<Value extends string>({
  options,
  selected,
  onSelect,
  accessibilityLabel,
}: ChoiceChipsProps<Value>) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => choiceChipsPresets.default(theme), [theme]);

  return (
    <View style={styles.group} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const isSelected = option.value === selected;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: isSelected }}
            style={({ pressed }) => [styles.chip, isSelected && styles.chipSelected, pressed && styles.pressed]}
            onPress={() => onSelect(option.value)}
          >
            {isSelected ? <Icon name="check" size="chip" color={styles.iconColor} /> : null}
            <Text preset={isSelected ? 'choiceChipSelected' : 'choiceChip'}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
