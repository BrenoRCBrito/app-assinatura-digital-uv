import { createSqliteUsuarioRepository } from '../sqlite/sqliteUsuarioRepository';
import { testarContratoUsuarioRepository } from '../testing/usuarioRepositoryContract';

jest.mock('expo-sqlite');

const { __resetTodosOsBancosDeTeste } = jest.requireMock<{ __resetTodosOsBancosDeTeste: () => void }>('expo-sqlite');

testarContratoUsuarioRepository('SQLite', createSqliteUsuarioRepository, {
  antesDeCada: __resetTodosOsBancosDeTeste,
});
