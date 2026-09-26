import type { ViewStyle } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

import { FIXED_COLORS, type Theme } from '../../theme';

type ScreenPreset = Readonly<{
  layout: 'fill' | 'form' | 'scroll' | 'center';
  tone: 'theme' | 'dark';
  edges: readonly Edge[];
  background: (theme: Theme) => string;
  content: (theme: Theme) => ViewStyle;
}>;

export function screenFooter(theme: Theme): ViewStyle {
  return { paddingHorizontal: theme.inset.screen, paddingVertical: theme.inset.footerY };
}

function themeBackground(theme: Theme): string {
  return theme.background;
}

function cameraBackground(): string {
  return FIXED_COLORS.cameraBackground;
}

function scrollContent(theme: Theme): ViewStyle {
  return {
    paddingHorizontal: theme.inset.screen,
    paddingTop: theme.inset.screenTop,
    paddingBottom: theme.inset.screen,
  };
}

export const screenPresets = {
  list: {
    layout: 'fill',
    tone: 'theme',
    edges: ['bottom'],
    background: themeBackground,
    content: () => ({}),
  },
  form: {
    layout: 'form',
    tone: 'theme',
    edges: ['bottom', 'left', 'right'],
    background: themeBackground,
    content: (theme: Theme) => ({ paddingHorizontal: theme.inset.screen, paddingTop: theme.inset.screenTop }),
  },
  scroll: {
    layout: 'scroll',
    tone: 'theme',
    edges: ['bottom'],
    background: themeBackground,
    content: scrollContent,
  },
  menu: {
    layout: 'scroll',
    tone: 'theme',
    edges: ['bottom'],
    background: themeBackground,
    content: scrollContent,
  },
  centered: {
    layout: 'center',
    tone: 'theme',
    edges: [],
    background: themeBackground,
    content: (theme: Theme) => ({ padding: theme.inset.screen }),
  },
  immersive: {
    layout: 'center',
    tone: 'dark',
    edges: ['top', 'right', 'bottom', 'left'],
    background: themeBackground,
    content: (theme: Theme) => ({ paddingHorizontal: theme.inset.immersive }),
  },
  auth: {
    layout: 'center',
    tone: 'dark',
    edges: ['top', 'right', 'bottom', 'left'],
    background: themeBackground,
    content: (theme: Theme) => ({ paddingHorizontal: theme.inset.immersive, paddingBottom: theme.inset.authLift }),
  },
  authScroll: {
    layout: 'scroll',
    tone: 'dark',
    edges: ['top', 'right', 'bottom', 'left'],
    background: themeBackground,
    content: (theme: Theme) => ({
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: theme.inset.immersive,
      paddingBottom: theme.inset.authLift,
    }),
  },
  camera: {
    layout: 'fill',
    tone: 'dark',
    edges: ['top', 'right', 'left'],
    background: cameraBackground,
    content: () => ({}),
  },
  preview: {
    layout: 'fill',
    tone: 'dark',
    edges: ['top', 'right', 'bottom', 'left'],
    background: cameraBackground,
    content: () => ({}),
  },
} satisfies Record<string, ScreenPreset>;

export type ScreenPresetName = keyof typeof screenPresets;
