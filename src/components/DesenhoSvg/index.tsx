import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { Desenho } from '../../domain/desenho';
import { FIXED_COLORS } from '../../theme/appTheme';

type DesenhoSvgProps = Readonly<{
  desenho: Desenho;
  strokeWidth?: number;
}>;

export function DesenhoSvg({ desenho, strokeWidth = 2 }: DesenhoSvgProps) {
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${desenho.quadro.width} ${desenho.quadro.height}`}>
      {desenho.tracos.map((traco, indice) => (
        <Path
          key={indice}
          d={traco}
          stroke={FIXED_COLORS.ink}
          strokeWidth={strokeWidth}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
    </Svg>
  );
}
