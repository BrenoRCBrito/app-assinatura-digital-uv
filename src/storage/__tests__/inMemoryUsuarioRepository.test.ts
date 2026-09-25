import { criarEmail } from '../../domain/usuario';
import { createInMemoryUsuarioRepository } from '../inMemory/inMemoryUsuarioRepository';
import { testarContratoUsuarioRepository } from '../testing/usuarioRepositoryContract';

const EMAIL = criarEmail('breno@exemplo.com');

testarContratoUsuarioRepository('em memória', createInMemoryUsuarioRepository);

describe('UsuarioRepository (em memória), atualizações', () => {
  test('updateEmail troca o e-mail mantendo o resto', async () => {
    const repositorio = createInMemoryUsuarioRepository();
    const usuario = await repositorio.create({ email: EMAIL, senhaHash: 'hash' });
    const novoEmail = criarEmail('novo@exemplo.com');

    const atualizado = await repositorio.updateEmail(usuario.id, novoEmail);

    expect(atualizado.email).toBe(novoEmail);
    expect(atualizado.senhaHash).toBe('hash');
  });

  test('updateSenha troca o hash da senha', async () => {
    const repositorio = createInMemoryUsuarioRepository();
    const usuario = await repositorio.create({ email: EMAIL, senhaHash: 'hash' });

    const atualizado = await repositorio.updateSenha(usuario.id, 'novo-hash');

    expect(atualizado.senhaHash).toBe('novo-hash');
    await expect(repositorio.findById(usuario.id)).resolves.toEqual(atualizado);
  });
});
