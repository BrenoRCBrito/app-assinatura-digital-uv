import type { ViewStyle } from 'react-native';

import type { Theme } from '../../theme';

type FeatureCardStyles = Readonly<{
  card: ViewStyle;
  iconBox: ViewStyle;
  heading: ViewStyle;
  iconColor: string;
}>;

export const featureCardPresets = {
  default: (theme: Theme) => ({
    card: {
      gap: theme.gap.feature,
      padding: theme.inset.feature,
      borderRadius: theme.radius.feature,
      backgroundColor: theme.primary,
    },
    iconBox: {
      alignItems: 'center',
      justifyContent: 'center',
      width: theme.size.featureIconBox,
      height: theme.size.featureIconBox,
      borderRadius: theme.radius.featureIconBox,
      backgroundColor: theme.primaryMuted,
    },
    heading: {
      gap: theme.gap.titleText,
    },
    iconColor: theme.onPrimary,
  }),
} satisfies Record<string, (theme: Theme) => FeatureCardStyles>;
