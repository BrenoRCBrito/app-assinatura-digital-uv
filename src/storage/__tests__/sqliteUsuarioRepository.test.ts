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
  test('findById acha o usuário pelo id', async () => {
    const repositorio = createSqliteUsuarioRepository();
    const criado = await repositorio.create({ email: EMAIL, senhaHash: 'hash-a' });

    await expect(repositorio.findById(criado.id)).resolves.toEqual(criado);
  });

  test('updateEmail e updateSenha persistem as mudanças', async () => {
    const repositorio = createSqliteUsuarioRepository();
    const criado = await repositorio.create({ email: EMAIL, senhaHash: 'hash-a' });
    const novoEmail = criarEmail('novo@exemplo.com');

    const comNovoEmail = await repositorio.updateEmail(criado.id, novoEmail);
    expect(comNovoEmail.email).toBe(novoEmail);

    const comNovaSenha = await repositorio.updateSenha(criado.id, 'hash-b');
    expect(comNovaSenha.senhaHash).toBe('hash-b');
  });

});
