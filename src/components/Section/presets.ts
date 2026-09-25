import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';
import type { TextPresetName } from '../Text/presets';

export const sectionPresets = {
  default: (theme: Theme) => ({
    section: { gap: theme.gap.label } satisfies ViewStyle,
    labelPreset: 'sectionLabel' as TextPresetName,
  }),
  centered: (theme: Theme) => ({
    section: { gap: theme.gap.label } satisfies ViewStyle,   
    labelPreset: 'sectionLabelCentered' as TextPresetName,
  }),
} satisfies Record<string, (theme: Theme) => { section: ViewStyle; labelPreset: TextPresetName }>;

export type SectionPresetName = keyof typeof sectionPresets;
