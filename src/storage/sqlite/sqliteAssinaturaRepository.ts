import { ordenarAssinaturasMaisNovasPrimeiro, paraAssinatura, type Assinatura } from '../../domain/assinatura';
import type { AssinaturaRepository, RegistroSincronizavel } from '../repositories';
import type { Banco } from './banco';

type LinhaAssinatura = Readonly<{
  id: string;
  usuario_id: string;
  nome: string;
  desenho: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  sync_status: string;
}>;

function paraAssinaturaDaLinha(linha: LinhaAssinatura): Assinatura {
  return paraAssinatura({
    id: linha.id,
    usuarioId: linha.usuario_id,
    nome: linha.nome,
    desenho: JSON.parse(linha.desenho),
    criadaEm: linha.created_at,
  });
}

function paraRegistro(linha: LinhaAssinatura): RegistroSincronizavel<Assinatura> {
  return {
    item: paraAssinaturaDaLinha(linha),
    createdAt: linha.created_at,
    updatedAt: linha.updated_at ?? linha.created_at,
    deletedAt: linha.deleted_at,
  };
}

export function createSqliteAssinaturaRepository({ db, pronto }: Banco): AssinaturaRepository {
  return {
    async list(usuarioId) {
      await pronto;
      const linhas = await db.getAllAsync<LinhaAssinatura>(
        'SELECT * FROM assinaturas WHERE usuario_id = ? AND deleted_at IS NULL',
        usuarioId,
      );
      return ordenarAssinaturasMaisNovasPrimeiro(linhas.map(paraAssinaturaDaLinha));
    },
    async save(assinatura) {
      await pronto;
      const agora = new Date().toISOString();
      const desenho = JSON.stringify(assinatura.desenho);
      const existente = await db.getFirstAsync<LinhaAssinatura>('SELECT * FROM assinaturas WHERE id = ?', assinatura.id);
      if (existente === null) {
        await db.runAsync(
          'INSERT INTO assinaturas (id, usuario_id, nome, desenho, created_at, updated_at, deleted_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          assinatura.id,
          assinatura.usuarioId,
          assinatura.nome,
          desenho,
          assinatura.criadaEm,
          agora,
          null,
          'pending',
        );
        return;
      }
      await db.runAsync(
        'UPDATE assinaturas SET usuario_id = ?, nome = ?, desenho = ?, created_at = ?, updated_at = ?, deleted_at = ?, sync_status = ? WHERE id = ?',
        assinatura.usuarioId,
        assinatura.nome,
        desenho,
        assinatura.criadaEm,
        agora,
        null,
        'pending',
        assinatura.id,
      );
    },
    async delete(id) {
      await pronto;
      const agora = new Date().toISOString();
      await db.runAsync(
        'UPDATE assinaturas SET deleted_at = ?, updated_at = ?, sync_status = ? WHERE id = ?',
        agora,
        agora,
        'pending',
        id,
      );
    },
    async clear() {
      await pronto;
      await db.runAsync('DELETE FROM assinaturas');
    },
    async listarPendentes(usuarioId) {
      await pronto;
      const linhas = await db.getAllAsync<LinhaAssinatura>(
        'SELECT * FROM assinaturas WHERE usuario_id = ? AND sync_status = ?',
        usuarioId,
        'pending',
      );
      return linhas.map(paraRegistro);
    },
    async lerParaSincronizar(id) {
      await pronto;
      const linha = await db.getFirstAsync<LinhaAssinatura>('SELECT * FROM assinaturas WHERE id = ?', id);
      return linha === null ? null : { registro: paraRegistro(linha), pendente: linha.sync_status === 'pending' };
    },
    async aplicarDaNuvem({ item, createdAt, updatedAt, deletedAt }) {
      await pronto;
      const desenho = JSON.stringify(item.desenho);
      const existente = await db.getFirstAsync<LinhaAssinatura>('SELECT * FROM assinaturas WHERE id = ?', item.id);
      if (existente === null) {
        await db.runAsync(
          'INSERT INTO assinaturas (id, usuario_id, nome, desenho, created_at, updated_at, deleted_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          item.id,
          item.usuarioId,
          item.nome,
          desenho,
          createdAt,
          updatedAt,
          deletedAt,
          'synced',
        );
        return;
      }
      await db.runAsync(
        'UPDATE assinaturas SET usuario_id = ?, nome = ?, desenho = ?, created_at = ?, updated_at = ?, deleted_at = ?, sync_status = ? WHERE id = ?',
        item.usuarioId,
        item.nome,
        desenho,
        createdAt,
        updatedAt,
        deletedAt,
        'synced',
        item.id,
      );
    },
    async marcarSincronizado(id, updatedAt) {
      await pronto;
      await db.runAsync(
        'UPDATE assinaturas SET sync_status = ? WHERE id = ? AND updated_at = ?',
        'synced',
        id,
        updatedAt,
      );
    },
  };
}
