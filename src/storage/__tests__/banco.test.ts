import { abrirBanco, adicionarColunaSeFaltar } from '../sqlite/banco';
import { reiniciarBancoDeTeste } from '../testing/bancoDeTeste';

jest.mock('expo-sqlite');

describe('banco', () => {
  beforeEach(() => {
    reiniciarBancoDeTeste();
  });

  test('ao abrir, garante em bancos antigos as colunas novas da tabela de documentos', async () => {
    const banco = abrirBanco();
    await banco.pronto;

    const comandos = (banco.db.execAsync as jest.Mock).mock.calls.map(([sql]) => String(sql));
    expect(comandos).toContain('ALTER TABLE documentos ADD COLUMN codigo TEXT');
    expect(comandos).toContain('ALTER TABLE documentos ADD COLUMN foto_sha256 TEXT');
    expect(comandos).toContain("ALTER TABLE documentos ADD COLUMN foto_status TEXT NOT NULL DEFAULT 'local'");
    expect(comandos).toContain("ALTER TABLE documentos ADD COLUMN pdf_status TEXT NOT NULL DEFAULT 'local'");
  });

  test('ao abrir, garante em bancos antigos as colunas que dizem se foto e PDF já estão na nuvem', async () => {
    const banco = abrirBanco();
    await banco.pronto;

    const comandos = (banco.db.execAsync as jest.Mock).mock.calls.map(([sql]) => String(sql));
    expect(comandos).toContain('ALTER TABLE documentos ADD COLUMN foto_na_nuvem INTEGER NOT NULL DEFAULT 0');
    expect(comandos).toContain('ALTER TABLE documentos ADD COLUMN pdf_na_nuvem INTEGER NOT NULL DEFAULT 0');
  });

  describe('adicionarColunaSeFaltar', () => {
    test('manda acrescentar a coluna na tabela', async () => {
      const execAsync = jest.fn(async () => undefined);

      await adicionarColunaSeFaltar({ execAsync } as never, 'documentos', 'codigo TEXT');

      expect(execAsync).toHaveBeenCalledWith('ALTER TABLE documentos ADD COLUMN codigo TEXT');
    });

    test('se a coluna já existe e o banco recusa, segue em frente sem erro', async () => {
      const execAsync = jest.fn().mockRejectedValue(new Error('duplicate column name: codigo'));

      await expect(adicionarColunaSeFaltar({ execAsync } as never, 'documentos', 'codigo TEXT')).resolves.toBeUndefined();
    });
  });
});
