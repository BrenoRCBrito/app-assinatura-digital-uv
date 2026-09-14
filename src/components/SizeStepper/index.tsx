import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { sizeStepperPresets } from './presets';

type SizeStepperProps = Readonly<{
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
  canDecrease: boolean;
  canIncrease: boolean;
  decreaseLabel: string;
  increaseLabel: string;
}>;

type StepButtonProps = Readonly<{
  icon: IconName;
  label: string;
  enabled: boolean;
  onPress: () => void;
}>;

function StepButton({ icon, label, enabled, onPress }: StepButtonProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => sizeStepperPresets.default(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, !enabled && styles.disabled, pressed && styles.pressed]}
    >
      <Icon name={icon} size="stepper" color={styles.iconColor} />
    </Pressable>
  );
}

export function SizeStepper({
  label,
  value,
  onDecrease,
  onIncrease,
  canDecrease,
  canIncrease,
  decreaseLabel,
  increaseLabel,
}: SizeStepperProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => sizeStepperPresets.default(theme), [theme]);

  return (
    <View style={styles.row}>
      <StepButton icon="minus" label={decreaseLabel} enabled={canDecrease} onPress={onDecrease} />
      <View style={styles.value}>
        <Text preset="supporting">{label}</Text>
        <Text preset="stepperValue">{value}</Text>
      </View>
      <StepButton icon="plus" label={increaseLabel} enabled={canIncrease} onPress={onIncrease} />
    </View>
  );
}
