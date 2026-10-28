import React, { useRef, useState } from 'react';

import {
  Button,
  Card,
  DadoDoDocumento,
  LoadingIndicator,
  MapaDoLocal,
  QrScanner,
  Screen,
  showError,
  Stack,
  Text,
  TextField,
} from '../../components';
import {
  camposParaExibir,
  coordenadasDoCodigo,
  validarCodigo,
  type ResultadoDaValidacao,
} from '../../domain/codigoDeAutenticidade';
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
    titulo: 'Código não autenticado',
    descricao:
      'O código não confere com o carimbo desta instalação do AssinaAqui. Ele pode ter sido alterado ou emitido ' +
      'com outro segredo.',
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
  const [modo, setModo] = useState<'leitor' | 'digitar'>('leitor');
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [mostrarMapa, setMostrarMapa] = useState(false);
  // O leitor dispara a cada quadro; a ref barra a segunda leitura antes do próximo render.
  const lendoRef = useRef(false);

  async function conferir(texto: string) {
    if (lendoRef.current) {
      return;
    }
    lendoRef.current = true;
    setConferindo(true);
    setMostrarMapa(false);
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
    setCodigoDigitado('');
    setMostrarMapa(false);
  }

  function avisarFalhaAoAbrirCamera(error: unknown) {
    console.error('Falha ao abrir a câmera:', error);
    showError('Erro', 'Não foi possível abrir a câmera. Tente de novo.');
    onFechar();
  }

  if (resultado === null && modo === 'digitar') {
    // Colar de mensagem ou PDF, ou digitar à mão, costuma trazer espaços e quebras de linha; o código não tem nenhum.
    const codigoLimpo = codigoDigitado.replace(/\s+/g, '');

    return (
      <Screen
        preset="authScroll"
        footer={
          <Stack gap="actions">
            <Button
              label="Conferir"
              onPress={() => {
                void conferir(codigoLimpo);
              }}
              disabled={codigoLimpo === '' || conferindo}
            />
            <Button label="Usar a câmera" icon="camera" onPress={() => setModo('leitor')} preset="secondary" />
            <Button label="Fechar" onPress={onFechar} preset="secondary" />
          </Stack>
        }
      >
        <Stack gap="block">
          <Stack gap="titleText" align="center">
            <Text preset="screenTitle">Digitar código</Text>
            <Text preset="status">
              Cole ou digite o código de autenticidade do documento, sem alterar nenhum caractere.
            </Text>
          </Stack>
          <TextField
            label="Código de autenticidade"
            accessibilityLabel="Código de autenticidade"
            value={codigoDigitado}
            onChangeText={setCodigoDigitado}
            placeholder="AA1;id=..."
            preset="multiline"
            autoCapitalize="none"
          />
        </Stack>
      </Screen>
    );
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
            <Button label="Digitar código" onPress={() => setModo('digitar')} preset="secondary" />
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
      <Screen
        preset="camera"
        footer={<Button label="Digitar código" onPress={() => setModo('digitar')} preset="secondary" />}
      >
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
  const coordenadas = resultado.tipo === 'autentico' ? coordenadasDoCodigo(resultado.campos) : null;

  return (
    <Screen
      preset="authScroll"
      footer={
        <Stack gap="actions">
          <Button
            label={modo === 'digitar' ? 'Conferir outro' : 'Ler outro'}
            icon={modo === 'digitar' ? undefined : 'camera'}
            onPress={lerOutro}
          />
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
        {coordenadas === null ? null : (
          <Button
            label={mostrarMapa ? 'Esconder localização' : 'Ver localização'}
            onPress={() => setMostrarMapa((atual) => !atual)}
            preset="secondary"
            size="sm"
          />
        )}
        {coordenadas !== null && mostrarMapa ? <MapaDoLocal coordenadas={coordenadas} rotulo={null} /> : null}
        {resultado.tipo === 'autentico' && resultado.versaoMaisNova ? (
          <Text preset="supporting">{AVISO_DE_VERSAO}</Text>
        ) : null}
      </Stack>
    </Screen>
  );
}
