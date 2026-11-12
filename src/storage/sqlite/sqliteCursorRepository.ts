import type { CursorRepository } from '../repositories';
import type { Banco } from './banco';

type LinhaCursor = Readonly<{ usuario_id: string; colecao: string; segundos: number; nanos: number }>;

export function createSqliteCursorRepository({ db, pronto }: Banco): CursorRepository {
  return {
    async ler(usuarioId, colecao) {
      await pronto;
      const linha = await db.getFirstAsync<LinhaCursor>(
        'SELECT * FROM sync_cursores WHERE usuario_id = ? AND colecao = ?',
        usuarioId,
        colecao,
      );
      return linha === null ? null : { segundos: linha.segundos, nanos: linha.nanos };
    },
    async gravar(usuarioId, colecao, cursor) {
      await pronto;
      const existente = await db.getFirstAsync<LinhaCursor>(
        'SELECT * FROM sync_cursores WHERE usuario_id = ? AND colecao = ?',
        usuarioId,
        colecao,
      );
      if (existente === null) {
        await db.runAsync(
          'INSERT INTO sync_cursores (usuario_id, colecao, segundos, nanos) VALUES (?, ?, ?, ?)',
          usuarioId,
          colecao,
          cursor.segundos,
          cursor.nanos,
        );
        return;
      }
      await db.runAsync(
        'UPDATE sync_cursores SET segundos = ?, nanos = ? WHERE usuario_id = ? AND colecao = ?',
        cursor.segundos,
        cursor.nanos,
        usuarioId,
        colecao,
      );
    },
    async clear() {
      await pronto;
      await db.runAsync('DELETE FROM sync_cursores');
    },
  };
}
