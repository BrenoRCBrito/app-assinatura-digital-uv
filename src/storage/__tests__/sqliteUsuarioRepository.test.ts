import { openDatabaseSync } from 'expo-sqlite';

import { criarEmail, criarNome, criarUsuarioId } from '../../domain/usuario';
import { abrirBanco, NOME_DO_BANCO } from '../sqlite/banco';
import { createSqliteUsuarioRepository } from '../sqlite/sqliteUsuarioRepository';
import { testarContratoUsuarioRepository } from '../testing/usuarioRepositoryContract';

jest.mock('expo-sqlite');

const { __resetTodosOsBancosDeTeste } = jest.requireMock<{ __resetTodosOsBancosDeTeste: () => void }>('expo-sqlite');
const EMAIL = criarEmail('a@exemplo.com');
const ID = criarUsuarioId('uid-a');

testarContratoUsuarioRepository('SQLite', createSqliteUsuarioRepository, {
  antesDeCada: __resetTodosOsBancosDeTeste,
});

describe('UsuarioRepository (SQLite), atualizações', () => {
  beforeEach(() => {
    __resetTodosOsBancosDeTeste();
  });

  test('updateEmail persiste a mudança', async () => {
    const repositorio = createSqliteUsuarioRepository();
    const criado = await repositorio.create({ id: ID, email: EMAIL });
    const novoEmail = criarEmail('novo@exemplo.com');

    const comNovoEmail = await repositorio.updateEmail(criado.id, novoEmail);

    expect(comNovoEmail.email).toBe(novoEmail);
    await expect(createSqliteUsuarioRepository().findById(ID)).resolves.toEqual(comNovoEmail);
  });
});

describe('UsuarioRepository (SQLite), colunas de sincronização', () => {
  function linhasSalvas() {
    return openDatabaseSync(NOME_DO_BANCO).getAllAsync<Record<string, unknown>>('SELECT * FROM usuarios');
  }

  beforeEach(() => {
    __resetTodosOsBancosDeTeste();
    jest.useFakeTimers({ now: new Date('2026-10-01T10:00:00.000Z') });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('create grava created_at e updated_at com a hora atual e marca como pendente', async () => {
    const criado = await createSqliteUsuarioRepository().create({ id: ID, email: EMAIL });

    expect(criado.criadoEm).toBe('2026-10-01T10:00:00.000Z');
    expect((await linhasSalvas())[0]).toMatchObject({
      id: criado.id,
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-01T10:00:00.000Z',
      deleted_at: null,
      sync_status: 'pending',
    });
  });

  test('cada atualização muda updated_at, mantém created_at e deixa a linha pendente', async () => {
    const repositorio = createSqliteUsuarioRepository();
    const criado = await repositorio.create({ id: ID, email: EMAIL });
    jest.setSystemTime(new Date('2026-10-02T08:00:00.000Z'));

    const atualizado = await repositorio.updateNome(criado.id, criarNome('Ana Souza'));

    expect(atualizado.criadoEm).toBe('2026-10-01T10:00:00.000Z');
    expect((await linhasSalvas())[0]).toMatchObject({
      nome: 'Ana Souza',
      created_at: '2026-10-01T10:00:00.000Z',
      updated_at: '2026-10-02T08:00:00.000Z',
      sync_status: 'pending',
    });
  });

  test('usuário marcado como apagado some das buscas', async () => {
    const repositorio = createSqliteUsuarioRepository();
    const criado = await repositorio.create({ id: ID, email: EMAIL });
    await openDatabaseSync(NOME_DO_BANCO).runAsync(
      'UPDATE usuarios SET deleted_at = ? WHERE id = ?',
      '2026-10-03T09:00:00.000Z',
      criado.id,
    );

    await expect(repositorio.findById(criado.id)).resolves.toBeNull();
    await expect(repositorio.findByEmail(EMAIL)).resolves.toBeNull();
  });

  test('ao abrir um banco antigo, renomeia criado_em para created_at e acrescenta as colunas novas', async () => {
    const banco = abrirBanco();
    const execucoes = (banco.db.execAsync as jest.Mock).mock.calls;

    await createSqliteUsuarioRepository(banco).findById('1' as never);

    const comandos = execucoes.map(([sql]) => String(sql));
    expect(comandos).toContain('ALTER TABLE usuarios RENAME COLUMN criado_em TO created_at');
    expect(comandos).toContain('ALTER TABLE usuarios ADD COLUMN updated_at TEXT');
    expect(comandos).toContain('ALTER TABLE usuarios ADD COLUMN deleted_at TEXT');
    expect(comandos).toContain("ALTER TABLE usuarios ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'");
    expect(comandos).toContain('UPDATE usuarios SET updated_at = created_at WHERE updated_at IS NULL');
  });

  test('banco que já está na versão nova não quebra quando os comandos de atualização falham', async () => {
    const banco = abrirBanco();
    const original = banco.db.execAsync as jest.Mock;
    original.mockImplementation(async (sql: string) => {
      if (/^ALTER TABLE/.test(sql)) {
        throw new Error('duplicate column name');
      }
    });

    await expect(createSqliteUsuarioRepository(banco).findById('1' as never)).resolves.toBeNull();
  });

  test('a tabela nova não tem mais a coluna da senha, nem o login precisa dela', async () => {
    await createSqliteUsuarioRepository().create({ id: ID, email: EMAIL });

    expect(Object.keys((await linhasSalvas())[0])).not.toContain('senha_hash');
  });

  test('ao abrir um banco antigo, tira a coluna da senha e apaga as contas locais antigas, nessa ordem', async () => {
    const banco = abrirBanco();
    const execucoes = (banco.db.execAsync as jest.Mock).mock.calls;

    await createSqliteUsuarioRepository(banco).findById('1' as never);

    const comandos = execucoes.map(([sql]) => String(sql));
    const retirada = comandos.indexOf('ALTER TABLE usuarios DROP COLUMN senha_hash');
    expect(retirada).toBeGreaterThan(-1);
    expect(comandos[retirada + 1]).toBe('DELETE FROM usuarios');
  });

  test('banco que já está sem a coluna da senha não apaga as contas', async () => {
    const banco = abrirBanco();
    (banco.db.execAsync as jest.Mock).mockImplementation(async (sql: string) => {
      if (sql.includes('DROP COLUMN')) {
        throw new Error('no such column: senha_hash');
      }
    });

    await createSqliteUsuarioRepository(banco).findById('1' as never);

    const comandos = (banco.db.execAsync as jest.Mock).mock.calls.map(([sql]) => String(sql));
    expect(comandos).not.toContain('DELETE FROM usuarios');
  });
});
