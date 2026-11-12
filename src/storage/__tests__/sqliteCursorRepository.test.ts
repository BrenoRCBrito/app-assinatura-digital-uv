import { abrirBanco } from '../sqlite/banco';
import { createSqliteCursorRepository } from '../sqlite/sqliteCursorRepository';
import { reiniciarBancoDeTeste } from '../testing/bancoDeTeste';
import { testarContratoCursorRepository } from '../testing/cursorRepositoryContract';

jest.mock('expo-sqlite');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

testarContratoCursorRepository('SQLite', () => createSqliteCursorRepository(abrirBanco()), reiniciarBancoDeTeste);
