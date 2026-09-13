import React from 'react';
import Svg, { Path } from 'react-native-svg';

import type { Desenho } from '../../domain/desenho';
import { FIXED_COLORS, tokens } from '../../theme';

type DesenhoSvgProps = Readonly<{
  desenho: Desenho;
  strokeWidth?: number;
}>;

export function DesenhoSvg({ desenho, strokeWidth = tokens.lineWidth.drawing }: DesenhoSvgProps) {
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
