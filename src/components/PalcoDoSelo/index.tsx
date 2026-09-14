import React, { useMemo, useState } from 'react';
import { Image, View, type LayoutChangeEvent } from 'react-native';

import type { Desenho } from '../../domain/desenho';
import {
  clampToArea,
  createPixels,
  createSize,
  fitSizeInside,
  type Fraction,
  type ScreenPoint,
  type Size,
} from '../../domain/geometry';
import type { CapturedPhoto } from '../../domain/photo';
import {
  layoutDoSelo,
  paraPontoNaArea,
  paraPosicaoSelo,
  posicaoInicialDoSelo,
  type PosicaoSelo,
} from '../../domain/selo';
import { useSeloArrastavel } from '../../gestures/SeloArrastavel';
import { useAppTheme } from '../../theme';
import { Icon } from '../Icon';
import { SeloDocumento } from '../SeloDocumento';
import { palcoDoSeloPresets } from './presets';

type PalcoDoSeloProps = Readonly<{
  foto: CapturedPhoto;
  desenho: Desenho;
  largura: Fraction;
  linhas: readonly [string, string];
  posicao: PosicaoSelo | null;
  onMudarPosicao: (posicao: PosicaoSelo) => void;
}>;

export function PalcoDoSelo({ foto, desenho, largura, linhas, posicao, onMudarPosicao }: PalcoDoSeloProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => palcoDoSeloPresets.default(theme), [theme]);
  const SeloArrastavel = useSeloArrastavel();
  const [palco, setPalco] = useState<Size | null>(null);

  const cena = useMemo(() => {
    if (palco === null || palco.width === 0 || palco.height === 0) {
      return null;
    }
    const area = fitSizeInside(foto.size, palco);
    const layout = layoutDoSelo(largura, area, desenho.quadro);
    const inicio = posicao === null ? posicaoInicialDoSelo(layout.tamanho, area) : paraPontoNaArea(posicao, area);
    const limitado = clampToArea(inicio, layout.tamanho, area);
    return {
      area,
      layout,
      posicaoInicial: { x: createPixels(limitado.x), y: createPixels(limitado.y) },
      tamanhoDaFoto: { width: area.width, height: area.height },
    };
  }, [desenho.quadro, foto.size, largura, palco, posicao]);

  function medirPalco(evento: LayoutChangeEvent) {
    const { width, height } = evento.nativeEvent.layout;
    setPalco(createSize(Math.round(width), Math.round(height)));
  }

  function soltar(ponto: ScreenPoint) {
    if (cena !== null) {
      onMudarPosicao(paraPosicaoSelo(ponto, cena.layout.tamanho, cena.area));
    }
  }

  return (
    <View accessibilityLabel="Palco do documento" style={styles.palco} onLayout={medirPalco}>
      {cena === null ? null : (
        <View style={cena.tamanhoDaFoto}>
          <Image
            accessibilityLabel="Foto do documento"
            source={{ uri: foto.uri }}
            resizeMode="contain"
            style={styles.imagem}
          />
          <SeloArrastavel
            key={`${cena.layout.tamanho.width}x${cena.layout.tamanho.height}-${cena.area.width}x${cena.area.height}`}
            area={cena.area}
            tamanho={cena.layout.tamanho}
            posicaoInicial={cena.posicaoInicial}
            aoSoltar={soltar}
          >
            <View style={styles.moldura}>
              <SeloDocumento desenho={desenho} layout={cena.layout} linhas={linhas} />
              <View style={styles.borda} />
              <View style={styles.alca}>
                <Icon name="move" size="handle" color={styles.iconColor} />
              </View>
            </View>
          </SeloArrastavel>
        </View>
      )}
    </View>
  );
}
