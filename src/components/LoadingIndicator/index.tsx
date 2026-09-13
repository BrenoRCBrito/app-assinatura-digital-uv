import React from 'react';
import { ActivityIndicator } from 'react-native';

import { useAppTheme } from '../../theme';

export function LoadingIndicator() {
  const { theme } = useAppTheme();

  return <ActivityIndicator accessibilityLabel="Carregando" color={theme.textSecondary} />;
}
