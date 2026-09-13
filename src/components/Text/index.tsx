import React, { useMemo } from 'react';
import { Text as NativeText } from 'react-native';

import { useAppTheme } from '../../theme';
import { textPresets, type TextPresetName } from './presets';

type TextProps = Readonly<{
  preset: TextPresetName;
  numberOfLines?: number;
  children: React.ReactNode;
}>;

export function Text({ preset, numberOfLines, children }: TextProps) {
  const { theme } = useAppTheme();
  const style = useMemo(() => textPresets[preset](theme), [preset, theme]);

  return (
    <NativeText style={style} numberOfLines={numberOfLines}>
      {children}
    </NativeText>
  );
}
