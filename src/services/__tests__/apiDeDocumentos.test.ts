import Constants from 'expo-constants';

import { criarCodigoCurto } from '../../domain/codigoCurto';
import { criarEnderecoDaApi } from '../../domain/enderecoDaApi';
import {
  conferirCodigoAntigo,
  consultarCodigo,
  definirEnderecoConfigurado,
  enderecoAutomatico,
  enderecoDaApi,
  registrarDocumento,
  ServidorIndisponivel,
} from '../apiDeDocumentos';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: {} } }));

type ConfigSimulada = { extra?: { apiUrl?: string }; hostUri?: string };

const constantes = Constants as unknown as { expoConfig: ConfigSimulada | null };
const fetchOriginal = global.fetch;
const CAMPOS = [
  { chave: 'id', valor: '1757680000000' },
  { chave: 'titulo', valor: 'Contrato de locação' },
];
const CODIGO = criarCodigoCurto('7K3F9QXZM2P4');
let fetchSimulado: jest.Mock;

function responder(status: number, corpo: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => corpo } as unknown as Response;
}

beforeEach(() => {
  definirEnderecoConfigurado(null);
  constantes.expoConfig = { hostUri: '192.168.0.10:8081' };
  fetchSimulado = jest.fn();
  global.fetch = fetchSimulado as unknown as typeof fetch;
});

afterEach(() => {
  jest.useRealTimers();
});

afterAll(() => {
  global.fetch = fetchOriginal;
});

describe('enderecoDaApi', () => {
  test('usa o IP do PC que serve o Metro, na porta 3000', () => {
    expect(enderecoDaApi()).toBe('http://192.168.0.10:3000');
  });

  test('prefere o endereço configurado, sem a barra final', () => {
    constantes.expoConfig = { hostUri: '192.168.0.10:8081', extra: { apiUrl: 'http://10.0.0.5:4000/' } };

    expect(enderecoDaApi()).toBe('http://10.0.0.5:4000');
  });

  test('o endereço das Configurações vence o do build e o do Metro', () => {
    constantes.expoConfig = { hostUri: '192.168.0.10:8081', extra: { apiUrl: 'http://10.0.0.5:4000' } };
    definirEnderecoConfigurado(criarEnderecoDaApi('http://10.0.2.2:3000'));

    expect(enderecoDaApi()).toBe('http://10.0.2.2:3000');

    definirEnderecoConfigurado(null);
    expect(enderecoDaApi()).toBe('http://10.0.0.5:4000');
  });

  test('o endereço automático é o do build ou o do Metro, e nada fora de desenvolvimento', () => {
    expect(enderecoAutomatico()).toBe('http://192.168.0.10:3000');

    constantes.expoConfig = {};
    expect(enderecoAutomatico()).toBeNull();
  });

  test('sem endereço nenhum, trata como servidor indisponível', () => {
    constantes.expoConfig = null;

    expect(() => enderecoDaApi()).toThrow(ServidorIndisponivel);
  });
});

describe('registrarDocumento', () => {
  test('envia os campos em JSON e devolve o código curto', async () => {
    fetchSimulado.mockResolvedValue(responder(201, { codigo: '7K3F-9QXZ-M2P4' }));

    await expect(registrarDocumento(CAMPOS)).resolves.toBe(CODIGO);
    expect(fetchSimulado).toHaveBeenCalledWith(
      'http://192.168.0.10:3000/documentos',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campos: CAMPOS }),
      }),
    );
  });

  test('documento recusado pela API é um erro, não servidor indisponível', async () => {
    fetchSimulado.mockResolvedValue(responder(400, { erro: 'Campos do documento inválidos.' }));

    const falha = registrarDocumento(CAMPOS);

    await expect(falha).rejects.toThrow('A API recusou o documento (HTTP 400).');
    await expect(falha).rejects.not.toBeInstanceOf(ServidorIndisponivel);
  });

  test('falha de rede vira servidor indisponível', async () => {
    fetchSimulado.mockRejectedValue(new TypeError('Network request failed'));

    await expect(registrarDocumento(CAMPOS)).rejects.toBeInstanceOf(ServidorIndisponivel);
  });

  test('desiste em 8 segundos e trata como servidor indisponível', async () => {
    jest.useFakeTimers();
    fetchSimulado.mockImplementation(
      (_endereco: string, opcoes: RequestInit) =>
        new Promise((_resolver, rejeitar) => {
          opcoes.signal?.addEventListener('abort', () => rejeitar(new Error('Aborted')));
        }),
    );

    const falha = registrarDocumento(CAMPOS);
    jest.advanceTimersByTime(8000);

    await expect(falha).rejects.toBeInstanceOf(ServidorIndisponivel);
  });
});

describe('consultarCodigo', () => {
  test('pede o código formatado e devolve os campos do documento autêntico', async () => {
    fetchSimulado.mockResolvedValue(responder(200, { veredicto: 'autentico', campos: CAMPOS }));

    await expect(consultarCodigo(CODIGO)).resolves.toEqual({
      tipo: 'autentico',
      campos: CAMPOS,
      versaoMaisNova: false,
    });
    expect(fetchSimulado).toHaveBeenCalledWith('http://192.168.0.10:3000/documentos/7K3F-9QXZ-M2P4', expect.anything());
  });

  test('registro adulterado no servidor', async () => {
    fetchSimulado.mockResolvedValue(responder(200, { veredicto: 'adulterado' }));

    await expect(consultarCodigo(CODIGO)).resolves.toEqual({ tipo: 'adulterado' });
  });

  test('404 é código não encontrado', async () => {
    fetchSimulado.mockResolvedValue(responder(404, { erro: 'Código não encontrado.' }));

    await expect(consultarCodigo(CODIGO)).resolves.toEqual({ tipo: 'naoEncontrado' });
  });

  test('erro do servidor e resposta fora do formato são erros', async () => {
    fetchSimulado.mockResolvedValueOnce(responder(500, { erro: 'Erro interno.' }));
    await expect(consultarCodigo(CODIGO)).rejects.toThrow('A API não conferiu o código (HTTP 500).');

    fetchSimulado.mockResolvedValueOnce(responder(200, { veredicto: 'autentico', campos: [{ chave: 'id' }] }));
    await expect(consultarCodigo(CODIGO)).rejects.toThrow('Resposta inesperada da API.');
  });
});

describe('conferirCodigoAntigo', () => {
  test('envia o texto lido e devolve o veredicto da API', async () => {
    fetchSimulado.mockResolvedValue(responder(200, { veredicto: 'autentico', campos: CAMPOS, versaoMaisNova: true }));

    await expect(conferirCodigoAntigo('AA1;id=1757680000000#carimbo')).resolves.toEqual({
      tipo: 'autentico',
      campos: CAMPOS,
      versaoMaisNova: true,
    });
    expect(fetchSimulado).toHaveBeenCalledWith(
      'http://192.168.0.10:3000/validacoes',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ codigo: 'AA1;id=1757680000000#carimbo' }) }),
    );
  });

  test('texto que não é código do AssinaAqui', async () => {
    fetchSimulado.mockResolvedValue(responder(200, { veredicto: 'ilegivel' }));

    await expect(conferirCodigoAntigo('https://exemplo.com')).resolves.toEqual({ tipo: 'ilegivel' });
  });
});
