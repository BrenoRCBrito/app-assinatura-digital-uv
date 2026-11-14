import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { criarCodigoCurto } from '../../domain/codigoCurto';
import { camposDoDocumento } from '../../domain/codigoDeAutenticidade';
import { criarCpf, criarEmail } from '../../domain/usuario';
import {
  conferirCodigoAntigo,
  consultarCodigo,
  definirEnderecoConfigurado,
  ServidorIndisponivel,
} from '../../services/apiDeDocumentos';
import { ehModoDesenvolvedor } from '../../services/modoDesenvolvedor';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { SETTINGS_STORAGE_KEY } from '../../storage/settingsStorage';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { ValidarDocumentoScreen } from '../ValidarDocumentoScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/modoDesenvolvedor', () => ({ ehModoDesenvolvedor: jest.fn(() => true) }));
jest.mock('../../services/apiDeDocumentos', () => ({
  ServidorIndisponivel: jest.requireActual('../../services/apiDeDocumentos').ServidorIndisponivel,
  consultarCodigo: jest.fn(),
  conferirCodigoAntigo: jest.fn(),
  definirEnderecoConfigurado: jest.fn(),
  enderecoAutomatico: jest.fn(() => null),
}));
jest.mock('expo-camera', () => {
  const { Component } = require('react');

  class CameraView extends Component {
    componentDidMount() {
      mockCamera.atual = this as unknown as CameraSimulada;
    }

    componentDidUpdate() {
      mockCamera.atual = this as unknown as CameraSimulada;
    }

    componentWillUnmount() {
      mockCamera.atual = null;
    }

    render() {
      return null;
    }
  }

  return { CameraView, useCameraPermissions: jest.fn() };
});

type CameraSimulada = Readonly<{
  props: Readonly<{ onBarcodeScanned?: (resultado: Readonly<{ data: string; type: string }>) => void }>;
}>;

const mockCamera: { atual: CameraSimulada | null } = { atual: null };
const camera = jest.requireMock<{ useCameraPermissions: jest.Mock }>('expo-camera');
const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const TITULAR = { email: criarEmail('breno@exemplo.com'), cpf: criarCpf('123.456.789-09'), telefone: null };
const CAMPOS = camposDoDocumento(DOCUMENTO, TITULAR, 'a'.repeat(64));
const AUTENTICO = { tipo: 'autentico' as const, campos: CAMPOS, versaoMaisNova: false };
const CODIGO = '7K3F-9QXZ-M2P4';
const DICA = 'Aponte para o QR do documento';

async function abrirTela(permissao = { granted: true, canAskAgain: true }) {
  camera.useCameraPermissions.mockReturnValue([permissao, jest.fn(), jest.fn()]);
  const onFechar = jest.fn();
  await render(<ValidarDocumentoScreen onFechar={onFechar} />, { wrapper: SettingsProvider });
  return { onFechar };
}

async function lerQr(...textos: string[]) {
  await act(async () => {
    for (const texto of textos) {
      mockCamera.atual?.props.onBarcodeScanned?.({ data: texto, type: 'qr' });
    }
  });
}

async function digitarEConferir(texto: string) {
  await fireEvent.press(await screen.findByText('Digitar código'));
  await fireEvent.changeText(await screen.findByLabelText('Código de autenticidade'), texto);
  await fireEvent.press(screen.getByText('Conferir'));
}

