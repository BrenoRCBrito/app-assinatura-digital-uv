import { criarEmail } from '../../domain/usuario';
import { createInMemoryUsuarioRepository } from '../inMemory/inMemoryUsuarioRepository';

const EMAIL = criarEmail('breno@exemplo.com');

describe('UsuarioRepository (em memória)', () => {
  test('cria a conta e acha pelo e-mail', async () => {
    const repositorio = createInMemoryUsuarioRepository();

    const usuario = await repositorio.create({ email: EMAIL, senhaHash: 'hash' });

    await expect(repositorio.findByEmail(EMAIL)).resolves.toEqual(usuario);
  });

  test('findByEmail devolve null quando a conta não existe', async () => {
    await expect(createInMemoryUsuarioRepository().findByEmail(EMAIL)).resolves.toBeNull();
  });

  test('clear apaga as contas salvas', async () => {
    const repositorio = createInMemoryUsuarioRepository();
    await repositorio.create({ email: EMAIL, senhaHash: 'hash' });

    await repositorio.clear();

    await expect(repositorio.findByEmail(EMAIL)).resolves.toBeNull();
  });
});
