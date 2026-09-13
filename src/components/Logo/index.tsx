import React, { useMemo } from 'react';
import { Image } from 'react-native';

import { useAppTheme } from '../../theme';
import { logoPresets } from './presets';

export function Logo() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => logoPresets.default(theme), [theme]);

  return (
    <Image
      accessible
      accessibilityLabel="Pena e visto do Assina Aqui"
      source={require('../../../assets/splash-icon.png')}
      style={styles.logo}
    />
  );
}
