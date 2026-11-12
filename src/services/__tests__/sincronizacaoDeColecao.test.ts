import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';

import { criarAssinaturaId, criarNomeAssinatura, type Assinatura } from '../../domain/assinatura';
import { criarUsuarioId } from '../../domain/usuario';
import { createInMemoryAssinaturaRepository } from '../../storage/inMemory/inMemoryAssinaturaRepository';
import { createInMemoryCursorRepository } from '../../storage/inMemory/inMemoryCursorRepository';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { adaptadorDeAssinaturas } from '../adaptadoresDeSincronizacao';
import { obterFirestore } from '../firebase';
import { sincronizarColecao, TAMANHO_DA_PAGINA, TEMPO_LIMITE_DA_GRAVACAO } from '../sincronizacaoDeColecao';

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDocs: jest.fn(),
  limit: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  serverTimestamp: jest.fn(),
  setDoc: jest.fn(),
  where: jest.fn(),
  Timestamp: class {
    seconds: number;
    nanoseconds: number;
    constructor(segundos: number, nanos: number) {
      this.seconds = segundos;
      this.nanoseconds = nanos;
    }
  },
}));
jest.mock('../firebase', () => ({ obterFirestore: jest.fn() }));

const UID = criarUsuarioId('uid-a');
const COLECAO = { colecao: 'usuarios/uid-a/assinaturas' };
const MARCADOR = { marcador: 'hora-do-servidor' };
const CRIADO = '2026-09-12T10:00:00.000Z';
const AGORA = '2026-10-01T10:00:00.000Z';
const NA_NUVEM = '2026-10-05T09:00:00.000Z';

function dadosDaNuvem(extra: Readonly<Record<string, unknown>> = {}, segundos = 100) {
  return {
    nome: 'Da nuvem',
    desenho: { tracos: ['M10,20 L30,40'], quadro: { width: 300, height: 150 } },
    createdAt: CRIADO,
    updatedAt: NA_NUVEM,
    deletedAt: null,
    servidorEm: { seconds: segundos, nanoseconds: 7 },
    ...extra,
  };
}

function pagina(...documentos: readonly { id: string; dados: unknown }[]) {
  return { docs: documentos.map(({ id, dados }) => ({ id, data: () => dados })) };
}

function ambiente() {
  const assinaturas = createInMemoryAssinaturaRepository();
  const cursores = createInMemoryCursorRepository();
  const adaptador = adaptadorDeAssinaturas(assinaturas);
  const sincronizar = () => sincronizarColecao(adaptador, cursores, UID);
  return { assinaturas, cursores, sincronizar };
}

