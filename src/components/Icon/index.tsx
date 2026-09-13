import React, { useMemo } from 'react';
import Svg, { Path } from 'react-native-svg';

import { useAppTheme } from '../../theme';
import { iconPresets, type IconName } from './presets';

export type { IconName } from './presets';

type IconProps = Readonly<{
  name: IconName;
}>;

export function Icon({ name }: IconProps) {
  const { theme } = useAppTheme();
  const { size, strokeWidth, color, paths } = useMemo(() => iconPresets[name](theme), [name, theme]);

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {paths.map(({ d, ...pontas }) => (
        <Path key={d} d={d} stroke={color} strokeWidth={strokeWidth} fill="none" {...pontas} />
      ))}
    </Svg>
  );
}
