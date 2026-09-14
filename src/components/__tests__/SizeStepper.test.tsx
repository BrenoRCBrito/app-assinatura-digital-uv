import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { lightTheme, tokens } from '../../theme';
import { SizeStepper } from '../SizeStepper';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

type Opcoes = Readonly<{ canDecrease?: boolean; canIncrease?: boolean }>;

async function mostrarPasso({ canDecrease = true, canIncrease = true }: Opcoes = {}) {
  const acoes = { onDecrease: jest.fn(), onIncrease: jest.fn() };
  await render(
    <SizeStepper
      label="Tamanho do selo"
      value="35%"
      canDecrease={canDecrease}
      canIncrease={canIncrease}
      decreaseLabel="Diminuir o selo"
      increaseLabel="Aumentar o selo"
      {...acoes}
    />,
    { wrapper: SettingsProvider },
  );
  await screen.findByText('35%');
  return acoes;
}

describe('SizeStepper', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('mostra o rótulo e o valor e avisa diminuir e aumentar', async () => {
    const acoes = await mostrarPasso();

    await fireEvent.press(screen.getByLabelText('Diminuir o selo'));
    await fireEvent.press(screen.getByLabelText('Aumentar o selo'));

    expect(screen.getByText('Tamanho do selo')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByText('35%').props.style)).toMatchObject({
      ...tokens.typography.stepperValue,
      color: lightTheme.textPrimary,
    });
    expect(StyleSheet.flatten(screen.getByLabelText('Diminuir o selo').props.style)).toMatchObject({
      width: tokens.size.touchTarget,
      height: tokens.size.touchTarget,
      borderRadius: tokens.radius.stepper,
      borderColor: lightTheme.textSecondary,
    });
    expect([acoes.onDecrease.mock.calls.length, acoes.onIncrease.mock.calls.length]).toEqual([1, 1]);
  });

  test('desativa o botão que chegou ao limite', async () => {
    const acoes = await mostrarPasso({ canIncrease: false });
    const aumentar = screen.getByLabelText('Aumentar o selo');

    await fireEvent.press(aumentar);

    expect(aumentar.props.accessibilityState).toEqual({ disabled: true });
    expect(StyleSheet.flatten(aumentar.props.style).opacity).toBe(tokens.opacity.disabled);
    expect(acoes.onIncrease).not.toHaveBeenCalled();
  });
});
