import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { clampToArea, createPixels } from '../domain/geometry';
import type { SeloArrastavelProps } from './SeloArrastavel';

export function SeloArrastavelReanimated({ area, tamanho, posicaoInicial, aoSoltar, children }: SeloArrastavelProps) {
  const x = useSharedValue<number>(posicaoInicial.x);
  const y = useSharedValue<number>(posicaoInicial.y);

  const arrasto = useMemo(() => {
    const limite = { width: area.width, height: area.height };
    const medida = { width: tamanho.width, height: tamanho.height };
    const soltar = (soltoEmX: number, soltoEmY: number) => {
      aoSoltar({ x: createPixels(soltoEmX), y: createPixels(soltoEmY) });
    };

    return Gesture.Pan()
      .onChange((evento) => {
        const posicao = clampToArea({ x: x.value + evento.changeX, y: y.value + evento.changeY }, medida, limite);
        x.value = posicao.x;
        y.value = posicao.y;
      })
      .onEnd(() => {
        scheduleOnRN(soltar, x.value, y.value);
      });
  }, [aoSoltar, area.height, area.width, tamanho.height, tamanho.width, x, y]);

  const deslocamento = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <GestureDetector gesture={arrasto}>
      <Animated.View style={[styles.selo, deslocamento]}>{children}</Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  selo: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
