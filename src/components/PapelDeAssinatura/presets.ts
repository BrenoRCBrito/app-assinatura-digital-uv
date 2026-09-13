import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

export const papelDeAssinaturaPresets = {
  default: (theme: Theme) => ({
    paper: {
      flex: 1,
      overflow: 'hidden',
      borderRadius: theme.radius.surface,
      borderWidth: theme.lineWidth.hairline,
      borderColor: FIXED_COLORS.paperBorder,
      backgroundColor: FIXED_COLORS.paper,
    },
    guide: {
      position: 'absolute',
      left: theme.inset.paperGuide,
      right: theme.inset.paperGuide,
      bottom: theme.inset.paperGuide,
      gap: theme.gap.paperGuide,
      pointerEvents: 'none',
    },
    guideRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: theme.gap.paperMark,
    },
    guideLine: {
      flex: 1,
      height: theme.lineWidth.paperGuide,
      marginBottom: theme.inset.paperGuideLine,
      backgroundColor: FIXED_COLORS.paperGuide,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;
