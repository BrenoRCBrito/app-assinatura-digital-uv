import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import type { ThemeName } from '../domain/settings';
import type { AppTheme } from './appTheme';

export function createNavigationTheme(appTheme: AppTheme, themeName: ThemeName): Theme {
  const base = themeName === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      primary: appTheme.textSecondary,
      background: appTheme.background,
      card: appTheme.background,
      text: appTheme.textPrimary,
      border: appTheme.divider,
      notification: appTheme.danger,
    },
  };
}
