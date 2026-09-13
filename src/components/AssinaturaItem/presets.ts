import type { ViewStyle } from 'react-native';

import { FIXED_COLORS, type Theme } from '../../theme';

export const assinaturaItemPresets = {
  default: (theme: Theme) => ({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.gap.item,
      paddingVertical: theme.inset.itemY,
      paddingLeft: theme.inset.itemLeft,
      paddingRight: theme.inset.itemRight,
      borderRadius: theme.radius.surface,
      backgroundColor: theme.surface,
    },
    preview: {
      width: theme.size.previewWidth,
      height: theme.size.previewHeight,
      padding: theme.inset.preview,
      borderRadius: theme.radius.control,
      borderWidth: theme.lineWidth.hairline,
      borderColor: FIXED_COLORS.paperBorder,
      backgroundColor: FIXED_COLORS.paper,
    },
    texts: {
      flex: 1,
      gap: theme.gap.text,
    },
  }),
} satisfies Record<string, (theme: Theme) => Record<string, ViewStyle>>;
