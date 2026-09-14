import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const segmentedControlPresets = {
  default: (theme: Theme) => ({
    track: {
      flexDirection: 'row',
      gap: theme.gap.segment,
      padding: theme.inset.segmentTrack,
      borderRadius: theme.radius.segmentTrack,
      backgroundColor: theme.background,
    },
    segment: {
      flex: 1,
      minHeight: theme.size.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.segment,
    },
    segmentSelected: {
      backgroundColor: theme.primary,
    },
    segmentPressed: {
      opacity: theme.opacity.pressed,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;

export type SegmentedControlPresetName = keyof typeof segmentedControlPresets;
