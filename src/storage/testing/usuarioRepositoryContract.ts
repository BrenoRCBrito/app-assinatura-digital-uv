import { criarCpf, criarEmail, criarFotoPerfil, criarNome, criarTelefone, criarUsuarioId } from '../../domain/usuario';
import type { UsuarioRepository } from '../repositories';

type OpcoesDoContrato = Readonly<{
  antesDeCada?: () => void | Promise<void>;
}>;

const EMAIL_A = criarEmail('a@exemplo.com');
const EMAIL_B = criarEmail('b@exemplo.com');
const ID_A = criarUsuarioId('uid-a');
const ID_B = criarUsuarioId('uid-b');

export function testarContratoUsuarioRepository(
  nome: string,
  criarRepositorio: () => UsuarioRepository,
  opcoes: OpcoesDoContrato = {},
) {
  describe(`UsuarioRepository (${nome})`, () => {
    beforeEach(async () => {
      await opcoes.antesDeCada?.();
    });

    test('cria a conta e acha pelo e-mail', async () => {
      const repositorio = criarRepositorio();

      const usuario = await repositorio.create({ id: ID_A, email: EMAIL_A });

      await expect(repositorio.findByEmail(EMAIL_A)).resolves.toEqual(usuario);
    });

    test('a conta nasce com o id recebido, que é o uid do Firebase', async () => {
      const usuario = await criarRepositorio().create({ id: ID_A, email: EMAIL_A });

      expect(usuario.id).toBe('uid-a');
    });

    test('guarda o perfil informado ao criar a conta', async () => {
      const repositorio = criarRepositorio();

      const usuario = await repositorio.create({
        id: ID_A,
        email: EMAIL_A,
        nome: criarNome('Ana Souza'),
        cpf: criarCpf('11144477735'),
        telefone: criarTelefone('11987654321'),
      });

      expect(usuario).toMatchObject({ nome: 'Ana Souza', cpf: '11144477735', telefone: '11987654321' });
      await expect(repositorio.findById(ID_A)).resolves.toEqual(usuario);
    });

    test('findByEmail devolve null quando a conta não existe', async () => {
      await expect(criarRepositorio().findByEmail(EMAIL_A)).resolves.toBeNull();
    });

    test('findById acha a conta criada', async () => {
      const repositorio = criarRepositorio();

      const usuario = await repositorio.create({ id: ID_A, email: EMAIL_A });

      await expect(repositorio.findById(usuario.id)).resolves.toEqual(usuario);
    });

    test('findById devolve null para id inexistente', async () => {
      await expect(criarRepositorio().findById(criarUsuarioId('999'))).resolves.toBeNull();
    });

    test('findById não devolve a conta de outro usuário, mesmo criadas em sequência', async () => {
      const repositorio = criarRepositorio();

      const primeira = await repositorio.create({ id: ID_A, email: EMAIL_A });
      const segunda = await repositorio.create({ id: ID_B, email: EMAIL_B });

      expect(primeira.id).not.toBe(segunda.id);
      await expect(repositorio.findById(primeira.id)).resolves.toEqual(primeira);
      await expect(repositorio.findById(segunda.id)).resolves.toEqual(segunda);
    });

    test('clear apaga as contas e deixa o repositório utilizável', async () => {
      const repositorio = criarRepositorio();
      const antiga = await repositorio.create({ id: ID_A, email: EMAIL_A });

      await repositorio.clear();

      await expect(repositorio.findByEmail(EMAIL_A)).resolves.toBeNull();
      await expect(repositorio.findById(antiga.id)).resolves.toBeNull();
      const nova = await repositorio.create({ id: ID_B, email: EMAIL_A });
      await expect(repositorio.findByEmail(EMAIL_A)).resolves.toEqual(nova);
    });

    describe('perfis pendentes de sincronização', () => {
      beforeEach(() => {
        jest.useFakeTimers({ now: new Date('2026-10-01T10:00:00.000Z') });
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      test('conta nova aparece como pendente, com os dados do perfil e as datas', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({
          id: ID_A,
          email: EMAIL_A,
          nome: criarNome('Ana Souza'),
          cpf: criarCpf('111.444.777-35'),
          telefone: criarTelefone('(11) 98765-4321'),
        });

        await expect(repositorio.listarPerfisPendentes()).resolves.toEqual([
          {
            id: ID_A,
            email: EMAIL_A,
            nome: 'Ana Souza',
            cpf: '11144477735',
            telefone: '11987654321',
            createdAt: '2026-10-01T10:00:00.000Z',
            updatedAt: '2026-10-01T10:00:00.000Z',
            deletedAt: null,
          },
        ]);
      });

      test('perfil sem nome, CPF e telefone sai com null', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });

        await expect(repositorio.listarPerfisPendentes()).resolves.toMatchObject([
          { nome: null, cpf: null, telefone: null },
        ]);
      });

      test('depois de marcado como sincronizado, sai da lista', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });
        const [pendente] = await repositorio.listarPerfisPendentes();

        await repositorio.marcarPerfilSincronizado(pendente.id, pendente.updatedAt);

        await expect(repositorio.listarPerfisPendentes()).resolves.toEqual([]);
      });

      test('alterar o perfil depois do envio volta a deixá-lo pendente, com updatedAt novo', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });
        const [enviado] = await repositorio.listarPerfisPendentes();
        await repositorio.marcarPerfilSincronizado(enviado.id, enviado.updatedAt);
        jest.setSystemTime(new Date('2026-10-02T08:00:00.000Z'));

        await repositorio.updateNome(ID_A, criarNome('Ana Souza'));

        await expect(repositorio.listarPerfisPendentes()).resolves.toMatchObject([
          { nome: 'Ana Souza', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-02T08:00:00.000Z' },
        ]);
      });

      test('se o perfil mudou durante o envio, marcar a versão antiga não o tira da lista', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });
        const [versaoEnviada] = await repositorio.listarPerfisPendentes();
        jest.setSystemTime(new Date('2026-10-01T10:00:05.000Z'));
        await repositorio.updateNome(ID_A, criarNome('Ana Souza'));

        await repositorio.marcarPerfilSincronizado(versaoEnviada.id, versaoEnviada.updatedAt);

        await expect(repositorio.listarPerfisPendentes()).resolves.toHaveLength(1);
      });

      test('só os perfis pendentes são listados', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });
        await repositorio.create({ id: ID_B, email: EMAIL_B });
        const [primeiro] = await repositorio.listarPerfisPendentes();
        await repositorio.marcarPerfilSincronizado(primeiro.id, primeiro.updatedAt);

        const pendentes = await repositorio.listarPerfisPendentes();

        expect(pendentes.map((perfil) => perfil.id)).toEqual([ID_B]);
      });

      test('lerPerfilLocal devolve o perfil e se ele está pendente, e null se não existe', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });

        await expect(repositorio.lerPerfilLocal(ID_A)).resolves.toMatchObject({
          perfil: { id: ID_A, email: EMAIL_A, createdAt: '2026-10-01T10:00:00.000Z' },
          pendente: true,
        });
        await repositorio.marcarPerfilSincronizado(ID_A, '2026-10-01T10:00:00.000Z');
        await expect(repositorio.lerPerfilLocal(ID_A)).resolves.toMatchObject({ pendente: false });
        await expect(repositorio.lerPerfilLocal(ID_B)).resolves.toBeNull();
      });

      test('aplicarPerfilDaNuvem grava os dados e as datas da nuvem, mantém o e-mail e deixa sincronizado', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });

        await repositorio.aplicarPerfilDaNuvem({
          id: ID_A,
          email: EMAIL_B,
          nome: criarNome('Ana Souza'),
          cpf: criarCpf('111.444.777-35'),
          telefone: criarTelefone('(11) 98765-4321'),
          createdAt: '2026-09-01T10:00:00.000Z',
          updatedAt: '2026-09-02T10:00:00.000Z',
          deletedAt: null,
        });

        await expect(repositorio.lerPerfilLocal(ID_A)).resolves.toEqual({
          perfil: {
            id: ID_A,
            email: EMAIL_A,
            nome: 'Ana Souza',
            cpf: '11144477735',
            telefone: '11987654321',
            createdAt: '2026-09-01T10:00:00.000Z',
            updatedAt: '2026-09-02T10:00:00.000Z',
            deletedAt: null,
          },
          pendente: false,
        });
        await expect(repositorio.findById(ID_A)).resolves.toMatchObject({
          nome: 'Ana Souza',
          criadoEm: '2026-09-01T10:00:00.000Z',
        });
      });

      test('aplicarPerfilDaNuvem não mexe na foto do perfil', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });
        await repositorio.updateFoto(ID_A, criarFotoPerfil('base64'));

        await repositorio.aplicarPerfilDaNuvem({
          id: ID_A,
          email: EMAIL_A,
          nome: null,
          cpf: null,
          telefone: null,
          createdAt: '2026-09-01T10:00:00.000Z',
          updatedAt: '2026-09-02T10:00:00.000Z',
          deletedAt: null,
        });

        await expect(repositorio.findById(ID_A)).resolves.toMatchObject({ foto: 'base64' });
      });

      test('aplicarFotoDaNuvem grava a foto sem tocar no resto: data de atualização e estado de envio ficam como estavam', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });
        await repositorio.marcarPerfilSincronizado(ID_A, '2026-10-01T10:00:00.000Z');

        await repositorio.aplicarFotoDaNuvem(ID_A, criarFotoPerfil('foto-da-nuvem'));

        await expect(repositorio.findById(ID_A)).resolves.toMatchObject({ foto: 'foto-da-nuvem' });
        await expect(repositorio.lerPerfilLocal(ID_A)).resolves.toMatchObject({
          perfil: { updatedAt: '2026-10-01T10:00:00.000Z' },
          pendente: false,
        });
      });

      test('aplicarFotoDaNuvem com null tira a foto (foi removida em outro aparelho)', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A });
        await repositorio.updateFoto(ID_A, criarFotoPerfil('antiga'));

        await repositorio.aplicarFotoDaNuvem(ID_A, null);

        await expect(repositorio.findById(ID_A)).resolves.toMatchObject({ foto: null });
      });

      test('aplicarFotoDaNuvem não mexe nos outros campos do perfil', async () => {
        const repositorio = criarRepositorio();
        await repositorio.create({ id: ID_A, email: EMAIL_A, nome: criarNome('Ana Souza') });

        await repositorio.aplicarFotoDaNuvem(ID_A, criarFotoPerfil('foto'));

        await expect(repositorio.findById(ID_A)).resolves.toMatchObject({ nome: 'Ana Souza', email: EMAIL_A });
      });

      test('aplicarFotoDaNuvem num usuário que não existe lança erro', async () => {
        await expect(criarRepositorio().aplicarFotoDaNuvem(ID_A, criarFotoPerfil('foto'))).rejects.toThrow(
          'Usuário não encontrado',
        );
      });

      test('aplicarPerfilDaNuvem num usuário que não existe lança erro', async () => {
        await expect(
          criarRepositorio().aplicarPerfilDaNuvem({
            id: ID_A,
            email: EMAIL_A,
            nome: null,
            cpf: null,
            telefone: null,
            createdAt: '2026-09-01T10:00:00.000Z',
            updatedAt: '2026-09-02T10:00:00.000Z',
            deletedAt: null,
          }),
        ).rejects.toThrow('Usuário não encontrado');
      });

      test('marcar um id que não existe não faz nada nem lança erro', async () => {
        await expect(
          criarRepositorio().marcarPerfilSincronizado(criarUsuarioId('999'), '2026-10-01T10:00:00.000Z'),
        ).resolves.toBeUndefined();
      });
    });
  });
}
