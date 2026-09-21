import { criarEmail } from '../../domain/usuario';
import { createSqliteUsuarioRepository } from '../sqlite/sqliteUsuarioRepository';

jest.mock('expo-sqlite');

const EMAIL = criarEmail('a@exemplo.com');

describe('createSqliteUsuarioRepository', () => {
  test('cria e acha o usuário pelo e-mail', async () => {
    const repositorio = createSqliteUsuarioRepository();

    const criado = await repositorio.create({ email: EMAIL, senhaHash: 'hash-a' });

    await expect(repositorio.findByEmail(EMAIL)).resolves.toEqual(criado);
  });

  test('clear apaga os usuários e deixa o banco utilizável', async () => {
    const repositorio = createSqliteUsuarioRepository();
    await repositorio.create({ email: EMAIL, senhaHash: 'hash-a' });

    await repositorio.clear();

    await expect(repositorio.findByEmail(EMAIL)).resolves.toBeNull();
    const recriado = await repositorio.create({ email: EMAIL, senhaHash: 'hash-b' });
    await expect(repositorio.findByEmail(EMAIL)).resolves.toEqual(recriado);
  });
});
