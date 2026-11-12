import { criarAssinaturaId } from '../../domain/assinatura';
import { criarDocumentoId } from '../../domain/documento';
import { criarCpf, criarEmail, criarFotoPerfil, criarNome, criarTelefone, criarUsuarioId } from '../../domain/usuario';
import { comGatilhoDeSincronizacao } from '../comGatilhoDeSincronizacao';
import { createRepositories } from '../createRepositories';
import { criarAssinaturaDeTeste, USUARIO_DE_TESTE } from '../testing/assinaturaRepositoryContract';
import { criarDocumentoDeTeste } from '../testing/documentoAssinadoRepositoryContract';

const ID = criarUsuarioId('uid-a');
const EMAIL = criarEmail('ana@exemplo.com');
const DATA = '2026-09-12T10:00:00.000Z';

function ambiente() {
  const aoAlterar = jest.fn();
  const base = createRepositories('inMemory');
  return { aoAlterar, repositorios: comGatilhoDeSincronizacao(base, aoAlterar), base };
}

describe('comGatilhoDeSincronizacao', () => {
  describe('o que o app altera avisa', () => {
    test('salvar e excluir assinatura', async () => {
      const { repositorios, aoAlterar } = ambiente();

      await repositorios.assinaturas.save(criarAssinaturaDeTeste('a1', 'Rubrica', DATA));
      await repositorios.assinaturas.delete(criarAssinaturaId('a1'));

      expect(aoAlterar).toHaveBeenCalledTimes(2);
    });

    test('salvar e excluir documento', async () => {
      const { repositorios, aoAlterar } = ambiente();

      await repositorios.documentos.save(criarDocumentoDeTeste('d1', 'Contrato', DATA));
      await repositorios.documentos.delete(criarDocumentoId('d1'));

      expect(aoAlterar).toHaveBeenCalledTimes(2);
    });

    test('criar a conta e editar cada campo do perfil', async () => {
      const { repositorios, aoAlterar } = ambiente();

      await repositorios.usuarios.create({ id: ID, email: EMAIL });
      await repositorios.usuarios.updateEmail(ID, criarEmail('nova@exemplo.com'));
      await repositorios.usuarios.updateNome(ID, criarNome('Ana Souza'));
      await repositorios.usuarios.updateCpf(ID, criarCpf('111.444.777-35'));
      await repositorios.usuarios.updateTelefone(ID, criarTelefone('(11) 98765-4321'));
      await repositorios.usuarios.updateFoto(ID, criarFotoPerfil('base64'));

      expect(aoAlterar).toHaveBeenCalledTimes(6);
    });

    test('o aviso vem depois que a alteração terminou', async () => {
      const { base } = ambiente();
      let listaNoAviso: readonly unknown[] = [];
      const comAviso = comGatilhoDeSincronizacao(base, () => {
        void base.assinaturas.list(USUARIO_DE_TESTE).then((lista) => {
          listaNoAviso = lista;
        });
      });

      await comAviso.assinaturas.save(criarAssinaturaDeTeste('a1', 'Rubrica', DATA));
      await new Promise((resolver) => setTimeout(resolver, 0));

      expect(listaNoAviso).toHaveLength(1);
    });
  });

  describe('o que não é alteração do app não avisa', () => {
    test('ler e listar', async () => {
      const { repositorios, aoAlterar } = ambiente();

      await repositorios.assinaturas.list(USUARIO_DE_TESTE);
      await repositorios.documentos.list(USUARIO_DE_TESTE);
      await repositorios.documentos.findById(criarDocumentoId('d1'), USUARIO_DE_TESTE);
      await repositorios.usuarios.findById(ID);
      await repositorios.usuarios.findByEmail(EMAIL);

      expect(aoAlterar).not.toHaveBeenCalled();
    });

    test('o que a própria sincronização grava (aplicar o que veio da nuvem e marcar como enviado)', async () => {
      const { repositorios, aoAlterar, base } = ambiente();
      const assinatura = criarAssinaturaDeTeste('a1', 'Rubrica', DATA);
      const documento = criarDocumentoDeTeste('d1', 'Contrato', DATA);

      await repositorios.assinaturas.aplicarDaNuvem({ item: assinatura, createdAt: DATA, updatedAt: DATA, deletedAt: null });
      await repositorios.assinaturas.marcarSincronizado('a1', DATA);
      await repositorios.documentos.aplicarDaNuvem({ item: documento, createdAt: DATA, updatedAt: DATA, deletedAt: null });
      await repositorios.documentos.marcarSincronizado('d1', DATA);
      await repositorios.documentos.definirArquivoNaNuvem('d1', 'foto', true);
      await repositorios.documentos.marcarArquivoBaixado('d1', 'pdf');
      await base.usuarios.create({ id: ID, email: EMAIL });
      await repositorios.usuarios.aplicarPerfilDaNuvem({
        id: ID,
        email: EMAIL,
        nome: null,
        cpf: null,
        telefone: null,
        createdAt: DATA,
        updatedAt: DATA,
        deletedAt: null,
      });
      await repositorios.usuarios.aplicarFotoDaNuvem(ID, criarFotoPerfil('foto-da-nuvem'));
      await repositorios.cursores.gravar(ID, 'documentos', { segundos: 1, nanos: 0 });
      await repositorios.assinaturas.apagarDaConta(ID);
      await repositorios.documentos.apagarDaConta(ID);
      await repositorios.usuarios.apagarDaConta(ID);
      await repositorios.cursores.apagarDaConta(ID);

      expect(aoAlterar).not.toHaveBeenCalled();
    });

    test('consultar o que está pendente', async () => {
      const { repositorios, aoAlterar } = ambiente();

      await repositorios.assinaturas.listarPendentes(USUARIO_DE_TESTE);
      await repositorios.documentos.listarPendentes(USUARIO_DE_TESTE);
      await repositorios.documentos.listarArquivosParaEnviar(USUARIO_DE_TESTE);
      await repositorios.usuarios.listarPerfisPendentes();
      await repositorios.usuarios.lerPerfilLocal(ID);

      expect(aoAlterar).not.toHaveBeenCalled();
    });
  });

  describe('falhas', () => {
    test('se a alteração falha, o erro chega a quem chamou e ninguém é avisado', async () => {
      const { repositorios, aoAlterar } = ambiente();

      await expect(repositorios.usuarios.updateNome(ID, criarNome('Ana Souza'))).rejects.toThrow('Usuário não encontrado');

      expect(aoAlterar).not.toHaveBeenCalled();
    });
  });

  describe('comportamento preservado', () => {
    test('devolve o mesmo que o repositório original', async () => {
      const { repositorios } = ambiente();

      const criado = await repositorios.usuarios.create({ id: ID, email: EMAIL });

      await expect(repositorios.usuarios.findById(ID)).resolves.toEqual(criado);
    });

    test('os dados gravados pelo repositório com gatilho aparecem no original', async () => {
      const { repositorios, base } = ambiente();
      const documento = criarDocumentoDeTeste('d1', 'Contrato', DATA);

      await repositorios.documentos.save(documento);

      await expect(base.documentos.list(USUARIO_DE_TESTE)).resolves.toEqual([documento]);
    });

    test('mantém os repositórios que não têm gatilho, como os cursores', () => {
      const { repositorios, base } = ambiente();

      expect(repositorios.cursores).toBe(base.cursores);
    });
  });
});
