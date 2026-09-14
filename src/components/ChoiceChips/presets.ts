import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type ChoiceChipsStyles = Readonly<{
  group: ViewStyle;
  chip: ViewStyle;
  chipSelected: ViewStyle;
  pressed: ViewStyle;
  iconColor: string;
}>;

export const choiceChipsPresets = {
  default: (theme: Theme) => ({
    group: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.gap.choiceChips,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.gap.choiceChip,
      minHeight: theme.size.touchTarget,
      paddingHorizontal: theme.inset.choiceChipX,
      borderRadius: theme.radius.choiceChip,
      borderWidth: theme.lineWidth.outline,
      borderColor: theme.textSecondary,
    },
    chipSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    iconColor: theme.onPrimary,
  }),
} satisfies Record<string, (theme: Theme) => ChoiceChipsStyles>;
