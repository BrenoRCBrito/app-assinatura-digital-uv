import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type DocumentoItemStyles = Readonly<{
  item: ViewStyle;
  pressed: ViewStyle;
  iconBox: ViewStyle;
  texts: ViewStyle;
  iconColor: string;
  chevronColor: string;
}>;

export const documentoItemPresets = {
  default: (theme: Theme) => ({
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.gap.item,
      minHeight: theme.size.documentItem,
      paddingHorizontal: theme.inset.menuItemX,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
    iconBox: {
      alignItems: 'center',
      justifyContent: 'center',
      width: theme.size.menuIconBox,
      height: theme.size.menuIconBox,
      borderRadius: theme.radius.menuIconBox,
      backgroundColor: theme.background,
    },
    texts: {
      flex: 1,
      gap: theme.gap.text,
    },
    iconColor: theme.textSecondary,
    chevronColor: theme.textMuted,
  }),
} satisfies Record<string, (theme: Theme) => DocumentoItemStyles>;
