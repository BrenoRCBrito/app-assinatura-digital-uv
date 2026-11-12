import { get, ref, remove, set } from 'firebase/database';

import { criarFotoPerfil, criarUsuarioId } from '../../domain/usuario';
import { resumirSha256 } from '../crypto';
import { obterBancoDeArquivos } from '../firebase';
import { baixarFotoDePerfil, enviarFotoDePerfil, removerFotoDePerfil } from '../fotoDePerfilNaNuvem';
import { TAMANHO_MAXIMO_DO_ARQUIVO, TEMPO_LIMITE_DA_LEITURA, TEMPO_LIMITE_DO_ENVIO } from '../sincronizacaoDeArquivos';

jest.mock('firebase/database', () => ({ get: jest.fn(), ref: jest.fn(), set: jest.fn(), remove: jest.fn() }));
jest.mock('../firebase', () => ({ obterBancoDeArquivos: jest.fn() }));
jest.mock('../crypto', () => ({ resumirSha256: jest.fn() }));

const UID = criarUsuarioId('uid-a');
const BANCO = { nome: 'realtime' };
const FOTO = criarFotoPerfil('FOTO-EM-BASE64');
const SHA = 'f'.repeat(64);

function nuvemSemFoto() {
  jest.mocked(get).mockResolvedValue({ exists: () => false, val: () => null } as never);
}

function nuvemCom(valor: unknown) {
  jest.mocked(get).mockResolvedValue({ exists: () => true, val: () => valor } as never);
}

