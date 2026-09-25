import React, { useRef, useState } from 'react';

import {
  Button,
  Card,
  DadoDoDocumento,
  LoadingIndicator,
  QrScanner,
  Screen,
  showError,
  Stack,
  Text,
} from '../../components';
import { camposParaExibir, validarCodigo, type ResultadoDaValidacao } from '../../domain/codigoDeAutenticidade';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { carimbarComOSegredoDoApp } from '../../services/carimbo';

type ValidarDocumentoScreenProps = Readonly<{
  onFechar: () => void;
}>;

const VEREDICTOS: Readonly<Record<ResultadoDaValidacao['tipo'], Readonly<{ titulo: string; descricao: string }>>> = {
  autentico: {
    titulo: 'Documento autêntico',
    descricao: 'O código foi emitido pelo AssinaAqui. Confira se os dados abaixo batem com o documento em mãos.',
  },
  adulterado: {
    titulo: 'Código adulterado',
    descricao: 'O código não confere com o carimbo do AssinaAqui. Não confie neste documento.',
  },
  ilegivel: {
    titulo: 'Código não reconhecido',
    descricao: 'Este QR não é um código de autenticidade do AssinaAqui.',
  },
};

const AVISO_DE_VERSAO = 'O código veio de uma versão mais nova do app; campos novos aparecem com o nome original.';

export function ValidarDocumentoScreen({ onFechar }: ValidarDocumentoScreenProps) {
  const permissao = useCameraPermission();
  const [resultado, setResultado] = useState<ResultadoDaValidacao | null>(null);
  const [conferindo, setConferindo] = useState(false);
  // O leitor dispara a cada quadro; a ref barra a segunda leitura antes do próximo render.
  const lendoRef = useRef(false);

  async function conferir(texto: string) {
    if (lendoRef.current) {
      return;
    }
    lendoRef.current = true;
    setConferindo(true);
    try {
      setResultado(await validarCodigo(texto, carimbarComOSegredoDoApp));
    } catch (error) {
      console.error('Falha ao conferir o código:', error);
      showError('Erro', 'Não foi possível conferir o código neste aparelho.');
      lendoRef.current = false;
    } finally {
      setConferindo(false);
    }
  }

  function lerOutro() {
    lendoRef.current = false;
    setResultado(null);
  }

  function avisarFalhaAoAbrirCamera(error: unknown) {
    console.error('Falha ao abrir a câmera:', error);
    showError('Erro', 'Não foi possível abrir a câmera. Tente de novo.');
    onFechar();
  }

  if (permissao.status === 'checking') {
    return (
      <Screen preset="immersive">
        <LoadingIndicator />
      </Screen>
    );
  }

  if (permissao.status !== 'granted') {
    const bloqueada = permissao.status === 'blocked';

    return (
      <Screen
        preset="immersive"
        footer={
          <Stack gap="actions">
            {bloqueada ? (
              <Button label="Abrir configurações" icon="settings" onPress={permissao.openSettings} />
            ) : (
              <Button label="Permitir câmera" icon="camera" onPress={permissao.request} />
            )}
            <Button label="Voltar" onPress={onFechar} preset="secondary" />
          </Stack>
        }
      >
        <Stack gap="titleText" align="center">
          <Text preset="screenTitle">Acesso à câmera</Text>
          <Text preset="status">
            {bloqueada
              ? 'A câmera está bloqueada para o Assina Aqui. Libere o acesso nas configurações do aparelho.'
              : 'O Assina Aqui precisa da câmera para ler o QR do documento.'}
          </Text>
        </Stack>
      </Screen>
    );
  }

  if (resultado === null) {
    return (
      <Screen preset="camera">
        <QrScanner
          ativo={!conferindo}
          onLido={(texto) => {
            void conferir(texto);
          }}
          onClose={onFechar}
          onMountError={avisarFalhaAoAbrirCamera}
        />
      </Screen>
    );
  }

  const veredicto = VEREDICTOS[resultado.tipo];

  return (
    <Screen
      preset="authScroll"
      footer={
        <Stack gap="actions">
          <Button label="Ler outro" icon="camera" onPress={lerOutro} />
          <Button label="Fechar" onPress={onFechar} preset="secondary" />
        </Stack>
      }
    >
      <Stack gap="block">
        <Card title={veredicto.titulo} description={veredicto.descricao}>
          {resultado.tipo === 'autentico' ? (
            <Stack gap="documentData">
              {camposParaExibir(resultado.campos).map((campo) => (
                <DadoDoDocumento key={campo.rotulo} rotulo={campo.rotulo} valor={campo.valor} />
              ))}
            </Stack>
          ) : null}
        </Card>
        {resultado.tipo === 'autentico' && resultado.versaoMaisNova ? (
          <Text preset="supporting">{AVISO_DE_VERSAO}</Text>
        ) : null}
      </Stack>
    </Screen>
  );
}
