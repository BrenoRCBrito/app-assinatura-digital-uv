import type React from 'react';

import type { ScreenPoint, Size } from '../domain/geometry';
import type { GestureEngine } from '../domain/settings';
import { useSettings } from '../storage/SettingsProvider';
import { SeloArrastavelPanResponder } from './SeloArrastavelPanResponder';
import { SeloArrastavelReanimated } from './SeloArrastavelReanimated';

export type SeloArrastavelProps = Readonly<{
  area: Size;
  tamanho: Size;
  posicaoInicial: ScreenPoint;
  aoSoltar: (posicao: ScreenPoint) => void;
  children: React.ReactNode;
}>;

type SeloArrastavel = (props: SeloArrastavelProps) => React.JSX.Element;

const ADAPTERS: Readonly<Record<GestureEngine, SeloArrastavel>> = {
  panResponder: SeloArrastavelPanResponder,
  reanimated: SeloArrastavelReanimated,
};

export function useSeloArrastavel(): SeloArrastavel {
  const { settings } = useSettings();
  return ADAPTERS[settings.gestureEngine];
}