describe('fotoDePerfilNaNuvem', () => {
  beforeEach(() => {
    jest.mocked(obterBancoDeArquivos).mockReset().mockReturnValue(BANCO as never);
    jest.mocked(ref).mockReset().mockImplementation(((_banco: unknown, caminho: string) => ({ caminho })) as never);
    jest.mocked(get).mockReset();
    jest.mocked(set).mockReset().mockResolvedValue(undefined);
    jest.mocked(remove).mockReset().mockResolvedValue(undefined);
    jest.mocked(resumirSha256).mockReset().mockResolvedValue(SHA);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('enviarFotoDePerfil', () => {
    test('trocar a foto grava no mesmo lugar: a antiga é substituída, nunca acumulada', async () => {
      jest.mocked(get).mockResolvedValue({ exists: () => true, val: () => 'e'.repeat(64) } as never);

      await enviarFotoDePerfil(UID, FOTO, SHA);

      expect(set).toHaveBeenCalledWith({ caminho: 'arquivos/uid-a/perfil/foto' }, { dados: FOTO, sha256: SHA });
      expect(remove).not.toHaveBeenCalled();
    });

    test('grava em arquivos/{uid}/perfil/foto com o resumo', async () => {
      nuvemSemFoto();

      await enviarFotoDePerfil(UID, FOTO, SHA);

      expect(set).toHaveBeenCalledWith({ caminho: 'arquivos/uid-a/perfil/foto' }, { dados: FOTO, sha256: SHA });
    });

    test('antes de gravar, consulta só o resumo que já está na nuvem', async () => {
      nuvemSemFoto();

      await enviarFotoDePerfil(UID, FOTO, SHA);

      expect(ref).toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/perfil/foto/sha256');
    });

    test('se a nuvem já tem exatamente esta foto, não grava de novo', async () => {
      jest.mocked(get).mockResolvedValue({ exists: () => true, val: () => SHA } as never);

      await enviarFotoDePerfil(UID, FOTO, SHA);

      expect(set).not.toHaveBeenCalled();
    });

    test('se a nuvem tem outra foto, atualiza (as regras permitem atualizar)', async () => {
      jest.mocked(get).mockResolvedValue({ exists: () => true, val: () => 'e'.repeat(64) } as never);

      await enviarFotoDePerfil(UID, FOTO, SHA);

      expect(set).toHaveBeenCalledTimes(1);
    });

    test('foto acima do limite do banco não é enviada', async () => {
      const grande = criarFotoPerfil('a'.repeat(TAMANHO_MAXIMO_DO_ARQUIVO + 1));

      await expect(enviarFotoDePerfil(UID, grande, SHA)).rejects.toThrow('grande demais');

      expect(set).not.toHaveBeenCalled();
    });

    test('se a nuvem não responde ao envio, desiste depois do limite', async () => {
      jest.useFakeTimers();
      nuvemSemFoto();
      jest.mocked(set).mockReturnValue(new Promise<never>(() => undefined));

      const envio = enviarFotoDePerfil(UID, FOTO, SHA);
      const esperado = expect(envio).rejects.toThrow('demorou demais');
      await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_DO_ENVIO);

      await esperado;
    });

    test('banco de arquivos não configurado: o erro chega a quem chamou', async () => {
      jest.mocked(obterBancoDeArquivos).mockImplementation(() => {
        throw new Error('Realtime Database não configurado');
      });

      await expect(enviarFotoDePerfil(UID, FOTO, SHA)).rejects.toThrow('não configurado');
    });
  });

  describe('removerFotoDePerfil', () => {
    test('apaga arquivos/{uid}/perfil/foto da nuvem', async () => {
      await removerFotoDePerfil(UID);

      expect(remove).toHaveBeenCalledWith({ caminho: 'arquivos/uid-a/perfil/foto' });
    });

    test('o erro da remoção chega a quem chamou', async () => {
      jest.mocked(remove).mockRejectedValue(new Error('sem internet'));

      await expect(removerFotoDePerfil(UID)).rejects.toThrow('sem internet');
    });

    test('se a nuvem não responde, desiste depois do limite', async () => {
      jest.useFakeTimers();
      jest.mocked(remove).mockReturnValue(new Promise<never>(() => undefined));

      const remocao = removerFotoDePerfil(UID);
      const esperado = expect(remocao).rejects.toThrow('demorou demais');
      await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_DA_LEITURA);

      await esperado;
    });

    test('banco de arquivos não configurado: o erro chega a quem chamou', async () => {
      jest.mocked(obterBancoDeArquivos).mockImplementation(() => {
        throw new Error('Realtime Database não configurado');
      });

      await expect(removerFotoDePerfil(UID)).rejects.toThrow('não configurado');
    });
  });

  describe('baixarFotoDePerfil', () => {
    test('baixa de arquivos/{uid}/perfil/foto e devolve a foto quando o resumo confere', async () => {
      nuvemCom({ dados: 'FOTO-EM-BASE64', sha256: SHA });

      await expect(baixarFotoDePerfil(UID, SHA)).resolves.toBe('FOTO-EM-BASE64');

      expect(ref).toHaveBeenCalledWith(BANCO, 'arquivos/uid-a/perfil/foto');
    });

    test('foto que ainda não está na nuvem: lança erro', async () => {
      nuvemSemFoto();

      await expect(baixarFotoDePerfil(UID, SHA)).rejects.toThrow('ainda não está na nuvem');
    });

    test('conteúdo que não bate com o resumo guardado está corrompido: recusa', async () => {
      nuvemCom({ dados: 'FOTO-EM-BASE64', sha256: '0'.repeat(64) });

      await expect(baixarFotoDePerfil(UID, SHA)).rejects.toThrow('não confere');
    });

    test('foto diferente da que o perfil na nuvem diz que é: recusa', async () => {
      nuvemCom({ dados: 'FOTO-EM-BASE64', sha256: SHA });

      await expect(baixarFotoDePerfil(UID, 'd'.repeat(64))).rejects.toThrow('não confere');
    });

    test.each([
      ['sem o conteúdo', { sha256: SHA }],
      ['conteúdo vazio', { dados: '', sha256: SHA }],
      ['sem o resumo', { dados: 'FOTO-EM-BASE64' }],
      ['conteúdo que não é texto', { dados: 123, sha256: SHA }],
      ['não é um objeto', 'texto'],
    ])('arquivo da nuvem %s é recusado', async (_nome, valor) => {
      nuvemCom(valor);

      await expect(baixarFotoDePerfil(UID, SHA)).rejects.toThrow();
    });

    test('se a nuvem não responde, desiste depois do limite', async () => {
      jest.useFakeTimers();
      jest.mocked(get).mockReturnValue(new Promise<never>(() => undefined));

      const download = baixarFotoDePerfil(UID, SHA);
      const esperado = expect(download).rejects.toThrow('demorou demais');
      await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_DO_ENVIO);

      await esperado;
    });
  });
});
