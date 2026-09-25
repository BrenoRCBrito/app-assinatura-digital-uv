import type { ImageStyle, ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

export const avatarPresets = {
  default: (theme: Theme) => ({
    container: {
      alignSelf: 'center',
    } satisfies ViewStyle,
    placeholder: {
      width: theme.size.avatar,
      height: theme.size.avatar,
      borderRadius: theme.radius.avatar,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primaryMuted,
    } satisfies ViewStyle,
    photo: {
      width: theme.size.avatar,
      height: theme.size.avatar,
      borderRadius: theme.radius.avatar,
    } satisfies ImageStyle,
    badge: {
      position: 'absolute',
      bottom: 0,
      right: 0,
    } satisfies ViewStyle,
  }),
} satisfies Record<
  string,
  (theme: Theme) => { container: ViewStyle; placeholder: ViewStyle; photo: ImageStyle; badge: ViewStyle }
>;
