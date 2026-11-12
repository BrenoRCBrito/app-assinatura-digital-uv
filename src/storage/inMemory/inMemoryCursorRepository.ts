import type { CursorRepository } from '../repositories';

export function createInMemoryCursorRepository(): CursorRepository {
  const cursores = new Map<string, { segundos: number; nanos: number }>();
  const chave = (usuarioId: string, colecao: string) => `${usuarioId}/${colecao}`;

  return {
    async ler(usuarioId, colecao) {
      return cursores.get(chave(usuarioId, colecao)) ?? null;
    },
    async gravar(usuarioId, colecao, cursor) {
      cursores.set(chave(usuarioId, colecao), { segundos: cursor.segundos, nanos: cursor.nanos });
    },
    async clear() {
      cursores.clear();
    },
    async apagarDaConta(usuarioId) {
      for (const chaveDoCursor of [...cursores.keys()]) {
        if (chaveDoCursor.startsWith(`${usuarioId}/`)) {
          cursores.delete(chaveDoCursor);
        }
      }
    },
  };
}
