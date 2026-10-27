import React, { useMemo } from 'react';
import { Image, View } from 'react-native';

import type { Desenho } from '../../domain/desenho';
import { createPixels, type Size } from '../../domain/geometry';
import { layoutDaPagina } from '../../domain/pagina';
import type { FileUri } from '../../domain/photo';
import { layoutDoSelo, type PosicaoSelo } from '../../domain/selo';
import { useAppTheme } from '../../theme';
import { SeloDocumento } from '../SeloDocumento';
import { previaDocumentoPresets } from './presets';

type PreviaDocumentoProps = Readonly<{
  foto: FileUri;
  tamanhoFoto: Size;
  desenho: Desenho;
  selo: PosicaoSelo;
  linhas: readonly [string, string];
  largura?: number;
}>;

export function PreviaDocumento({ foto, tamanhoFoto, desenho, selo, linhas, largura }: PreviaDocumentoProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => previaDocumentoPresets.default(theme), [theme]);
  const larguraDaPagina = largura ?? theme.size.documentPreview;
  const medidas = useMemo(() => {
    const pagina = layoutDaPagina(tamanhoFoto, createPixels(larguraDaPagina));
    return {
      pagina: { width: pagina.pagina.width, height: pagina.pagina.height },
      foto: { left: pagina.esquerda, top: pagina.topo, width: pagina.foto.width, height: pagina.foto.height },
      selo: { left: selo.x * pagina.foto.width, top: selo.y * pagina.foto.height },
      layout: layoutDoSelo(selo.largura, pagina.foto, desenho.quadro),
    };
  }, [desenho.quadro, selo, tamanhoFoto, larguraDaPagina]);

  return (
    <View accessibilityLabel="Prévia do documento" style={[styles.pagina, medidas.pagina]}>
      <View style={[styles.foto, medidas.foto]}>
        <Image
          accessibilityLabel="Foto do documento"
          source={{ uri: foto }}
          resizeMode="contain"
          style={styles.imagem}
        />
        <View style={[styles.selo, medidas.selo]}>
          <SeloDocumento desenho={desenho} layout={medidas.layout} linhas={linhas} />
        </View>
      </View>
    </View>
  );
}
