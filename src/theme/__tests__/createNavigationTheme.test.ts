import { DarkTheme, DefaultTheme } from '@react-navigation/native';

import { darkTheme, lightTheme } from '../appTheme';
import { createNavigationTheme } from '../createNavigationTheme';

describe('createNavigationTheme', () => {
  test('usa a base clara com as cores do tema claro', () => {
    const theme = createNavigationTheme(lightTheme, 'light');

    expect(theme.dark).toBe(false);
    expect(theme.fonts).toEqual(DefaultTheme.fonts);
    expect(theme.colors).toEqual({
      primary: lightTheme.textSecondary,
      background: lightTheme.background,
      card: lightTheme.background,
      text: lightTheme.textPrimary,
      border: lightTheme.divider,
      notification: lightTheme.danger,
    });
  });

  test('usa a base escura com as cores do tema escuro', () => {
    const theme = createNavigationTheme(darkTheme, 'dark');

    expect(theme.dark).toBe(true);
    expect(theme.fonts).toEqual(DarkTheme.fonts);
    expect(theme.colors.background).toBe(darkTheme.background);
  });
});
