import React, { useMemo } from 'react';
import { Text as NativeText } from 'react-native';

import { useAppTheme } from '../../theme';
import { textPresets, type TextPresetName } from './presets';

type TextSizing = Readonly<{
  fontSize: number;
  lineHeight: number;
}>;

type TextProps = Readonly<{
  preset: TextPresetName;
  numberOfLines?: number;
  sizing?: TextSizing;
  children: React.ReactNode;
}>;

export function Text({ preset, numberOfLines, sizing, children }: TextProps) {
  const { theme } = useAppTheme();
  const style = useMemo(() => {
    const presetStyle = textPresets[preset](theme);
    return sizing === undefined
      ? presetStyle
      : { ...presetStyle, fontSize: sizing.fontSize, lineHeight: sizing.lineHeight };
  }, [preset, sizing, theme]);

  return (
    <NativeText style={style} numberOfLines={numberOfLines}>
      {children}
    </NativeText>
  );
}
