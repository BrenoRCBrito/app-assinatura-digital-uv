import React, { useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { adicionarPonto, tracoDePontos, type Traco } from '../domain/desenho';
import { clampPointToSize, createSize, type ScreenPoint, type Size } from '../domain/geometry';
import { FIXED_COLORS } from '../theme/appTheme';

type SignaturePadProps = Readonly<{
  tracos: readonly Traco[];
  aoMudarTracos: (tracos: readonly Traco[]) => void;
}>;

const PROPRIEDADES_DO_TRACO = {
  stroke: FIXED_COLORS.ink,
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  fill: 'none',
} as const;

export function SignaturePad({ tracos, aoMudarTracos }: SignaturePadProps) {
  const [pontosDoTracoAtual, setPontosDoTracoAtual] = useState<readonly ScreenPoint[]>([]);
  const quadroRef = useRef<Size | null>(null);
  const pontosRef = useRef<readonly ScreenPoint[]>([]);
  // O PanResponder é criado uma só vez; ele lê os tracos e o callback atuais por estas refs.
  const tracosRef = useRef(tracos);
  const aoMudarTracosRef = useRef(aoMudarTracos);

  useLayoutEffect(() => {
    tracosRef.current = tracos;
    aoMudarTracosRef.current = aoMudarTracos;
  });

  function registrarPonto(evento: GestureResponderEvent, pontosAnteriores: readonly ScreenPoint[]) {
    const quadro = quadroRef.current;
    if (quadro === null) {
      return;
    }
    const ponto = clampPointToSize(evento.nativeEvent.locationX, evento.nativeEvent.locationY, quadro);
    pontosRef.current = adicionarPonto(pontosAnteriores, ponto);
    setPontosDoTracoAtual(pontosRef.current);
  }

  function concluirTraco() {
    if (pontosRef.current.length > 0) {
      aoMudarTracosRef.current([...tracosRef.current, tracoDePontos(pontosRef.current)]);
    }
    pontosRef.current = [];
    setPontosDoTracoAtual([]);
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evento) => registrarPonto(evento, []),
      onPanResponderMove: (evento) => registrarPonto(evento, pontosRef.current),
      onPanResponderRelease: () => concluirTraco(),
      onPanResponderTerminate: () => concluirTraco(),
    }),
  ).current;

  function medirQuadro(evento: LayoutChangeEvent) {
    const { width, height } = evento.nativeEvent.layout;
    quadroRef.current = createSize(Math.round(width), Math.round(height));
  }

  return (
    <View style={styles.area} onLayout={medirQuadro} {...panResponder.panHandlers}>
      <View style={styles.desenho}>
        <Svg width="100%" height="100%">
          {tracos.map((traco, indice) => (
            <Path key={indice} d={traco} {...PROPRIEDADES_DO_TRACO} />
          ))}
          {pontosDoTracoAtual.length > 0 ? (
            <Path d={tracoDePontos(pontosDoTracoAtual)} {...PROPRIEDADES_DO_TRACO} />
          ) : null}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  desenho: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    pointerEvents: 'none',
  },
});