describe('sincronizarColecao', () => {
  let aviso: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers({ now: new Date(AGORA) });
    aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(obterFirestore).mockReset().mockReturnValue({ nome: 'firestore' } as never);
    jest.mocked(collection).mockReset().mockReturnValue(COLECAO as never);
    jest.mocked(doc).mockReset().mockImplementation(((_colecao: unknown, id: string) => ({ caminho: id })) as never);
    jest.mocked(query).mockReset().mockReturnValue({ consulta: true } as never);
    jest.mocked(where).mockReset().mockReturnValue({ filtro: true } as never);
    jest.mocked(orderBy).mockReset().mockReturnValue({ ordem: true } as never);
    jest.mocked(limit).mockReset().mockReturnValue({ limite: true } as never);
    jest.mocked(getDocs).mockReset().mockResolvedValue(pagina() as never);
    jest.mocked(setDoc).mockReset().mockResolvedValue(undefined);
    jest.mocked(serverTimestamp).mockReset().mockReturnValue(MARCADOR as never);
  });

  afterEach(() => {
    aviso.mockRestore();
    jest.useRealTimers();
  });

  describe('baixar', () => {
    test('lê usuarios/{uid}/{coleção}, ordenando pelo servidorEm e em páginas', async () => {
      await ambiente().sincronizar();

      expect(collection).toHaveBeenCalledWith({ nome: 'firestore' }, 'usuarios', 'uid-a', 'assinaturas');
      expect(orderBy).toHaveBeenCalledWith('servidorEm');
      expect(limit).toHaveBeenCalledWith(TAMANHO_DA_PAGINA);
    });

    test('na primeira vez, sem cursor, pede tudo (sem filtro)', async () => {
      await ambiente().sincronizar();

      expect(where).not.toHaveBeenCalled();
    });

    test('com cursor guardado, pede só o que o servidor mudou depois dele', async () => {
      const { cursores, sincronizar } = ambiente();
      await cursores.gravar(UID, 'assinaturas', { segundos: 55, nanos: 9 });

      await sincronizar();

      expect(where).toHaveBeenCalledWith('servidorEm', '>', expect.objectContaining({ seconds: 55, nanoseconds: 9 }));
    });

    test('grava no aparelho o que veio da nuvem, já sincronizado, e guarda o cursor do último documento', async () => {
      const { assinaturas, cursores, sincronizar } = ambiente();
      jest
        .mocked(getDocs)
        .mockResolvedValueOnce(
          pagina(
            { id: 'n1', dados: dadosDaNuvem({}, 100) },
            { id: 'n2', dados: dadosDaNuvem({ nome: 'Outra' }, 200) },
          ) as never,
        );

      const resultado = await sincronizar();

      expect(resultado).toEqual({ enviados: 0, baixados: 2, falhas: 0 });
      await expect(assinaturas.list(UID)).resolves.toHaveLength(2);
      await expect(assinaturas.listarPendentes(UID)).resolves.toEqual([]);
      await expect(cursores.ler(UID, 'assinaturas')).resolves.toEqual({ segundos: 200, nanos: 7 });
    });

    test('versão da nuvem mais nova substitui a do aparelho', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Antiga', CRIADO, UID));
      jest.mocked(getDocs).mockResolvedValueOnce(pagina({ id: 'a1', dados: dadosDaNuvem({ nome: 'Nova' }) }) as never);

      const resultado = await sincronizar();

      expect(resultado.baixados).toBe(1);
      await expect(assinaturas.list(UID)).resolves.toMatchObject([{ nome: 'Nova' }]);
      expect(setDoc).not.toHaveBeenCalled();
    });

    test('versão do aparelho mais nova que a da nuvem não é sobrescrita e sobe', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Local', CRIADO, UID));
      jest.mocked(getDocs).mockResolvedValueOnce(
        pagina({ id: 'a1', dados: dadosDaNuvem({ nome: 'Velha', updatedAt: '2026-09-20T00:00:00.000Z' }) }) as never,
      );

      const resultado = await sincronizar();

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhas: 0 });
      await expect(assinaturas.list(UID)).resolves.toMatchObject([{ nome: 'Local' }]);
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    test('mesma versão nos dois lados: só marca como sincronizado, sem baixar nem enviar', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Igual', CRIADO, UID));
      jest
        .mocked(getDocs)
        .mockResolvedValueOnce(pagina({ id: 'a1', dados: dadosDaNuvem({ updatedAt: AGORA }) }) as never);

      const resultado = await sincronizar();

      expect(resultado).toEqual({ enviados: 0, baixados: 0, falhas: 0 });
      expect(setDoc).not.toHaveBeenCalled();
      await expect(assinaturas.listarPendentes(UID)).resolves.toEqual([]);
    });

    test('exclusão que veio da nuvem some do aparelho', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Rubrica', CRIADO, UID));
      jest
        .mocked(getDocs)
        .mockResolvedValueOnce(pagina({ id: 'a1', dados: dadosDaNuvem({ deletedAt: NA_NUVEM }) }) as never);

      await sincronizar();

      await expect(assinaturas.list(UID)).resolves.toEqual([]);
      await expect(assinaturas.listarPendentes(UID)).resolves.toEqual([]);
    });

    test('documento da nuvem em formato inválido é ignorado e contado, sem travar os outros nem o cursor', async () => {
      const { assinaturas, cursores, sincronizar } = ambiente();
      jest
        .mocked(getDocs)
        .mockResolvedValueOnce(
          pagina(
            { id: 'ruim', dados: dadosDaNuvem({ nome: '' }, 100) },
            { id: 'boa', dados: dadosDaNuvem({}, 200) },
          ) as never,
        );

      const resultado = await sincronizar();

      expect(resultado).toEqual({ enviados: 0, baixados: 1, falhas: 1 });
      await expect(assinaturas.list(UID)).resolves.toHaveLength(1);
      await expect(cursores.ler(UID, 'assinaturas')).resolves.toEqual({ segundos: 200, nanos: 7 });
    });

    test('lê a próxima página enquanto vierem páginas cheias', async () => {
      const { assinaturas, cursores, sincronizar } = ambiente();
      const cheia = Array.from({ length: TAMANHO_DA_PAGINA }, (_, indice) => ({
        id: `p${indice}`,
        dados: dadosDaNuvem({}, 1000 + indice),
      }));
      jest
        .mocked(getDocs)
        .mockResolvedValueOnce(pagina(...cheia) as never)
        .mockResolvedValueOnce(pagina({ id: 'ultima', dados: dadosDaNuvem({}, 5000) }) as never);

      const resultado = await sincronizar();

      expect(getDocs).toHaveBeenCalledTimes(2);
      expect(resultado.baixados).toBe(TAMANHO_DA_PAGINA + 1);
      await expect(assinaturas.list(UID)).resolves.toHaveLength(TAMANHO_DA_PAGINA + 1);
      await expect(cursores.ler(UID, 'assinaturas')).resolves.toEqual({ segundos: 5000, nanos: 7 });
    });

    test('sem internet, lança o erro, não envia nada e não mexe no cursor', async () => {
      const { assinaturas, cursores, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Rubrica', CRIADO, UID));
      jest.mocked(getDocs).mockRejectedValue(new Error('Failed to get documents because the client is offline.'));

      await expect(sincronizar()).rejects.toThrow('offline');

      expect(setDoc).not.toHaveBeenCalled();
      await expect(cursores.ler(UID, 'assinaturas')).resolves.toBeNull();
      await expect(assinaturas.listarPendentes(UID)).resolves.toHaveLength(1);
    });
  });

  describe('enviar', () => {
    test('envia cada pendente para usuarios/{uid}/{coleção}/{id} com a hora do servidor e marca como sincronizado', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Rubrica', CRIADO, UID));

      const resultado = await sincronizar();

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhas: 0 });
      expect(doc).toHaveBeenCalledWith(COLECAO, 'a1');
      expect(setDoc).toHaveBeenCalledWith(
        { caminho: 'a1' },
        {
          nome: 'Rubrica',
          desenho: { tracos: ['M10,20 L30,40'], quadro: { width: 300, height: 150 } },
          createdAt: CRIADO,
          updatedAt: AGORA,
          deletedAt: null,
          servidorEm: MARCADOR,
        },
      );
      await expect(assinaturas.listarPendentes(UID)).resolves.toEqual([]);
    });

    test('exclusão feita no aparelho sobe com deletedAt', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Rubrica', CRIADO, UID));
      await assinaturas.marcarSincronizado('a1', AGORA);
      jest.setSystemTime(new Date('2026-10-02T08:00:00.000Z'));
      await assinaturas.delete(criarAssinaturaId('a1'));

      await sincronizar();

      expect(setDoc).toHaveBeenCalledWith(
        { caminho: 'a1' },
        expect.objectContaining({ deletedAt: '2026-10-02T08:00:00.000Z', updatedAt: '2026-10-02T08:00:00.000Z' }),
      );
    });

    test('só envia o que é da conta logada', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Minha', CRIADO, UID));
      await assinaturas.save(criarAssinaturaDeTeste('b1', 'De outra conta', CRIADO, criarUsuarioId('uid-b')));

      await sincronizar();

      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    test('se um envio falha, os outros seguem e o que falhou continua pendente', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Um', CRIADO, UID));
      await assinaturas.save(criarAssinaturaDeTeste('a2', 'Dois', CRIADO, UID));
      jest.mocked(setDoc).mockRejectedValueOnce(new Error('permission-denied')).mockResolvedValue(undefined);

      const resultado = await sincronizar();

      expect(resultado).toEqual({ enviados: 1, baixados: 0, falhas: 1 });
      const pendentes = await assinaturas.listarPendentes(UID);
      expect(pendentes.map((registro) => registro.item.id)).toEqual(['a1']);
    });

    test('se a nuvem não responde, desiste depois do limite e o item continua pendente', async () => {
      const { assinaturas, sincronizar } = ambiente();
      await assinaturas.save(criarAssinaturaDeTeste('a1', 'Rubrica', CRIADO, UID));
      jest.mocked(setDoc).mockReturnValue(new Promise<never>(() => undefined));

      const execucao = sincronizar();
      await jest.advanceTimersByTimeAsync(TEMPO_LIMITE_DA_GRAVACAO);
      const resultado = await execucao;

      expect(resultado).toEqual({ enviados: 0, baixados: 0, falhas: 1 });
      await expect(assinaturas.listarPendentes(UID)).resolves.toHaveLength(1);
    });

    test('item alterado durante o envio continua pendente', async () => {
      const { assinaturas, sincronizar } = ambiente();
      const original = criarAssinaturaDeTeste('a1', 'Rubrica', CRIADO, UID);
      await assinaturas.save(original);
      jest.mocked(setDoc).mockImplementation(async () => {
        jest.setSystemTime(new Date('2026-10-01T10:00:09.000Z'));
        await assinaturas.save({ ...original, nome: criarNomeAssinatura('Mudou no meio') } as Assinatura);
      });

      await sincronizar();

      await expect(assinaturas.listarPendentes(UID)).resolves.toHaveLength(1);
    });
  });
});
