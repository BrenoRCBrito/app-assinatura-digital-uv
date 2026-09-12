import { StyleSheet } from 'react-native';

import { darkTheme } from '../../theme/appTheme';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 8,
    color: darkTheme.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: darkTheme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
});
