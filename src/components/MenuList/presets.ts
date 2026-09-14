import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type MenuListStyles = Readonly<{
  list: ViewStyle;
  item: ViewStyle;
  pressed: ViewStyle;
  iconBox: ViewStyle;
  label: ViewStyle;
  divider: ViewStyle;
  iconColor: string;
  chevronColor: string;
}>;

export const menuListPresets = {
  default: (theme: Theme) => ({
    list: {
      overflow: 'hidden',
      borderRadius: theme.radius.surface,
      backgroundColor: theme.surface,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.gap.item,
      minHeight: theme.size.menuItem,
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
    label: {
      flex: 1,
    },
    divider: {
      height: theme.lineWidth.hairline,
      marginLeft: theme.inset.menuItemX + theme.size.menuIconBox + theme.gap.item,
      backgroundColor: theme.divider,
    },
    iconColor: theme.textSecondary,
    chevronColor: theme.textMuted,
  }),
} satisfies Record<string, (theme: Theme) => MenuListStyles>;
