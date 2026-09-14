import React, { useLayoutEffect, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';

import { clampToArea, createPixels, type PlainPoint } from '../domain/geometry';
import type { SeloArrastavelProps } from './SeloArrastavel';

export function SeloArrastavelPanResponder({ area, tamanho, posicaoInicial, aoSoltar, children }: SeloArrastavelProps) {
  const [posicao, setPosicao] = useState<PlainPoint>(posicaoInicial);
  const posicaoRef = useRef<PlainPoint>(posicaoInicial);
  const inicioDoArrastoRef = useRef<PlainPoint>(posicaoInicial);
  // O PanResponder é criado uma só vez; ele lê a área, o tamanho e o aviso atuais por estas refs.
  const areaRef = useRef(area);
  const tamanhoRef = useRef(tamanho);
  const aoSoltarRef = useRef(aoSoltar);

  useLayoutEffect(() => {
    areaRef.current = area;
    tamanhoRef.current = tamanho;
    aoSoltarRef.current = aoSoltar;
  });

  function soltar() {
    aoSoltarRef.current({ x: createPixels(posicaoRef.current.x), y: createPixels(posicaoRef.current.y) });
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        inicioDoArrastoRef.current = posicaoRef.current;
      },
      onPanResponderMove: (_evento, gesto) => {
        posicaoRef.current = clampToArea(
          { x: inicioDoArrastoRef.current.x + gesto.dx, y: inicioDoArrastoRef.current.y + gesto.dy },
          tamanhoRef.current,
          areaRef.current,
        );
        setPosicao(posicaoRef.current);
      },
      onPanResponderRelease: () => soltar(),
      onPanResponderTerminate: () => soltar(),
    }),
  ).current;

  return (
    <View style={[styles.selo, { left: posicao.x, top: posicao.y }]} {...panResponder.panHandlers}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  selo: {
    position: 'absolute',
  },
});
