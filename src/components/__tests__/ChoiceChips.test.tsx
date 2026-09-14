import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { lightTheme, tokens } from '../../theme';
import { ChoiceChips } from '../ChoiceChips';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const OPCOES = [
  { value: '1', label: 'Assinatura completa' },
  { value: '2', label: 'Rubrica' },
] as const;

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

describe('ChoiceChips', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('marca a ficha escolhida com a cor principal e o ícone de confirmação', async () => {
    await render(
      <ChoiceChips options={OPCOES} selected="1" onSelect={() => undefined} accessibilityLabel="Assinatura" />,
      { wrapper: SettingsProvider },
    );

    const [escolhida, outra] = await screen.findAllByRole('radio');

    expect([escolhida.props.accessibilityState, outra.props.accessibilityState]).toEqual([
      { checked: true },
      { checked: false },
    ]);
    expect(StyleSheet.flatten(escolhida.props.style)).toMatchObject({
      minHeight: tokens.size.touchTarget,
      borderRadius: tokens.radius.choiceChip,
      backgroundColor: lightTheme.primary,
    });
    expect(StyleSheet.flatten(outra.props.style)).toMatchObject({
      borderWidth: tokens.lineWidth.outline,
      borderColor: lightTheme.textSecondary,
    });
    expect(descendentes(escolhida).filter((no) => no.type === 'RNSVGSvgView')).toHaveLength(1);
    expect(descendentes(outra).filter((no) => no.type === 'RNSVGSvgView')).toHaveLength(0);
    expect(StyleSheet.flatten(screen.getByText('Assinatura completa').props.style).color).toBe(lightTheme.onPrimary);
  });

  test('escolher outra ficha avisa o valor dela', async () => {
    const onSelect = jest.fn();
    await render(<ChoiceChips options={OPCOES} selected="1" onSelect={onSelect} accessibilityLabel="Assinatura" />, {
      wrapper: SettingsProvider,
    });

    await fireEvent.press(await screen.findByText('Rubrica'));

    expect(onSelect).toHaveBeenCalledWith('2');
  });
});
