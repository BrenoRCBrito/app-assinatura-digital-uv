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
  enderecoDoCodigo,
  type ResultadoDaValidacao,
} from '../../domain/codigoDeAutenticidade';
import { useCameraPermission } from '../../hooks/useCameraPermission';
import { useSalvarEnderecoDaApi } from '../../hooks/useEnderecoDaApi';
import {
  conferirCodigoAntigo,
  consultarCodigo,
  enderecoAutomatico,
  ServidorIndisponivel,
} from '../../services/apiDeDocumentos';
import { ehModoDesenvolvedor } from '../../services/modoDesenvolvedor';
import { useSettings } from '../../storage/SettingsProvider';
import { validarCodigoLido } from '../../useCases/validarCodigoLido';

type ValidarDocumentoScreenProps = Readonly<{
  onFechar: () => void;
}>;

type Aviso = Readonly<{ titulo: string; descricao: string }>;

const VEREDICTOS: Readonly<Record<ResultadoDaValidacao['tipo'], Aviso>> = {
  autentico: {
    titulo: 'Documento autêntico',
    descricao: 'O código foi emitido pelo AssinaAqui. Confira se os dados abaixo batem com o documento em mãos.',
  },
  adulterado: {
    titulo: 'Código não autenticado',
    descricao: 'O registro deste código não confere com o carimbo do servidor do AssinaAqui.',
  },
  naoEncontrado: {
    titulo: 'Código não encontrado',
    descricao: 'Confira os caracteres digitados. Nenhum documento foi emitido com este código.',
  },
  ilegivel: {
    titulo: 'Código não reconhecido',
    descricao: 'Este código não é do AssinaAqui.',
  },
};

const SEM_SERVIDOR: Aviso = {
  titulo: 'Servidor indisponível',
  descricao: 'O AssinaAqui não alcançou o servidor. Confira a conexão com a internet e tente de novo.',
};

// Em desenvolvimento o servidor pode ser a API no PC: a tela também deixa corrigir o endereço.
const SEM_SERVIDOR_EM_DESENVOLVIMENTO: Aviso = {
  titulo: 'Servidor indisponível',
  descricao: 'O AssinaAqui não alcançou o servidor. Confira o wifi e o endereço da API e tente de novo.',
};

const AVISO_DE_VERSAO = 'O código veio de uma versão mais nova do app; campos novos aparecem com o nome original.';

const EXEMPLO_DO_CODIGO = '7K3F-9QXZ-M2P4';
const EXEMPLO_DO_ENDERECO = 'http://192.168.0.10:3000';

export function ValidarDocumentoScreen({ onFechar }: ValidarDocumentoScreenProps) {
  const permissao = useCameraPermission();
  const [resultado, setResultado] = useState<ResultadoDaValidacao | null>(null);
  const [semServidor, setSemServidor] = useState<string | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [modo, setModo] = useState<'leitor' | 'digitar'>('leitor');
  const [codigoDigitado, setCodigoDigitado] = useState('');
  const [mostrarMapa, setMostrarMapa] = useState(false);
  const { settings } = useSettings();
  const [endereco, setEndereco] = useState(settings.enderecoDaApi ?? '');
  const salvarEnderecoDaApi = useSalvarEnderecoDaApi();
  const modoDesenvolvedor = ehModoDesenvolvedor();
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
      const veredicto = await validarCodigoLido({ consultarCodigo, conferirCodigoAntigo }, texto);
      setSemServidor(null);
      setResultado(veredicto);
    } catch (error) {
      if (error instanceof ServidorIndisponivel) {
        setSemServidor(texto);
      } else {
        console.error('Falha ao conferir o código:', error);
        showError('Erro', 'Não foi possível conferir o código.');
        setSemServidor(null);
        lendoRef.current = false;
      }
    } finally {
      setConferindo(false);
    }
  }

  function tentarDeNovo(texto: string) {
    if (modoDesenvolvedor && endereco !== (settings.enderecoDaApi ?? '')) {
      const salvo = salvarEnderecoDaApi(endereco);
      if (!salvo.ok) {
        showError('Endereço inválido', salvo.mensagem);
        return;
      }
    }
    lendoRef.current = false;
    void conferir(texto);
  }

  function lerOutro() {
    lendoRef.current = false;
    setResultado(null);
    setSemServidor(null);
    setCodigoDigitado('');
    setMostrarMapa(false);
  }

  function avisarFalhaAoAbrirCamera(error: unknown) {
    console.error('Falha ao abrir a câmera:', error);
    showError('Erro', 'Não foi possível abrir a câmera. Tente de novo.');
    onFechar();
  }

  if (resultado === null && semServidor !== null) {
    const aviso = modoDesenvolvedor ? SEM_SERVIDOR_EM_DESENVOLVIMENTO : SEM_SERVIDOR;

    return (
      <Screen
        preset="authScroll"
        footer={
          <Stack gap="actions">
            <Button
              label={conferindo ? 'Tentando…' : 'Tentar de novo'}
              onPress={() => tentarDeNovo(semServidor)}
              disabled={conferindo}
            />
            <Button label="Fechar" onPress={onFechar} preset="secondary" />
          </Stack>
        }
      >
        <Stack gap="block">
          <Stack gap="titleText" align="center">
            <Text preset="screenTitle">{aviso.titulo}</Text>
            <Text preset="status">{aviso.descricao}</Text>
          </Stack>
          {modoDesenvolvedor ? (
            <TextField
              label="Endereço da API"
              accessibilityLabel="Endereço da API"
              value={endereco}
              onChangeText={setEndereco}
              placeholder={enderecoAutomatico() ?? EXEMPLO_DO_ENDERECO}
              keyboardType="url"
              autoCapitalize="none"
            />
          ) : null}
        </Stack>
      </Screen>
    );
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
            <Text preset="status">Digite o código impresso ao lado do QR, com ou sem os hífens.</Text>
          </Stack>
          <TextField
            label="Código de autenticidade"
            accessibilityLabel="Código de autenticidade"
            value={codigoDigitado}
            onChangeText={setCodigoDigitado}
            placeholder={EXEMPLO_DO_CODIGO}
            autoCapitalize="characters"
          />
        </Stack>
      </Screen>
    );
  }

  if (permissao.status === 'checking' && resultado === null) {
    return (
      <Screen preset="immersive">
        <LoadingIndicator />
      </Screen>
    );
  }

  if (permissao.status !== 'granted' && resultado === null) {
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
        {coordenadas !== null && mostrarMapa ? (
          <MapaDoLocal
            coordenadas={coordenadas}
            rotulo={resultado.tipo === 'autentico' ? enderecoDoCodigo(resultado.campos) : null}
          />
        ) : null}
        {resultado.tipo === 'autentico' && resultado.versaoMaisNova ? (
          <Text preset="supporting">{AVISO_DE_VERSAO}</Text>
        ) : null}
      </Stack>
    </Screen>
  );
}
