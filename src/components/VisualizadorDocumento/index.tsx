import React, { useMemo } from 'react';
import { Modal, ScrollView, useWindowDimensions, View } from 'react-native';
import { Row } from '../Layout';
import type { Desenho } from '../../domain/desenho';
import type { Size } from '../../domain/geometry';
import type { FileUri } from '../../domain/photo';
import type { PosicaoSelo } from '../../domain/selo';
import { useAppTheme } from '../../theme';
import { Button } from '../Button';
import { PreviaDocumento } from '../PreviaDocumento';
import { Screen } from '../Screen';
import { Text } from '../Text';
import { visualizadorDocumentoPresets } from './presets';

type VisualizadorDocumentoProps = Readonly<{
  visible: boolean;
  titulo: string;
  foto: FileUri;
  tamanhoFoto: Size;
  desenho: Desenho;
  selo: PosicaoSelo;
  linhas: readonly [string, string];
  onClose: () => void;
  onCompartilhar: () => void;
}>;

export function VisualizadorDocumento({
  visible,
  titulo,
  foto,
  tamanhoFoto,
  desenho,
  selo,
  linhas,
  onClose,
  onCompartilhar,
}: VisualizadorDocumentoProps) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => visualizadorDocumentoPresets.default(theme), [theme]);
  const { width } = useWindowDimensions();

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Screen
            preset="preview"
            footer={
            <Row gap="actions">
                <Button label="Fechar" onPress={onClose} preset="secondary" flex={1} />
                <Button label="Compartilhar" icon="share" onPress={onCompartilhar} flex={1} />
            </Row>
            }
        >
        <View style={styles.titulo}>
          <Text preset="screenTitle" numberOfLines={1}>
            {titulo}
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.conteudo}
          maximumZoomScale={3}
          minimumZoomScale={1}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <PreviaDocumento
              foto={foto}
              tamanhoFoto={tamanhoFoto}
              desenho={desenho}
              selo={selo}
              linhas={linhas}
              largura={width - styles.margemTotal}
            />
          </View>
        </ScrollView>
      </Screen>
    </Modal>
  );
}
