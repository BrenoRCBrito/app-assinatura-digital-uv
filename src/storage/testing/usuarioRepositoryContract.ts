import { criarEmail, criarUsuarioId } from '../../domain/usuario';
import type { UsuarioRepository } from '../repositories';

type OpcoesDoContrato = Readonly<{
  antesDeCada?: () => void | Promise<void>;
}>;

const EMAIL_A = criarEmail('a@exemplo.com');
const EMAIL_B = criarEmail('b@exemplo.com');

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

      const usuario = await repositorio.create({ email: EMAIL_A, senhaHash: 'hash-a' });

      await expect(repositorio.findByEmail(EMAIL_A)).resolves.toEqual(usuario);
    });

    test('findByEmail devolve null quando a conta não existe', async () => {
      await expect(criarRepositorio().findByEmail(EMAIL_A)).resolves.toBeNull();
    });

    test('findById acha a conta criada', async () => {
      const repositorio = criarRepositorio();

      const usuario = await repositorio.create({ email: EMAIL_A, senhaHash: 'hash-a' });

      await expect(repositorio.findById(usuario.id)).resolves.toEqual(usuario);
    });

    test('findById devolve null para id inexistente', async () => {
      await expect(criarRepositorio().findById(criarUsuarioId('999'))).resolves.toBeNull();
    });

    test('findById não devolve a conta de outro usuário, mesmo criadas em sequência', async () => {
      const repositorio = criarRepositorio();

      const primeira = await repositorio.create({ email: EMAIL_A, senhaHash: 'hash-a' });
      const segunda = await repositorio.create({ email: EMAIL_B, senhaHash: 'hash-b' });

      expect(primeira.id).not.toBe(segunda.id);
      await expect(repositorio.findById(primeira.id)).resolves.toEqual(primeira);
      await expect(repositorio.findById(segunda.id)).resolves.toEqual(segunda);
    });

    test('clear apaga as contas e deixa o repositório utilizável', async () => {
      const repositorio = criarRepositorio();
      const antiga = await repositorio.create({ email: EMAIL_A, senhaHash: 'hash-a' });

      await repositorio.clear();

      await expect(repositorio.findByEmail(EMAIL_A)).resolves.toBeNull();
      await expect(repositorio.findById(antiga.id)).resolves.toBeNull();
      const nova = await repositorio.create({ email: EMAIL_A, senhaHash: 'hash-b' });
      await expect(repositorio.findByEmail(EMAIL_A)).resolves.toEqual(nova);
    });
  });
}
