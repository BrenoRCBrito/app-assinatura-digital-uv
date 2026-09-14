import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type SizeStepperStyles = Readonly<{
  row: ViewStyle;
  button: ViewStyle;
  pressed: ViewStyle;
  disabled: ViewStyle;
  value: ViewStyle;
  iconColor: string;
}>;

export const sizeStepperPresets = {
  default: (theme: Theme) => ({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.gap.stepper,
    },
    button: {
      alignItems: 'center',
      justifyContent: 'center',
      width: theme.size.touchTarget,
      height: theme.size.touchTarget,
      borderRadius: theme.radius.stepper,
      borderWidth: theme.lineWidth.outline,
      borderColor: theme.textSecondary,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    disabled: {
      opacity: theme.opacity.disabled,
    },
    value: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'center',
      gap: theme.gap.stepperLabel,
    },
    iconColor: theme.textSecondary,
  }),
} satisfies Record<string, (theme: Theme) => SizeStepperStyles>;
