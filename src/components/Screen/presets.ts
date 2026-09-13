import type { ViewStyle } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

import type { Theme } from '../../theme';

type ScreenPreset = Readonly<{
  layout: 'fill' | 'form' | 'scroll' | 'center';
  tone: 'theme' | 'dark';
  edges: readonly Edge[];
  content: (theme: Theme) => ViewStyle;
  footer: (theme: Theme) => ViewStyle;
}>;

function footerOfHeaderScreens(theme: Theme): ViewStyle {
  return { paddingHorizontal: theme.inset.screen, paddingVertical: theme.inset.footerY };
}

export const screenPresets = {
  list: {
    layout: 'fill',
    tone: 'theme',
    edges: ['bottom'],
    content: () => ({}),
    footer: footerOfHeaderScreens,
  },
  form: {
    layout: 'form',
    tone: 'theme',
    edges: ['bottom', 'left', 'right'],
    content: (theme: Theme) => ({ paddingHorizontal: theme.inset.screen, paddingTop: theme.inset.screenTop }),
    footer: footerOfHeaderScreens,
  },
  scroll: {
    layout: 'scroll',
    tone: 'theme',
    edges: [],
    content: (theme: Theme) => ({ padding: theme.inset.scroll }),
    footer: footerOfHeaderScreens,
  },
  centered: {
    layout: 'center',
    tone: 'theme',
    edges: [],
    content: (theme: Theme) => ({ padding: theme.inset.centered }),
    footer: footerOfHeaderScreens,
  },
  immersive: {
    layout: 'center',
    tone: 'dark',
    edges: ['top', 'right', 'bottom', 'left'],
    content: (theme: Theme) => ({ paddingHorizontal: theme.inset.immersive }),
    footer: (theme: Theme) => ({
      paddingHorizontal: theme.inset.immersiveFooter,
      paddingTop: theme.inset.footerY,
      paddingBottom: theme.inset.immersiveFooter,
    }),
  },
} satisfies Record<string, ScreenPreset>;

export type ScreenPresetName = keyof typeof screenPresets;
