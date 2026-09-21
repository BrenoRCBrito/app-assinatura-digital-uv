import React from 'react';
import { Pressable } from 'react-native';

import { Text } from '../Text';

type LinkPreset = 'link' | 'linkPrimary' | 'linkQuiet';

type LinkProps = Readonly<{
  label: string;
  onPress: () => void;
  preset?: LinkPreset;
}>;

export function Link({ label, onPress, preset = 'link' }: LinkProps) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress}>
      <Text preset={preset}>{label}</Text>
    </Pressable>
  );
}
