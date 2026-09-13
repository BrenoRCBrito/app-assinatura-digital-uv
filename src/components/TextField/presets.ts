import type { TextStyle, ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type TextFieldStyles = Readonly<{
  field: ViewStyle;
  input: TextStyle;
  placeholderColor: string;
}>;

export const textFieldPresets = {
  default: (theme: Theme) => ({
    field: { gap: theme.gap.fieldLabel },
    input: {
      height: theme.size.control,
      paddingHorizontal: theme.inset.inputX,
      borderRadius: theme.radius.control,
      borderWidth: theme.lineWidth.hairline,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      fontSize: theme.typography.input.fontSize,
      color: theme.textPrimary,
    },
    placeholderColor: theme.textMuted,
  }),
} satisfies Record<string, (theme: Theme) => TextFieldStyles>;

export type TextFieldPresetName = keyof typeof textFieldPresets;
