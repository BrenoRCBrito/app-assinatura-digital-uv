import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';
import type { TextPresetName } from '../Text/presets';

type ButtonPreset = Readonly<{
  label: TextPresetName;
  container: (theme: Theme) => ViewStyle;
}>;

export const buttonPresets = {
  primary: {
    label: 'buttonPrimary',
    container: (theme: Theme) => ({ backgroundColor: theme.primary }),
  },
  secondary: {
    label: 'buttonSecondary',
    container: (theme: Theme) => ({
      borderWidth: theme.lineWidth.outline,
      borderColor: theme.textSecondary,
    }),
  },
  danger: {
    label: 'buttonDanger',
    container: (theme: Theme) => ({ backgroundColor: theme.danger }),
  },
} satisfies Record<string, ButtonPreset>;

export const buttonSizes = {
  md: (theme: Theme) => ({
    minHeight: theme.size.control,
    paddingVertical: theme.inset.buttonY,
    paddingHorizontal: theme.inset.buttonX,
    borderRadius: theme.radius.control,
    width: '100%',
  }),
  sm: (theme: Theme) => ({
    minHeight: theme.size.touchTarget,
    paddingVertical: theme.inset.dangerY,
    paddingHorizontal: theme.inset.dangerX,
    borderRadius: theme.radius.danger,
  }),
} satisfies Record<string, (theme: Theme) => ViewStyle>;

export type ButtonPresetName = keyof typeof buttonPresets;
export type ButtonSizeName = keyof typeof buttonSizes;
