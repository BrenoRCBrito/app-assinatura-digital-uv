import { criarEmail, criarUsuarioId } from '../../domain/usuario';
import { createRepositories } from '../../storage/createRepositories';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { excluirArquivosDocumento, excluirPastaDaConta } from '../fileSystem';
import { sincronizarTudo } from '../sincronizacao';
import { apagarDadosDaConta, contarPendentes, prepararSaida } from '../saidaDaConta';

jest.mock('../sincronizacao', () => ({ sincronizarTudo: jest.fn() }));
jest.mock('../fileSystem', () => ({ excluirArquivosDocumento: jest.fn(), excluirPastaDaConta: jest.fn() }));

const ANA = criarUsuarioId('uid-ana');
const BETO = criarUsuarioId('uid-beto');
const DATA = '2026-09-12T10:00:00.000Z';

// Tudo que já foi enviado: o que a sincronização faz quando dá certo.
async function marcarTudoComoEnviado(repositorios: ReturnType<typeof createRepositories>, usuarioId: typeof ANA) {
  const perfil = await repositorios.usuarios.lerPerfilLocal(usuarioId);
  if (perfil !== null) {
    await repositorios.usuarios.marcarPerfilSincronizado(usuarioId, perfil.perfil.updatedAt);
  }
  for (const pendente of await repositorios.assinaturas.listarPendentes(usuarioId)) {
    await repositorios.assinaturas.marcarSincronizado(pendente.item.id, pendente.updatedAt);
  }
  for (const pendente of await repositorios.documentos.listarPendentes(usuarioId)) {
    await repositorios.documentos.marcarSincronizado(pendente.item.id, pendente.updatedAt);
  }
  for (const { documento, tipo } of await repositorios.documentos.listarArquivosParaEnviar(usuarioId)) {
    await repositorios.documentos.definirArquivoNaNuvem(documento.id, tipo, true);
  }
}

async function contaComDados() {
  const repositorios = createRepositories('inMemory');
  await repositorios.usuarios.create({ id: ANA, email: criarEmail('ana@exemplo.com') });
  await repositorios.assinaturas.save(criarAssinaturaDeTeste('a1', 'Rubrica', DATA, ANA));
  await repositorios.documentos.save(criarDocumentoDeTeste('d1', 'Contrato', DATA, ANA));
  return repositorios;
}

