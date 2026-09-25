import { criarEmail } from '../../domain/usuario';
import { createSqliteUsuarioRepository } from '../sqlite/sqliteUsuarioRepository';
import { testarContratoUsuarioRepository } from '../testing/usuarioRepositoryContract';

jest.mock('expo-sqlite');

const { __resetTodosOsBancosDeTeste } = jest.requireMock<{ __resetTodosOsBancosDeTeste: () => void }>('expo-sqlite');
const EMAIL = criarEmail('a@exemplo.com');

testarContratoUsuarioRepository('SQLite', createSqliteUsuarioRepository, {
  antesDeCada: __resetTodosOsBancosDeTeste,
});

describe('UsuarioRepository (SQLite), atualizações', () => {
  beforeEach(() => {
    __resetTodosOsBancosDeTeste();
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
