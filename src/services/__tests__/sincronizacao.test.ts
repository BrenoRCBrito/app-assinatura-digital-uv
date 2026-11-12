import { criarUsuarioId } from '../../domain/usuario';
import { createRepositories } from '../../storage/createRepositories';
import { sincronizarTudo } from '../sincronizacao';
import { sincronizarArquivos } from '../sincronizacaoDeArquivos';
import { sincronizarColecao } from '../sincronizacaoDeColecao';
import { sincronizarPerfil } from '../sincronizacaoDoPerfil';

jest.mock('../sincronizacaoDoPerfil', () => ({ sincronizarPerfil: jest.fn() }));
jest.mock('../sincronizacaoDeColecao', () => ({ sincronizarColecao: jest.fn() }));
jest.mock('../sincronizacaoDeArquivos', () => ({ sincronizarArquivos: jest.fn() }));

const UID = criarUsuarioId('uid-a');

function resultadoDoPerfil(extra: Partial<{ enviados: number; baixados: number; falhou: boolean }> = {}) {
  return { enviados: 0, baixados: 0, falhou: false, ...extra };
}

function resultadoDaColecao(extra: Partial<{ enviados: number; baixados: number; falhas: number }> = {}) {
  return { enviados: 0, baixados: 0, falhas: 0, ...extra };
}

