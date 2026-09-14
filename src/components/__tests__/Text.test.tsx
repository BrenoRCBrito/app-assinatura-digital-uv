import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { SettingsProvider } from '../../storage/SettingsProvider';
import { FIXED_COLORS, lightTheme, tokens } from '../../theme';
import { Text } from '../Text';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('Text', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('sem medida calculada, usa só o preset', async () => {
    await render(<Text preset="supporting">Apoio</Text>, { wrapper: SettingsProvider });

    expect(StyleSheet.flatten((await screen.findByText('Apoio')).props.style)).toEqual({
      ...tokens.typography.supporting,
      color: lightTheme.textSecondary,
    });
  });

  test('o texto do selo usa a fonte e a altura de linha calculadas', async () => {
    await render(
      <Text preset="stamp" sizing={{ fontSize: 9.2, lineHeight: 11.5 }}>
        12/09/2026 14:32
      </Text>,
      { wrapper: SettingsProvider },
    );

    expect(StyleSheet.flatten((await screen.findByText('12/09/2026 14:32')).props.style)).toEqual({
      fontWeight: '600',
      fontVariant: ['tabular-nums'],
      color: FIXED_COLORS.ink,
      fontSize: 9.2,
      lineHeight: 11.5,
    });
  });
});
