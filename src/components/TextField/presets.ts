import type { TextStyle, ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type TextFieldStyles = Readonly<{
  field: ViewStyle;
  container: ViewStyle;
  input: TextStyle;
  placeholderColor: string;
}>;

const padrao = (theme: Theme): TextFieldStyles => ({
  field: { gap: theme.gap.label },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.gap.icon,
    height: theme.size.control,
    paddingHorizontal: theme.inset.inputX,
    borderRadius: theme.radius.control,
    borderWidth: theme.lineWidth.hairline,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  input: {
    flex: 1,
    fontSize: theme.typography.input.fontSize,
    color: theme.textPrimary,
  },
  placeholderColor: theme.textMuted,
});

export const textFieldPresets = {
  default: padrao,
  multiline: (theme: Theme): TextFieldStyles => {
    const base = padrao(theme);
    return {
      ...base,
      container: {
        ...base.container,
        height: 'auto',
        minHeight: theme.size.control * 3,
        alignItems: 'flex-start',
        paddingVertical: theme.inset.inputX,
      },
      input: { ...base.input, textAlignVertical: 'top' },
    };
  },
} satisfies Record<string, (theme: Theme) => TextFieldStyles>;

export type TextFieldPresetName = keyof typeof textFieldPresets;
