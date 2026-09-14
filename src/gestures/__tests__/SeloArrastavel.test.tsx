import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet, Text as NativeText } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { createPixels, createSize } from '../../domain/geometry';
import { DEFAULT_SETTINGS } from '../../domain/settings';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { SETTINGS_STORAGE_KEY } from '../../storage/settingsStorage';
import { useSeloArrastavel } from '../SeloArrastavel';
import { SeloArrastavelPanResponder } from '../SeloArrastavelPanResponder';
import { SeloArrastavelReanimated } from '../SeloArrastavelReanimated';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const AREA = createSize(300, 400);
const TAMANHO = createSize(100, 60);
const POSICAO = { x: createPixels(20), y: createPixels(30) };

describe('SeloArrastavel', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test.each([
    ['panResponder', SeloArrastavelPanResponder],
    ['reanimated', SeloArrastavelReanimated],
  ] as const)('com o motor %s, useSeloArrastavel devolve o adapter dele', async (motor, adapter) => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, gestureEngine: motor }));

    const { result } = await renderHook(() => useSeloArrastavel(), { wrapper: SettingsProvider });

    await waitFor(() => expect(result.current).toBe(adapter));
  });

  test('o adapter PanResponder mostra o selo na posição inicial', async () => {
    await render(
      <SeloArrastavelPanResponder area={AREA} tamanho={TAMANHO} posicaoInicial={POSICAO} aoSoltar={jest.fn()}>
        <NativeText>Selo</NativeText>
      </SeloArrastavelPanResponder>,
    );

    expect(StyleSheet.flatten(screen.getByText('Selo').parent?.props.style)).toMatchObject({
      position: 'absolute',
      left: 20,
      top: 30,
    });
  });

  test('o adapter Reanimated mostra o selo dentro do detector de gesto', async () => {
    await render(
      <GestureHandlerRootView>
        <SeloArrastavelReanimated area={AREA} tamanho={TAMANHO} posicaoInicial={POSICAO} aoSoltar={jest.fn()}>
          <NativeText>Selo</NativeText>
        </SeloArrastavelReanimated>
      </GestureHandlerRootView>,
    );

    expect(StyleSheet.flatten(screen.getByText('Selo').parent?.props.style)).toMatchObject({
      position: 'absolute',
      transform: [{ translateX: 20 }, { translateY: 30 }],
    });
  });
});
