import React, { useEffect, useEffectEvent, useRef, useState } from 'react';

import {
  Button,
  DadoDoDocumento,
  LoadingIndicator,
  PreviaDocumento,
  Row,
  Screen,
  showError,
  Stack,
  Text,
} from '../../components';
import type { DocumentoAssinado, DocumentoId } from '../../domain/documento';
import { formatCoordinates, formatDateTime } from '../../domain/format';
import { uriFotoDocumento } from '../../services/fileSystem';
import { compartilharPdf } from '../../services/sharing';
import { useRepositories } from '../../storage/RepositoriesProvider';

type DocumentoScreenProps = Readonly<{
  documentoId: DocumentoId;
  onNaoEncontrado: () => void;
}>;

export function DocumentoScreen({ documentoId, onNaoEncontrado }: DocumentoScreenProps) {
  const { documentos } = useRepositories();
  const [documento, setDocumento] = useState<DocumentoAssinado | null>(null);
  const compartilhandoRef = useRef(false);

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

  if (documento === null) {
    return (
      <Screen preset="centered">
        <LoadingIndicator />
      </Screen>
    );
  }

  const assinadoEm = formatDateTime(documento.assinadoEm);
  const coordenadas = formatCoordinates(documento.local.coordenadas);

  return (
    <Screen
      preset="menu"
      footer={
        <Button
          label="Compartilhar PDF"
          icon="share"
          onPress={() => {
            void compartilhar(documento);
          }}
        />
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
            linhas={[assinadoEm, documento.local.cidade ?? coordenadas]}
          />
          <Stack gap="documentData" flex={1}>
            <DadoDoDocumento rotulo="Assinado em" valor={assinadoEm} />
            {documento.local.cidade === null ? null : (
              <DadoDoDocumento rotulo="Local" valor={documento.local.cidade} />
            )}
            <DadoDoDocumento rotulo="Coordenadas" valor={coordenadas} preset="coordenadas" />
            <DadoDoDocumento rotulo="Assinatura" valor={documento.assinaturaUsada.nome} />
          </Stack>
        </Row>
      </Stack>
    </Screen>
  );
}
