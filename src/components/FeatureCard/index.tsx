import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '../../theme';
import { Icon, type IconName } from '../Icon';
import { Text } from '../Text';
import { featureCardPresets } from './presets';

type FeatureCardProps = Readonly<{
  icon: IconName;
  title: string;
  description: string;
  children: React.ReactNode;
}>;

export function FeatureCard({ icon, title, description, children }: FeatureCardProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => featureCardPresets.default(theme), [theme]);

  return (
    <View style={styles.card}>
      <View style={styles.iconBox}>
        <Icon name={icon} size="feature" color={styles.iconColor} />
      </View>
      <View style={styles.heading}>
        <Text preset="featureTitle">{title}</Text>
        <Text preset="featureDescription">{description}</Text>
      </View>
      {children}
    </View>
  );
}
