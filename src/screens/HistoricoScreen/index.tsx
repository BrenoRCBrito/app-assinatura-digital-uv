import React, { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { DocumentoItem, List, Screen, showError } from '../../components';
import type { DocumentoAssinado, DocumentoId } from '../../domain/documento';
import { useRepositories } from '../../storage/RepositoriesProvider';

type HistoricoScreenProps = Readonly<{
  onAbrirDocumento: (documentoId: DocumentoId) => void;
}>;

export function HistoricoScreen({ onAbrirDocumento }: HistoricoScreenProps) {
  const { documentos: repositorio } = useRepositories();
  const [documentos, setDocumentos] = useState<readonly DocumentoAssinado[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      setDocumentos(await repositorio.list());
    } catch (error) {
      console.error('Falha ao carregar os documentos:', error);
      setDocumentos([]);
      showError('Erro', 'Não foi possível carregar os dados.');
    } finally {
      setCarregando(false);
    }
  }, [repositorio]);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  return (
    <Screen preset="list">
      <List
        preset="grouped"
        items={documentos}
        keyOf={(documento) => documento.id}
        loading={carregando}
        emptyMessage="Nenhum documento assinado. Toque em Digitalizar documento no Início para assinar o primeiro."
        renderItem={(documento) => (
          <DocumentoItem documento={documento} onPress={() => onAbrirDocumento(documento.id)} />
        )}
      />
    </Screen>
  );
}