describe('sincronizarTudo', () => {
  let aviso: jest.SpyInstance;

  beforeEach(() => {
    aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.mocked(sincronizarPerfil).mockReset().mockResolvedValue(resultadoDoPerfil());
    jest.mocked(sincronizarColecao).mockReset().mockResolvedValue(resultadoDaColecao());
    jest.mocked(sincronizarArquivos).mockReset().mockResolvedValue({ enviados: 0, apagados: 0, falhas: 0 });
  });

  afterEach(() => {
    aviso.mockRestore();
  });

  test('sincroniza o perfil e depois as assinaturas e os documentos, somando os resultados', async () => {
    const repositorios = createRepositories('inMemory');
    jest.mocked(sincronizarPerfil).mockResolvedValue(resultadoDoPerfil({ enviados: 1 }));
    jest
      .mocked(sincronizarColecao)
      .mockResolvedValueOnce(resultadoDaColecao({ enviados: 2, baixados: 1 }))
      .mockResolvedValueOnce(resultadoDaColecao({ baixados: 3 }));

    const resultado = await sincronizarTudo(repositorios, UID);

    expect(resultado).toEqual({ enviados: 3, baixados: 4, falhou: false });
    expect(sincronizarPerfil).toHaveBeenCalledWith(repositorios.usuarios, UID);
    const colecoes = jest.mocked(sincronizarColecao).mock.calls.map(([adaptador]) => adaptador.colecao);
    expect(colecoes).toEqual(['assinaturas', 'documentos']);
    expect(jest.mocked(sincronizarColecao).mock.calls[0][1]).toBe(repositorios.cursores);
    expect(jest.mocked(sincronizarColecao).mock.calls[0][2]).toBe(UID);
  });

  test('depois dos dados, envia os arquivos dos documentos e soma no resultado', async () => {
    const repositorios = createRepositories('inMemory');
    jest.mocked(sincronizarArquivos).mockResolvedValue({ enviados: 2, apagados: 1, falhas: 0 });

    const resultado = await sincronizarTudo(repositorios, UID);

    expect(resultado).toEqual({ enviados: 2, baixados: 0, falhou: false });
    expect(sincronizarArquivos).toHaveBeenCalledWith(repositorios.documentos, UID);
  });

  test('falha nos arquivos (banco não configurado) não anula o resto, mas o resultado diz que falhou', async () => {
    jest.mocked(sincronizarArquivos).mockRejectedValue(new Error('não configurado'));
    jest.mocked(sincronizarColecao).mockResolvedValue(resultadoDaColecao({ enviados: 1 }));

    const resultado = await sincronizarTudo(createRepositories('inMemory'), UID);

    expect(resultado).toEqual({ enviados: 2, baixados: 0, falhou: true });
  });

  test('arquivos que falharam contam como falha', async () => {
    jest.mocked(sincronizarArquivos).mockResolvedValue({ enviados: 0, apagados: 0, falhas: 1 });

    const resultado = await sincronizarTudo(createRepositories('inMemory'), UID);

    expect(resultado.falhou).toBe(true);
  });

  test('se o perfil falhar (sem internet), não tenta as coleções', async () => {
    jest.mocked(sincronizarPerfil).mockResolvedValue(resultadoDoPerfil({ falhou: true }));

    const resultado = await sincronizarTudo(createRepositories('inMemory'), UID);

    expect(resultado.falhou).toBe(true);
    expect(sincronizarColecao).not.toHaveBeenCalled();
    expect(sincronizarArquivos).not.toHaveBeenCalled();
  });

  test('erro nas assinaturas não impede os documentos e o resultado diz que falhou', async () => {
    jest
      .mocked(sincronizarColecao)
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(resultadoDaColecao({ enviados: 1 }));

    const resultado = await sincronizarTudo(createRepositories('inMemory'), UID);

    expect(resultado).toEqual({ enviados: 1, baixados: 0, falhou: true });
    expect(sincronizarColecao).toHaveBeenCalledTimes(2);
  });

  test('itens ignorados por formato inválido contam como falha', async () => {
    jest.mocked(sincronizarColecao).mockResolvedValueOnce(resultadoDaColecao({ falhas: 1 }));

    const resultado = await sincronizarTudo(createRepositories('inMemory'), UID);

    expect(resultado.falhou).toBe(true);
  });

  test('duas chamadas ao mesmo tempo para a mesma conta entregam o mesmo resultado, sem sincronizar em duas frentes', async () => {
    const repositorios = createRepositories('inMemory');
    let emparalelo = 0;
    let maximoEmparalelo = 0;
    jest.mocked(sincronizarPerfil).mockImplementation(async () => {
      emparalelo += 1;
      maximoEmparalelo = Math.max(maximoEmparalelo, emparalelo);
      await Promise.resolve();
      emparalelo -= 1;
      return resultadoDoPerfil();
    });

    const [primeira, segunda] = await Promise.all([
      sincronizarTudo(repositorios, UID),
      sincronizarTudo(repositorios, UID),
    ]);

    expect(primeira).toEqual(segunda);
    expect(maximoEmparalelo).toBe(1);
  });

  test('um pedido no meio da sincronização faz ela rodar mais uma vez, para não perder o que mudou', async () => {
    const repositorios = createRepositories('inMemory');

    await Promise.all([sincronizarTudo(repositorios, UID), sincronizarTudo(repositorios, UID)]);

    expect(sincronizarPerfil).toHaveBeenCalledTimes(2);
  });

  test('vários pedidos no meio da sincronização viram uma única repetição', async () => {
    const repositorios = createRepositories('inMemory');

    await Promise.all([
      sincronizarTudo(repositorios, UID),
      sincronizarTudo(repositorios, UID),
      sincronizarTudo(repositorios, UID),
      sincronizarTudo(repositorios, UID),
    ]);

    expect(sincronizarPerfil).toHaveBeenCalledTimes(2);
  });

  test('pedidos que continuam chegando não prendem a conta para sempre: a repetição tem limite', async () => {
    const repositorios = createRepositories('inMemory');
    jest.mocked(sincronizarPerfil).mockImplementation(async () => {
      void sincronizarTudo(repositorios, UID);
      return resultadoDoPerfil();
    });

    await sincronizarTudo(repositorios, UID);

    expect(sincronizarPerfil).toHaveBeenCalledTimes(1 + 3);
  });

  test('o resultado é o da última rodada', async () => {
    const repositorios = createRepositories('inMemory');
    jest
      .mocked(sincronizarPerfil)
      .mockResolvedValueOnce(resultadoDoPerfil({ enviados: 1 }))
      .mockResolvedValueOnce(resultadoDoPerfil({ enviados: 5 }));

    const [primeira] = await Promise.all([sincronizarTudo(repositorios, UID), sincronizarTudo(repositorios, UID)]);

    expect(primeira.enviados).toBe(5);
  });

  test('depois que termina, uma nova chamada sincroniza de novo', async () => {
    const repositorios = createRepositories('inMemory');

    await sincronizarTudo(repositorios, UID);
    await sincronizarTudo(repositorios, UID);

    expect(sincronizarPerfil).toHaveBeenCalledTimes(2);
  });

  test('contas diferentes não se misturam', async () => {
    const repositorios = createRepositories('inMemory');

    await Promise.all([sincronizarTudo(repositorios, UID), sincronizarTudo(repositorios, criarUsuarioId('uid-b'))]);

    expect(sincronizarPerfil).toHaveBeenCalledTimes(2);
  });
});
