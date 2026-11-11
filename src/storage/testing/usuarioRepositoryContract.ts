import { criarCpf, criarEmail, criarNome, criarTelefone, criarUsuarioId } from '../../domain/usuario';
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
  });
}
