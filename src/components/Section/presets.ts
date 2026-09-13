import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const sectionPresets = {
  default: (theme: Theme) => ({
    section: { gap: theme.gap.sectionLabel },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;

export type SectionPresetName = keyof typeof sectionPresets;
