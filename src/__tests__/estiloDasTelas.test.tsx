import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import type { TestInstance } from 'test-renderer';

import App from '../../App';
import { DEFAULT_SETTINGS, type ThemeName } from '../domain/settings';
import { authenticateDeviceOwner, getBiometricStatus } from '../services/localAuthentication';
import { createAsyncStorageAssinaturaRepository } from '../storage/asyncStorage/asyncStorageAssinaturaRepository';
import { SETTINGS_STORAGE_KEY } from '../storage/settingsStorage';
import { criarAssinaturaDeTeste } from '../storage/testing/assinaturaRepositoryContract';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../services/localAuthentication', () => ({
  authenticateDeviceOwner: jest.fn(),
  getBiometricStatus: jest.fn(),
}));

type Amostra = Readonly<Record<string, unknown>>;

const CHAVES_DE_TEXTO = [
  'color',
  'fontSize',
  'fontVariant',
  'fontWeight',
  'letterSpacing',
  'lineHeight',
  'maxWidth',
  'textAlign',
  'textTransform',
];
const CHAVES_DE_CAIXA = [
  'backgroundColor',
  'borderColor',
  'borderRadius',
  'borderWidth',
  'height',
  'minHeight',
  'opacity',
  'padding',
  'paddingBottom',
  'paddingHorizontal',
  'paddingLeft',
  'paddingRight',
  'paddingTop',
  'paddingVertical',
  'width',
];
const CHAVES_DE_SUPERFICIE = ['backgroundColor', 'borderColor', 'borderRadius', 'borderWidth'];
const CHAVES_DE_TRACO = ['stroke', 'strokeLinecap', 'strokeLinejoin', 'strokeWidth'];
const CORES_DO_INTERRUPTOR = ['onTintColor', 'thumbTintColor', 'tintColor'];
const PAPEIS_DE_CONTROLE = ['button', 'radio', 'switch'];

function escolher(origem: Readonly<Record<string, unknown>>, chaves: readonly string[]): Amostra {
  return Object.fromEntries(chaves.filter((chave) => origem[chave] !== undefined).map((chave) => [chave, origem[chave]]));
}

function descendentes(no: TestInstance): TestInstance[] {
  return no.children.flatMap((filho) => (typeof filho === 'string' ? [] : [filho, ...descendentes(filho)]));
}

function amostraDe(no: TestInstance): Amostra | null {
  const estilo: Readonly<Record<string, unknown>> = StyleSheet.flatten(no.props.style) ?? {};
  if (no.type === 'Text') {
    const texto = no.children.filter((filho) => typeof filho === 'string').join('');
    return { elemento: 'texto', texto, ...escolher(estilo, CHAVES_DE_TEXTO), ...escolher(no.props, ['numberOfLines']) };
  }
  if (no.type === 'TextInput') {
    return {
      elemento: 'campo',
      ...escolher(estilo, [...CHAVES_DE_TEXTO, ...CHAVES_DE_CAIXA]),
      ...escolher(no.props, ['placeholderTextColor']),
    };
  }
  if (no.type === 'Image') {
    return { elemento: 'imagem', ...escolher(estilo, ['width', 'height']) };
  }
  if (no.type === 'RNSVGSvgView') {
    return { elemento: 'svg', ...escolher(estilo, ['width', 'height']) };
  }
  if (no.type === 'RNSVGPath') {
    return { elemento: 'traço', ...escolher(no.props, CHAVES_DE_TRACO) };
  }
  if (PAPEIS_DE_CONTROLE.includes(no.props.accessibilityRole)) {
    return {
      elemento: 'controle',
      papel: no.props.accessibilityRole,
      ...escolher(estilo, CHAVES_DE_CAIXA),
      ...escolher(no.props, CORES_DO_INTERRUPTOR),
    };
  }
  const superficie = escolher(estilo, CHAVES_DE_SUPERFICIE);
  if (Object.keys(superficie).length === 0 || estilo.backgroundColor === 'transparent') {
    return null;
  }
  return { elemento: 'superfície', ...superficie };
}

function capturarTelaEmFoco(): readonly Amostra[] {
  const telas = descendentes(screen.container).filter((no) => no.type === 'RNSScreen');
  const emFoco = telas.at(-1);
  if (emFoco === undefined) {
    throw new Error('Nenhuma tela em foco encontrada.');
  }
  return [emFoco, ...descendentes(emFoco)].map(amostraDe).filter((amostra) => amostra !== null);
}

async function entrar() {
  await render(<App />);
  await fireEvent.press(await screen.findByText('Entrar'));
  await screen.findByText('Área Segura');
}

describe.each(['light', 'dark'] as const)('estilo das telas no tema %s', (themeName: ThemeName) => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, theme: themeName }));
    jest.mocked(getBiometricStatus).mockResolvedValue('enrolled');
    jest.mocked(authenticateDeviceOwner).mockResolvedValue({ type: 'authenticated' });
  });

  test('login, início e configurações', async () => {
    await render(<App />);
    await screen.findByText('Use sua biometria ou a senha do aparelho para entrar.');
    expect(capturarTelaEmFoco()).toMatchSnapshot('login');

    await fireEvent.press(screen.getByText('Entrar'));
    await screen.findByText('Área Segura');
    expect(capturarTelaEmFoco()).toMatchSnapshot('início');

    await fireEvent.press(screen.getByText('Configurações'));
    await screen.findByText('Motor de gestos');
    expect(capturarTelaEmFoco()).toMatchSnapshot('configurações');
  });

  test('lista vazia e nova assinatura em pé e deitada', async () => {
    await entrar();
    await fireEvent.press(screen.getByText('Minhas assinaturas'));
    await screen.findByText('Nenhuma assinatura salva. Toque em Nova assinatura para desenhar a primeira.');
    expect(capturarTelaEmFoco()).toMatchSnapshot('lista vazia');

    await fireEvent.press(screen.getByText('Nova assinatura'));
    await screen.findByText('Deitar papel');
    expect(capturarTelaEmFoco()).toMatchSnapshot('nova assinatura');

    await fireEvent.press(screen.getByText('Deitar papel'));
    await screen.findByText('Voltar ao retrato');
    expect(capturarTelaEmFoco()).toMatchSnapshot('nova assinatura deitada');
  });

  test('lista com assinatura', async () => {
    await createAsyncStorageAssinaturaRepository().save(
      criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T12:00:00.000Z'),
    );
    await entrar();
    await fireEvent.press(screen.getByText('Minhas assinaturas'));
    await screen.findByText('Rubrica');
    expect(capturarTelaEmFoco()).toMatchSnapshot('lista com assinatura');
  });
});