describe('saidaDaConta', () => {
  beforeEach(() => {
    jest.mocked(sincronizarTudo).mockReset().mockResolvedValue({ enviados: 0, baixados: 0, falhou: false });
    jest.mocked(excluirArquivosDocumento).mockReset();
    jest.mocked(excluirPastaDaConta).mockReset();
  });

  describe('contarPendentes', () => {
    test('conta o perfil, as assinaturas, os documentos e os arquivos (foto e PDF) que ainda não foram', async () => {
      const repositorios = await contaComDados();

      // perfil 1 + assinatura 1 + documento 1 + foto 1 + PDF 1
      await expect(contarPendentes(repositorios, ANA)).resolves.toBe(5);
    });

    test('com tudo enviado, não há nada pendente', async () => {
      const repositorios = await contaComDados();
      await marcarTudoComoEnviado(repositorios, ANA);

      await expect(contarPendentes(repositorios, ANA)).resolves.toBe(0);
    });

    test('uma exclusão que ainda não subiu também conta', async () => {
      const repositorios = await contaComDados();
      await marcarTudoComoEnviado(repositorios, ANA);
      await repositorios.documentos.delete(criarDocumentoDeTeste('d1', 'Contrato', DATA, ANA).id);

      await expect(contarPendentes(repositorios, ANA)).resolves.toBe(1);
    });

    test('só conta o que é da conta que está saindo', async () => {
      const repositorios = await contaComDados();
      await repositorios.assinaturas.save(criarAssinaturaDeTeste('b1', 'Do Beto', DATA, BETO));
      await repositorios.documentos.save(criarDocumentoDeTeste('d2', 'Do Beto', DATA, BETO));
      await marcarTudoComoEnviado(repositorios, ANA);

      await expect(contarPendentes(repositorios, ANA)).resolves.toBe(0);
    });

    test('conta sem perfil neste aparelho não conta o perfil', async () => {
      const repositorios = createRepositories('inMemory');

      await expect(contarPendentes(repositorios, ANA)).resolves.toBe(0);
    });
  });

  describe('prepararSaida', () => {
    test('sincroniza uma última vez, com os repositórios e a conta que está saindo', async () => {
      const repositorios = await contaComDados();

      await prepararSaida(repositorios, ANA);

      expect(sincronizarTudo).toHaveBeenCalledWith(repositorios, ANA);
    });

    test('o que sobra é contado depois da sincronização, não antes', async () => {
      const repositorios = await contaComDados();
      jest.mocked(sincronizarTudo).mockImplementation(async () => {
        await marcarTudoComoEnviado(repositorios, ANA);
        return { enviados: 5, baixados: 0, falhou: false };
      });

      await expect(prepararSaida(repositorios, ANA)).resolves.toEqual({ pendentes: 0 });
    });

    test('sem internet (a sincronização falhou), devolve quantos itens ficaram sem enviar', async () => {
      const repositorios = await contaComDados();
      jest.mocked(sincronizarTudo).mockResolvedValue({ enviados: 0, baixados: 0, falhou: true });

      await expect(prepararSaida(repositorios, ANA)).resolves.toEqual({ pendentes: 5 });
    });
  });

  describe('apagarDadosDaConta', () => {
    test('apaga os dados da conta e deixa os das outras', async () => {
      const repositorios = await contaComDados();
      await repositorios.usuarios.create({ id: BETO, email: criarEmail('beto@exemplo.com') });
      await repositorios.assinaturas.save(criarAssinaturaDeTeste('b1', 'Do Beto', DATA, BETO));
      await repositorios.documentos.save(criarDocumentoDeTeste('d2', 'Do Beto', DATA, BETO));

      await apagarDadosDaConta(repositorios, ANA);

      await expect(repositorios.usuarios.findById(ANA)).resolves.toBeNull();
      await expect(repositorios.assinaturas.list(ANA)).resolves.toEqual([]);
      await expect(repositorios.documentos.list(ANA)).resolves.toEqual([]);
      await expect(repositorios.usuarios.findById(BETO)).resolves.not.toBeNull();
      await expect(repositorios.assinaturas.list(BETO)).resolves.toHaveLength(1);
      await expect(repositorios.documentos.list(BETO)).resolves.toHaveLength(1);
    });

    test('apaga também o cursor de sincronização: o próximo login baixa tudo de novo', async () => {
      const repositorios = await contaComDados();
      await repositorios.cursores.gravar(ANA, 'documentos', { segundos: 10, nanos: 0 });
      await repositorios.cursores.gravar(BETO, 'documentos', { segundos: 20, nanos: 0 });

      await apagarDadosDaConta(repositorios, ANA);

      await expect(repositorios.cursores.ler(ANA, 'documentos')).resolves.toBeNull();
      await expect(repositorios.cursores.ler(BETO, 'documentos')).resolves.toEqual({ segundos: 20, nanos: 0 });
    });

    test('apaga a pasta de arquivos da conta, e os arquivos de cada documento de antes das pastas por conta', async () => {
      const repositorios = await contaComDados();

      await apagarDadosDaConta(repositorios, ANA);

      expect(excluirArquivosDocumento).toHaveBeenCalledTimes(1);
      expect(excluirArquivosDocumento).toHaveBeenCalledWith(expect.objectContaining({ id: 'd1', usuarioId: ANA }));
      expect(excluirPastaDaConta).toHaveBeenCalledWith(ANA);
    });

    test('não mexe nos arquivos de documentos de outra conta', async () => {
      const repositorios = await contaComDados();
      await repositorios.documentos.save(criarDocumentoDeTeste('d2', 'Do Beto', DATA, BETO));

      await apagarDadosDaConta(repositorios, ANA);

      expect(excluirArquivosDocumento).not.toHaveBeenCalledWith(expect.objectContaining({ id: 'd2' }));
      expect(excluirPastaDaConta).not.toHaveBeenCalledWith(BETO);
    });

    test('se listar os documentos falhar, ainda assim apaga a pasta e os dados', async () => {
      const aviso = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const repositorios = await contaComDados();
      jest.spyOn(repositorios.documentos, 'list').mockRejectedValue(new Error('dado corrompido'));

      await apagarDadosDaConta(repositorios, ANA);

      expect(excluirPastaDaConta).toHaveBeenCalledWith(ANA);
      await expect(repositorios.assinaturas.list(ANA)).resolves.toEqual([]);
      await expect(repositorios.usuarios.findById(ANA)).resolves.toBeNull();
      aviso.mockRestore();
    });

    test('se apagar os arquivos falhar, o erro chega a quem chamou (o sair avisa a pessoa)', async () => {
      const repositorios = await contaComDados();
      jest.mocked(excluirPastaDaConta).mockImplementation(() => {
        throw new Error('sem permissão');
      });

      await expect(apagarDadosDaConta(repositorios, ANA)).rejects.toThrow('sem permissão');
    });
  });
});
