import type { ThemeName } from '../domain/settings';
import { useSettings } from '../storage/SettingsProvider';
import { darkTheme, lightTheme, type AppTheme } from './appTheme';

export function useAppTheme(): Readonly<{ theme: AppTheme; themeName: ThemeName }> {
  const { settings } = useSettings();

  return {
    theme: settings.theme === 'dark' ? darkTheme : lightTheme,
    themeName: settings.theme,
  };
}