describe('ValidarDocumentoScreen', () => {
  let alerta: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.mocked(consultarCodigo).mockResolvedValue(AUTENTICO);
    jest.mocked(conferirCodigoAntigo).mockResolvedValue(AUTENTICO);
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alerta.mockRestore();
  });

  test('código do QR é conferido na API e mostra quem assinou, sem o resumo da foto', async () => {
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(CODIGO);

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(consultarCodigo).toHaveBeenCalledWith(criarCodigoCurto(CODIGO));
    expect(screen.getByText('breno@exemplo.com')).toBeTruthy();
    expect(screen.getByText('***.456.789-**')).toBeTruthy();
    expect(screen.getByText('Contrato de locação')).toBeTruthy();
    expect(screen.getByText('-22.40418, -43.66283')).toBeTruthy();
    expect(screen.queryByText('a'.repeat(64))).toBeNull();
  });

  test('registro que não confere com o carimbo do servidor mostra só o veredicto', async () => {
    jest.mocked(consultarCodigo).mockResolvedValue({ tipo: 'adulterado' });
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(CODIGO);

    expect(await screen.findByText('Código não autenticado')).toBeTruthy();
    expect(screen.getByText(/não confere com o carimbo do servidor/)).toBeTruthy();
    expect(screen.queryByText('breno@exemplo.com')).toBeNull();
  });

  test('código que o servidor não conhece', async () => {
    jest.mocked(consultarCodigo).mockResolvedValue({ tipo: 'naoEncontrado' });
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(CODIGO);

    expect(await screen.findByText('Código não encontrado')).toBeTruthy();
    expect(screen.getByText(/Confira os caracteres digitados/)).toBeTruthy();
  });

  test('QR de outro app não é reconhecido e nem chega à API', async () => {
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr('https://exemplo.com/documento');

    expect(await screen.findByText('Código não reconhecido')).toBeTruthy();
    expect(consultarCodigo).not.toHaveBeenCalled();
    expect(conferirCodigoAntigo).not.toHaveBeenCalled();
  });

  test('QR antigo, no formato AA1, é conferido pela API', async () => {
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr('AA1;id=1757680000000#carimbo');

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(conferirCodigoAntigo).toHaveBeenCalledWith('AA1;id=1757680000000#carimbo');
  });

  test('confere uma vez só quando o leitor dispara várias vezes seguidas', async () => {
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(CODIGO, CODIGO, CODIGO);

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(consultarCodigo).toHaveBeenCalledTimes(1);
  });

  test('Ler outro volta ao leitor e aceita um código novo', async () => {
    await abrirTela();
    await screen.findByText(DICA);
    await lerQr('https://exemplo.com/documento');
    await screen.findByText('Código não reconhecido');

    await fireEvent.press(screen.getByText('Ler outro'));
    await screen.findByText(DICA);
    await lerQr(CODIGO);

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
  });

  test('sem servidor, avisa e Tentar de novo repete a mesma consulta', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(consultarCodigo).mockRejectedValueOnce(new ServidorIndisponivel());
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(CODIGO);

    expect(await screen.findByText('Servidor indisponível')).toBeTruthy();
    expect(screen.getByText(/Confira o wifi e o endereço da API/)).toBeTruthy();

    await fireEvent.press(screen.getByText('Tentar de novo'));

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(consultarCodigo).toHaveBeenCalledTimes(2);
    expect(jest.mocked(consultarCodigo).mock.calls[1]).toEqual([criarCodigoCurto(CODIGO)]);
    erro.mockRestore();
  });

  test('sem servidor, corrige o endereço da API ali mesmo e tenta de novo', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(consultarCodigo).mockRejectedValueOnce(new ServidorIndisponivel());
    await abrirTela();
    await screen.findByText(DICA);
    await lerQr(CODIGO);
    await screen.findByText('Servidor indisponível');

    await fireEvent.changeText(screen.getByLabelText('Endereço da API'), 'http://192.168.0.10:3000/');
    await fireEvent.press(screen.getByText('Tentar de novo'));

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(definirEnderecoConfigurado).toHaveBeenCalledWith('http://192.168.0.10:3000');
    expect(JSON.parse((await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)) ?? '{}').enderecoDaApi).toBe(
      'http://192.168.0.10:3000',
    );
    erro.mockRestore();
  });

  test('no APK de entrega, sem servidor pede para conferir a internet, sem campo de endereço', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(ehModoDesenvolvedor).mockReturnValue(false);
    try {
      jest.mocked(consultarCodigo).mockRejectedValueOnce(new ServidorIndisponivel());
      await abrirTela();
      await screen.findByText(DICA);
      await lerQr(CODIGO);

      expect(await screen.findByText('Servidor indisponível')).toBeTruthy();
      expect(screen.getByText(/Confira a conexão com a internet/)).toBeTruthy();
      expect(screen.queryByLabelText('Endereço da API')).toBeNull();

      await fireEvent.press(screen.getByText('Tentar de novo'));

      expect(await screen.findByText('Documento autêntico')).toBeTruthy();
      expect(definirEnderecoConfigurado).not.toHaveBeenCalled();
    } finally {
      jest.mocked(ehModoDesenvolvedor).mockReturnValue(true);
      erro.mockRestore();
    }
  });

  test('endereço inválido na tela sem servidor avisa e não tenta de novo', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(consultarCodigo).mockRejectedValueOnce(new ServidorIndisponivel());
    await abrirTela();
    await screen.findByText(DICA);
    await lerQr(CODIGO);
    await screen.findByText('Servidor indisponível');

    await fireEvent.changeText(screen.getByLabelText('Endereço da API'), '192.168.0.10');
    await fireEvent.press(screen.getByText('Tentar de novo'));

    expect(alerta).toHaveBeenCalledWith('Endereço inválido', 'Digite o endereço completo, como http://192.168.0.10:3000.');
    expect(consultarCodigo).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Servidor indisponível')).toBeTruthy();
    erro.mockRestore();
  });

  test('erro inesperado da API avisa e continua lendo', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(consultarCodigo).mockRejectedValueOnce(new Error('A API não conferiu o código (HTTP 500).'));
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(CODIGO);

    expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível conferir o código.');
    expect(screen.getByText(DICA)).toBeTruthy();
    await lerQr(CODIGO);
    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    erro.mockRestore();
  });

  test('sem permissão, pede a câmera antes de ler', async () => {
    await abrirTela({ granted: false, canAskAgain: true });

    expect(await screen.findByText('Permitir câmera')).toBeTruthy();
  });

  test('fechar o leitor sai da tela', async () => {
    const { onFechar } = await abrirTela();

    await fireEvent.press(await screen.findByLabelText('Fechar leitor'));

    expect(onFechar).toHaveBeenCalledTimes(1);
  });

  test('Digitar código confere o código digitado à mão, em minúsculas e com espaços', async () => {
    await abrirTela();

    await digitarEConferir(' 7k3f 9qxz m2p4 ');

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(consultarCodigo).toHaveBeenCalledWith(criarCodigoCurto(CODIGO));
  });

  test('o campo de digitar mostra o formato do código impresso', async () => {
    await abrirTela();

    await fireEvent.press(await screen.findByText('Digitar código'));

    const campo = await screen.findByLabelText('Código de autenticidade');
    expect(campo.props.placeholder).toBe(CODIGO);
    expect(campo.props.autoCapitalize).toBe('characters');
  });

  test('código antigo colado com quebras de linha também é conferido', async () => {
    await abrirTela();

    await digitarEConferir('AA1;id=1757680000000\n#carimbo  ');

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
    expect(conferirCodigoAntigo).toHaveBeenCalledWith('AA1;id=1757680000000#carimbo');
  });

  test('Conferir fica desabilitado com o campo vazio', async () => {
    await abrirTela();
    await fireEvent.press(await screen.findByText('Digitar código'));

    await fireEvent.press(screen.getByText('Conferir'));

    expect(consultarCodigo).not.toHaveBeenCalled();
  });

  test('Conferir outro volta para o campo de texto vazio', async () => {
    await abrirTela();
    await digitarEConferir(CODIGO);
    await screen.findByText('Documento autêntico');

    await fireEvent.press(screen.getByText('Conferir outro'));

    expect((await screen.findByLabelText('Código de autenticidade')).props.value).toBe('');
  });

  test('sem permissão da câmera ainda dá para digitar o código', async () => {
    await abrirTela({ granted: false, canAskAgain: true });

    await fireEvent.press(await screen.findByText('Digitar código'));

    expect(await screen.findByLabelText('Código de autenticidade')).toBeTruthy();
  });

  test('sem permissão da câmera, o código digitado mostra o veredicto', async () => {
    await abrirTela({ granted: false, canAskAgain: true });

    await digitarEConferir(CODIGO);

    expect(await screen.findByText('Documento autêntico')).toBeTruthy();
  });

  test('documento autêntico permite ver e esconder a localização no mapa', async () => {
    await abrirTela();
    await screen.findByText(DICA);
    await lerQr(CODIGO);
    await screen.findByText('Documento autêntico');

    expect(screen.queryByLabelText('Local da assinatura')).toBeNull();

    await fireEvent.press(screen.getByText('Ver localização'));
    expect(screen.getByLabelText('Local da assinatura').props.coordinate).toEqual({
      latitude: -22.40418,
      longitude: -43.66283,
    });

    await fireEvent.press(screen.getByText('Esconder localização'));
    expect(screen.queryByLabelText('Local da assinatura')).toBeNull();
  });

  test('código não autenticado não oferece a localização', async () => {
    jest.mocked(consultarCodigo).mockResolvedValue({ tipo: 'adulterado' });
    await abrirTela();
    await screen.findByText(DICA);

    await lerQr(CODIGO);
    await screen.findByText('Código não autenticado');

    expect(screen.queryByText('Ver localização')).toBeNull();
  });
});
