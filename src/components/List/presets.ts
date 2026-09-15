import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type ListStyles = Readonly<{
  content: ViewStyle;
  item: ViewStyle;
  first: ViewStyle;
  last: ViewStyle;
  divider: ViewStyle | null;
}>;

export const listPresets = {
  default: (theme: Theme) => ({
    content: {
      flexGrow: 1,
      gap: theme.gap.list,
      paddingHorizontal: theme.inset.screen,
      paddingTop: theme.inset.screenTop,
    },
    item: {},
    first: {},
    last: {},
    divider: null,
  }),
  grouped: (theme: Theme) => ({
    content: {
      flexGrow: 1,
      paddingHorizontal: theme.inset.screen,
      paddingTop: theme.inset.screenTop,
    },
    item: {
      backgroundColor: theme.surface,
    },
    first: {
      borderTopLeftRadius: theme.radius.surface,
      borderTopRightRadius: theme.radius.surface,
    },
    last: {
      borderBottomLeftRadius: theme.radius.surface,
      borderBottomRightRadius: theme.radius.surface,
    },
    divider: {
      height: theme.lineWidth.hairline,
      marginLeft: theme.inset.menuItemX + theme.size.menuIconBox + theme.gap.item,
      backgroundColor: theme.divider,
    },
  }),
} satisfies Record<string, (theme: Theme) => ListStyles>;

export type ListPresetName = keyof typeof listPresets;
