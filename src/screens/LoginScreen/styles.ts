import { StyleSheet } from 'react-native';

import { darkTheme } from '../../theme/appTheme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 36,
  },
  logo: {
    width: 200,
    height: 200,
  },
  texts: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    color: darkTheme.textPrimary,
  },
  subtitle: {
    maxWidth: 260,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    color: darkTheme.textSecondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
});
