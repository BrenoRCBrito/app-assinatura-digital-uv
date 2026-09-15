import React, { useEffect, useEffectEvent, useRef, useState } from 'react';

import {
  Button,
  confirmDestructive,
  DadoDoDocumento,
  LoadingIndicator,
  MapaDoLocal,
  PreviaDocumento,
  Row,
  Screen,
  showError,
  showSuccess,
  Stack,
  Text,
} from '../../components';
import type { DocumentoAssinado, DocumentoId } from '../../domain/documento';
import { formatCoordinates, formatDateTime, formatLocal } from '../../domain/format';
import { excluirArquivosDocumento, uriFotoDocumento } from '../../services/fileSystem';
import { compartilharPdf } from '../../services/sharing';
import { useRepositories } from '../../storage/RepositoriesProvider';
import { excluirDocumento } from '../../useCases/excluirDocumento';

type DocumentoScreenProps = Readonly<{
  documentoId: DocumentoId;
  onNaoEncontrado: () => void;
  onExcluido: () => void;
}>;

export function DocumentoScreen({ documentoId, onNaoEncontrado, onExcluido }: DocumentoScreenProps) {
  const { documentos } = useRepositories();
  const [documento, setDocumento] = useState<DocumentoAssinado | null>(null);
  const compartilhandoRef = useRef(false);
  const excluindoRef = useRef(false);

  const sairComErro = useEffectEvent((mensagem: string) => {
    showError('Erro', mensagem);
    onNaoEncontrado();
  });

  useEffect(() => {
    let ativo = true;
    documentos.findById(documentoId).then(
      (encontrado) => {
        if (!ativo) {
          return;
        }
        if (encontrado === null) {
          sairComErro('Documento não encontrado.');
        } else {
          setDocumento(encontrado);
        }
      },
      (error: unknown) => {
        console.error('Falha ao carregar o documento:', error);
        if (ativo) {
          sairComErro('Não foi possível carregar os dados.');
        }
      },
    );
    return () => {
      ativo = false;
    };
  }, [documentoId, documentos]);

  async function compartilhar(documentoAberto: DocumentoAssinado) {
    if (compartilhandoRef.current) {
      return;
    }
    compartilhandoRef.current = true;
    try {
      if ((await compartilharPdf(documentoAberto)) === 'indisponivel') {
        showError('Erro', 'Compartilhamento indisponível neste aparelho.');
      }
    } catch (error) {
      console.error('Falha ao compartilhar o PDF:', error);
      showError('Erro', 'Não foi possível compartilhar o PDF.');
    } finally {
      compartilhandoRef.current = false;
    }
  }

  async function excluir(documentoAberto: DocumentoAssinado) {
    if (excluindoRef.current) {
      return;
    }
    excluindoRef.current = true;
    if ((await excluirDocumento({ documentos, excluirArquivosDocumento }, documentoAberto.id)) === 'falhou') {
      excluindoRef.current = false;
      showError('Erro', 'Não foi possível excluir o documento.');
      return;
    }
    showSuccess('Documento excluído');
    onExcluido();
  }

  function confirmarExclusao(documentoAberto: DocumentoAssinado) {
    confirmDestructive({
      title: 'Excluir documento',
      message: `Excluir "${documentoAberto.titulo}"? O PDF e a foto também são apagados.`,
      confirmLabel: 'Excluir',
      onConfirm: () => {
        void excluir(documentoAberto);
      },
    });
  }

  if (documento === null) {
    return (
      <Screen preset="centered">
        <LoadingIndicator />
      </Screen>
    );
  }

  const assinadoEm = formatDateTime(documento.assinadoEm);

  return (
    <Screen
      preset="menu"
      footer={
        <Stack gap="actions">
          <Button
            label="Compartilhar PDF"
            icon="share"
            onPress={() => {
              void compartilhar(documento);
            }}
          />
          <Row justify="center">
            <Button
              label="Excluir documento"
              icon="trash"
              onPress={() => confirmarExclusao(documento)}
              preset="danger"
              size="sm"
            />
          </Row>
        </Stack>
      }
    >
      <Stack gap="block">
        <Stack gap="text">
          <Text preset="screenTitle">{documento.titulo}</Text>
          <Text preset="supporting">PDF A4, 1 página</Text>
        </Stack>
        <Row gap="documentSummary" align="start">
          <PreviaDocumento
            foto={uriFotoDocumento(documento.id)}
            tamanhoFoto={documento.tamanhoFoto}
            desenho={documento.assinaturaUsada.desenho}
            selo={documento.selo}
            linhas={[assinadoEm, formatLocal(documento.local)]}
          />
          <Stack gap="documentData" flex={1}>
            <DadoDoDocumento rotulo="Assinado em" valor={assinadoEm} />
            {documento.local.cidade === null ? null : (
              <DadoDoDocumento rotulo="Local" valor={documento.local.cidade} />
            )}
            <DadoDoDocumento
              rotulo="Coordenadas"
              valor={formatCoordinates(documento.local.coordenadas)}
              preset="coordenadas"
            />
            <DadoDoDocumento rotulo="Assinatura" valor={documento.assinaturaUsada.nome} />
          </Stack>
        </Row>
        <MapaDoLocal coordenadas={documento.local.coordenadas} rotulo={documento.local.cidade} />
      </Stack>
    </Screen>
  );
}
