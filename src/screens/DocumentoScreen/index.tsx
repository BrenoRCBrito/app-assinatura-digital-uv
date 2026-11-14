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
  VisualizadorDocumento,
} from '../../components';
import { formatarCodigoCurto, type CodigoCurto } from '../../domain/codigoCurto';
import type { DocumentoAssinado, DocumentoId } from '../../domain/documento';
import { formatCoordinates, formatDateTime, formatLocal } from '../../domain/format';
import { useAuthentication } from '../../hooks/useAuthentication';
import { useEnderecoDoDocumento } from '../../hooks/useEnderecoDoDocumento';
import { baixarArquivosDoDocumento } from '../../services/baixarArquivosDoDocumento';
import { copiarTexto } from '../../services/clipboard';
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
  const { usuarioId } = useAuthentication();
  const [documento, setDocumento] = useState<DocumentoAssinado | null>(null);
  const compartilhandoRef = useRef(false);
  const excluindoRef = useRef(false);
  const copiandoRef = useRef(false);
  const baixandoRef = useRef(false);
  const [baixando, setBaixando] = useState(false);
  const [ampliado, setAmpliado] = useState(false);
  const endereco = useEnderecoDoDocumento(documento?.local ?? null);

  const sairComErro = useEffectEvent((mensagem: string) => {
    showError('Erro', mensagem);
    onNaoEncontrado();
  });

  useEffect(() => {
    if (usuarioId === null) {
      return;
    }
    let ativo = true;
    documentos.findById(documentoId, usuarioId).then(
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
    if (documentoAberto.pdfStatus !== 'local') {
      showError('Erro', 'O PDF deste documento ainda não está neste aparelho.');
      return;
    }
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

  async function copiarCodigo(codigo: CodigoCurto) {
    if (copiandoRef.current) {
      return;
    }
    copiandoRef.current = true;
    try {
      await copiarTexto(formatarCodigoCurto(codigo));
      showSuccess('Código copiado');
    } catch (error) {
      console.error('Falha ao copiar o código:', error);
      showError('Erro', 'Não foi possível copiar o código.');
    } finally {
      copiandoRef.current = false;
    }
  }

  async function baixar(documentoAberto: DocumentoAssinado) {
    if (baixandoRef.current) {
      return;
    }
    baixandoRef.current = true;
    setBaixando(true);
    try {
      const resultado = await baixarArquivosDoDocumento(documentos, documentoAberto);
      const atualizado = await documentos.findById(documentoAberto.id, documentoAberto.usuarioId);
      if (atualizado !== null) {
        setDocumento(atualizado);
      }
      if (resultado.falhas > 0) {
        showError('Erro', 'Não foi possível baixar. Confira a conexão e tente de novo.');
      } else if (resultado.ausentes > 0) {
        showError('Erro', 'O outro aparelho ainda não enviou os arquivos deste documento. Abra o app lá e tente de novo.');
      } else {
        showSuccess('Documento baixado');
      }
    } catch (error) {
      console.error('Falha ao baixar o documento:', error);
      showError('Erro', 'Não foi possível baixar. Confira a conexão e tente de novo.');
    } finally {
      baixandoRef.current = false;
      setBaixando(false);
    }
  }

  async function excluir(documentoAberto: DocumentoAssinado) {
    if (excluindoRef.current) {
      return;
    }
    excluindoRef.current = true;
    if ((await excluirDocumento({ documentos, excluirArquivosDocumento }, documentoAberto)) === 'falhou') {
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
  const { codigo } = documento;

  return (
    <Screen
      preset="menu"
      footer={
        <Stack gap="actions">
          {documento.fotoStatus === 'local' && documento.pdfStatus === 'local' ? null : (
            <Button
              label={baixando ? 'Baixando…' : 'Baixar do servidor'}
              icon="share"
              preset="secondary"
              disabled={baixando}
              onPress={() => {
                void baixar(documento);
              }}
            />
          )}
          <Button
            label="Compartilhar PDF"
            icon="share"
            onPress={() => {
              void compartilhar(documento);
            }}
          />
          {codigo === null ? null : (
            <Button
              label="Copiar código"
              icon="share"
              preset="secondary"
              onPress={() => {
                void copiarCodigo(codigo);
              }}
            />
          )}
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
        {documento.fotoStatus === 'local' ? null : (
          <Text preset="supporting">A foto deste documento ainda não está neste aparelho.</Text>
        )}
        <Row gap="documentSummary" align="start">
          {documento.fotoStatus === 'local' ? (
            <PreviaDocumento
              foto={uriFotoDocumento(documento)}
              tamanhoFoto={documento.tamanhoFoto}
              desenho={documento.assinaturaUsada.desenho}
              selo={documento.selo}
              linhas={[assinadoEm, formatLocal(documento.local)]}
              onAmpliar={() => setAmpliado(true)}
            />
          ) : null}
          <Stack gap="documentData" flex={1}>
            <DadoDoDocumento rotulo="Assinado em" valor={assinadoEm} />
            {endereco !== null ? (
              <DadoDoDocumento rotulo="Endereço aproximado" valor={endereco} />
            ) : documento.local.cidade === null ? null : (
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
        <MapaDoLocal coordenadas={documento.local.coordenadas} rotulo={endereco ?? documento.local.cidade} />
      </Stack>
      <VisualizadorDocumento
        visible={ampliado}
        titulo={documento.titulo}
        foto={uriFotoDocumento(documento)}
        tamanhoFoto={documento.tamanhoFoto}
        desenho={documento.assinaturaUsada.desenho}
        selo={documento.selo}
        linhas={[assinadoEm, formatLocal(documento.local)]}
        onClose={() => setAmpliado(false)}
        onCompartilhar={() => {
          void compartilhar(documento);
        }}
      />
    </Screen>
  );
}
