import type { UsuarioId } from '../../domain/usuario';
import type { Sincronizavel } from '../repositories';

type Item = Readonly<{ id: string; usuarioId: UsuarioId }>;

type RepositorioSincronizavel<T extends Item> = Sincronizavel<T> & {
  list(usuarioId: UsuarioId): Promise<readonly T[]>;
  save(item: T): Promise<void>;
  delete(id: string): Promise<void>;
};

type Opcoes<T extends Item> = Readonly<{
  criarRepositorio: () => RepositorioSincronizavel<T>;
  criarItem: (id: string, usuarioId?: UsuarioId) => T;
  alterar: (item: T) => T;
  criadoEmEsperado: (item: T, agora: string) => string;
  usuario: UsuarioId;
  outroUsuario: UsuarioId;
}>;

const AGORA = '2026-10-01T10:00:00.000Z';
const DEPOIS = '2026-10-02T08:00:00.000Z';
const DA_NUVEM = '2026-10-05T09:00:00.000Z';

export function testarSincronizacaoDoRepositorio<T extends Item>(opcoes: Opcoes<T>): void {
  const { criarRepositorio, criarItem, alterar, criadoEmEsperado, usuario, outroUsuario } = opcoes;

  const criadoEm = (item: T) => criadoEmEsperado(item, AGORA);

  describe('sincronização', () => {
    beforeEach(() => {
      jest.useFakeTimers({ now: new Date(AGORA) });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('item salvo aparece como pendente, com as datas e sem marca de exclusão', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('a1');
      await repositorio.save(item);

      await expect(repositorio.listarPendentes(usuario)).resolves.toEqual([
        { item, createdAt: criadoEmEsperado(item, AGORA), updatedAt: AGORA, deletedAt: null },
      ]);
    });

    test('só lista os pendentes do usuário pedido', async () => {
      const repositorio = criarRepositorio();
      await repositorio.save(criarItem('a1', usuario));
      await repositorio.save(criarItem('a2', outroUsuario));

      const pendentes = await repositorio.listarPendentes(usuario);

      expect(pendentes.map((registro) => registro.item.id)).toEqual(['a1']);
    });

    test('depois de marcado como sincronizado, sai dos pendentes', async () => {
      const repositorio = criarRepositorio();
      await repositorio.save(criarItem('a1'));

      await repositorio.marcarSincronizado('a1', AGORA);

      await expect(repositorio.listarPendentes(usuario)).resolves.toEqual([]);
      await expect(repositorio.lerParaSincronizar('a1')).resolves.toMatchObject({ pendente: false });
    });

    test('se o item mudou durante o envio, marcar a versão antiga não o tira dos pendentes', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('a1');
      await repositorio.save(item);
      jest.setSystemTime(new Date(DEPOIS));
      await repositorio.save(alterar(item));

      await repositorio.marcarSincronizado('a1', AGORA);

      await expect(repositorio.listarPendentes(usuario)).resolves.toHaveLength(1);
    });

    test('alterar depois do envio volta a deixá-lo pendente, mantendo a data de criação', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('a1');
      await repositorio.save(item);
      await repositorio.marcarSincronizado('a1', AGORA);
      jest.setSystemTime(new Date(DEPOIS));

      await repositorio.save(alterar(item));

      await expect(repositorio.listarPendentes(usuario)).resolves.toMatchObject([
        { createdAt: criadoEmEsperado(item, AGORA), updatedAt: DEPOIS, deletedAt: null },
      ]);
    });

    test('marcar um id que não existe não faz nada nem lança erro', async () => {
      await expect(criarRepositorio().marcarSincronizado('nao-existe', AGORA)).resolves.toBeUndefined();
    });

    test('apagar some das listas normais, mas continua pendente com deletedAt para a exclusão subir', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('a1');
      await repositorio.save(item);
      await repositorio.marcarSincronizado('a1', AGORA);
      jest.setSystemTime(new Date(DEPOIS));

      await repositorio.delete('a1');

      await expect(repositorio.list(usuario)).resolves.toEqual([]);
      await expect(repositorio.listarPendentes(usuario)).resolves.toEqual([
        { item, createdAt: criadoEmEsperado(item, AGORA), updatedAt: DEPOIS, deletedAt: DEPOIS },
      ]);
    });

    test('lerParaSincronizar devolve o registro e se está pendente, inclusive de item apagado, e null se não existe', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('a1');
      await repositorio.save(item);

      await expect(repositorio.lerParaSincronizar('a1')).resolves.toEqual({
        registro: { item, createdAt: criadoEmEsperado(item, AGORA), updatedAt: AGORA, deletedAt: null },
        pendente: true,
      });
      await repositorio.delete('a1');
      await expect(repositorio.lerParaSincronizar('a1')).resolves.toMatchObject({
        registro: { deletedAt: AGORA },
      });
      await expect(repositorio.lerParaSincronizar('nao-existe')).resolves.toBeNull();
    });

    test('aplicarDaNuvem cria o item que não existia aqui, já sincronizado', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('n1');

      await repositorio.aplicarDaNuvem({ item, createdAt: criadoEm(item), updatedAt: DA_NUVEM, deletedAt: null });

      await expect(repositorio.list(usuario)).resolves.toEqual([item]);
      await expect(repositorio.listarPendentes(usuario)).resolves.toEqual([]);
      await expect(repositorio.lerParaSincronizar('n1')).resolves.toEqual({
        registro: { item, createdAt: criadoEm(item), updatedAt: DA_NUVEM, deletedAt: null },
        pendente: false,
      });
    });

    test('aplicarDaNuvem substitui o conteúdo e as datas de um item que já existia, sem deixá-lo pendente', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('a1');
      await repositorio.save(item);
      const novo = alterar(item);

      await repositorio.aplicarDaNuvem({ item: novo, createdAt: criadoEm(item), updatedAt: DA_NUVEM, deletedAt: null });

      await expect(repositorio.list(usuario)).resolves.toEqual([novo]);
      await expect(repositorio.lerParaSincronizar('a1')).resolves.toMatchObject({
        registro: { updatedAt: DA_NUVEM },
        pendente: false,
      });
    });

    test('aplicarDaNuvem com deletedAt faz o item sumir das listas normais, sem ficar pendente', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('a1');
      await repositorio.save(item);

      await repositorio.aplicarDaNuvem({ item, createdAt: criadoEm(item), updatedAt: DA_NUVEM, deletedAt: DA_NUVEM });

      await expect(repositorio.list(usuario)).resolves.toEqual([]);
      await expect(repositorio.listarPendentes(usuario)).resolves.toEqual([]);
    });

    test('item criado de novo depois de apagado volta às listas', async () => {
      const repositorio = criarRepositorio();
      const item = criarItem('a1');
      await repositorio.save(item);
      await repositorio.delete('a1');

      await repositorio.save(item);

      await expect(repositorio.list(usuario)).resolves.toEqual([item]);
    });
  });
}
