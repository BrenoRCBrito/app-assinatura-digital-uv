import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { createLatitude, createLongitude } from '../../domain/documento';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { lightTheme, tokens } from '../../theme';
import { MapaDoLocal } from '../MapaDoLocal';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const COORDENADAS = { latitude: createLatitude(-22.40418), longitude: createLongitude(-43.66283) };

describe('MapaDoLocal', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('mostra o mapa fixo em volta do local, com o marcador no ponto e a cidade no rótulo', async () => {
    await render(<MapaDoLocal coordenadas={COORDENADAS} rotulo="Vassouras" />, { wrapper: SettingsProvider });
    const mapa = await screen.findByLabelText('Mapa do local');
    const rotulo = screen.getByText('Vassouras');

    expect(mapa.props).toMatchObject({
      initialRegion: { latitude: -22.40418, longitude: -43.66283, latitudeDelta: 0.005, longitudeDelta: 0.005 },
      scrollEnabled: false,
      zoomEnabled: false,
      rotateEnabled: false,
      pitchEnabled: false,
    });
    expect(screen.getByLabelText('Local da assinatura').props.coordinate).toEqual({
      latitude: -22.40418,
      longitude: -43.66283,
    });
    expect(StyleSheet.flatten(mapa.parent?.props.style)).toEqual({
      height: tokens.size.map,
      overflow: 'hidden',
      borderRadius: tokens.radius.map,
    });
    expect(StyleSheet.flatten(rotulo.parent?.props.style)).toEqual({
      position: 'absolute',
      left: tokens.inset.mapLabel,
      bottom: tokens.inset.mapLabel,
      paddingVertical: tokens.inset.mapLabelY,
      paddingHorizontal: tokens.inset.mapLabelX,
      borderRadius: tokens.radius.mapLabel,
      backgroundColor: lightTheme.surface,
    });
  });

  test('sem cidade, mostra o mapa sem rótulo', async () => {
    await render(<MapaDoLocal coordenadas={COORDENADAS} rotulo={null} />, { wrapper: SettingsProvider });
    const mapa = await screen.findByLabelText('Mapa do local');

    expect(mapa.parent?.children).toHaveLength(1);
  });
});
