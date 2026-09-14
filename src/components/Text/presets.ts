import type { TextStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

export const textPresets = {
  brand: (theme: Theme) => ({ ...theme.typography.brand, color: theme.textPrimary }),
  screenTitle: (theme: Theme) => ({ ...theme.typography.screenTitle, color: theme.textPrimary }),
  status: (theme: Theme) => ({ ...theme.typography.status, color: theme.textSecondary }),
  sectionLabel: (theme: Theme) => ({ ...theme.typography.sectionLabel, color: theme.textSecondary }),
  itemTitle: (theme: Theme) => ({ ...theme.typography.itemTitle, color: theme.textPrimary }),
  supporting: (theme: Theme) => ({ ...theme.typography.supporting, color: theme.textSecondary }),
  empty: (theme: Theme) => ({
    ...theme.typography.supporting,
    textAlign: 'center',
    marginTop: theme.inset.emptyTop,
    color: theme.textSecondary,
  }),
  meta: (theme: Theme) => ({ ...theme.typography.meta, color: theme.textMuted }),
  buttonPrimary: (theme: Theme) => ({ ...theme.typography.button, color: theme.onPrimary }),
  buttonSecondary: (theme: Theme) => ({ ...theme.typography.button, color: theme.textSecondary }),
  buttonDanger: (theme: Theme) => ({ ...theme.typography.button, color: theme.onDanger }),
  buttonInverse: (theme: Theme) => ({ ...theme.typography.button, color: theme.primary }),
  chip: (theme: Theme) => ({ ...theme.typography.chip, color: theme.textSecondary }),
  segment: (theme: Theme) => ({ ...theme.typography.segment, color: theme.textSecondary }),
  segmentSelected: (theme: Theme) => ({ ...theme.typography.segment, color: theme.onPrimary }),
  paperMark: (theme: Theme) => ({ ...theme.typography.paperMark, color: FIXED_COLORS.paperGuide }),
  paperHint: (theme: Theme) => ({
    ...theme.typography.supporting,
    textAlign: 'center',
    color: FIXED_COLORS.paperGuide,
  }),
  featureTitle: (theme: Theme) => ({ ...theme.typography.screenTitle, color: theme.onPrimary }),
  featureDescription: (theme: Theme) => ({ ...theme.typography.supporting, color: theme.onPrimaryMuted }),
  cameraHint: (theme: Theme) => ({ ...theme.typography.hint, color: theme.textPrimary }),
  photoTitle: (theme: Theme) => ({ ...theme.typography.photoTitle, color: theme.textPrimary }),
} satisfies Record<string, (theme: Theme) => TextStyle>;

export type TextPresetName = keyof typeof textPresets;
