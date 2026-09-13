import React, { createContext, useContext } from 'react';

import type { ThemeName } from '../domain/settings';
import { useSettings } from '../storage/SettingsProvider';
import { darkTheme, lightTheme, type AppTheme } from './appTheme';
import { tokens, type Tokens } from './tokens';

export type Theme = AppTheme & Tokens;

const THEMES: Readonly<Record<ThemeName, Theme>> = {
  light: { ...lightTheme, ...tokens },
  dark: { ...darkTheme, ...tokens },
};

const ForcedThemeContext = createContext<ThemeName | null>(null);

export function DarkThemeScope({ children }: Readonly<{ children: React.ReactNode }>) {
  return <ForcedThemeContext.Provider value="dark">{children}</ForcedThemeContext.Provider>;
}

export function useAppTheme(): Readonly<{ theme: Theme; themeName: ThemeName }> {
  const { settings } = useSettings();
  const themeName = useContext(ForcedThemeContext) ?? settings.theme;

  return { theme: THEMES[themeName], themeName };
}
