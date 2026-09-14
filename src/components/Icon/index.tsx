import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { useAppTheme } from '../../theme';
import { iconShapes, iconSizes, type IconName, type IconSizeName } from './presets';

export type { IconName } from './presets';

type IconProps = Readonly<{
  name: IconName;
  size: IconSizeName;
  color: string;
}>;

export function Icon({ name, size, color }: IconProps) {
  const { theme } = useAppTheme();
  const { size: side, strokeWidth } = useMemo(() => iconSizes[size](theme), [size, theme]);

  return (
    <Svg width={side} height={side} viewBox="0 0 24 24">
      {iconShapes[name].map(({ d, ...pontas }) => (
        <Path key={d} d={d} stroke={color} strokeWidth={strokeWidth} fill="none" {...pontas} />
      ))}
    </Svg>
  );
}
