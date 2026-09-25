import React, { useMemo } from 'react';
import { View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import type { Coordinates } from '../../domain/documento';
import { useAppTheme } from '../../theme';
import { Text } from '../Text';
import { mapaDoLocalPresets } from './presets';

type MapaDoLocalProps = Readonly<{
  coordenadas: Coordinates;
  rotulo: string | null;
}>;

const ALCANCE_DO_MAPA_EM_GRAUS = 0.005;

export function MapaDoLocal({ coordenadas, rotulo }: MapaDoLocalProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => mapaDoLocalPresets.default(theme), [theme]);
  const ponto = { latitude: coordenadas.latitude, longitude: coordenadas.longitude };

  return (
    <View style={styles.moldura}>
      <MapView
        accessibilityLabel="Mapa do local"
        style={styles.mapa}
        initialRegion={{ ...ponto, latitudeDelta: ALCANCE_DO_MAPA_EM_GRAUS, longitudeDelta: ALCANCE_DO_MAPA_EM_GRAUS }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Marker accessibilityLabel="Local da assinatura" coordinate={ponto} />
      </MapView>
      {rotulo === null ? null : (
        <View style={styles.rotulo}>
          <Text preset="mapLabel">{rotulo}</Text>
        </View>
      )}
    </View>
  );
}
