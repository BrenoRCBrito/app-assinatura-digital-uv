import {
  ordenarDocumentosMaisNovosPrimeiro,
  paraDocumentoAssinado,
  type DocumentoAssinado,
} from '../../domain/documento';
import type { DocumentoAssinadoRepository } from '../repositories';
import type { Banco } from './banco';

type LinhaDocumento = Readonly<{
  id: string;
  usuario_id: string;
  titulo: string;
  assinatura_usada: string;
  tamanho_foto: string;
  selo: string;
  local_assinatura: string;
  assinado_em: string;
}>;

function paraDocumentoDaLinha(linha: LinhaDocumento): DocumentoAssinado {
  return paraDocumentoAssinado({
    id: linha.id,
    usuarioId: linha.usuario_id,
    titulo: linha.titulo,
    assinaturaUsada: JSON.parse(linha.assinatura_usada),
    tamanhoFoto: JSON.parse(linha.tamanho_foto),
    selo: JSON.parse(linha.selo),
    local: JSON.parse(linha.local_assinatura),
    assinadoEm: linha.assinado_em,
  });
}

export function createSqliteDocumentoAssinadoRepository({ db, pronto }: Banco): DocumentoAssinadoRepository {
  return {
    async list(usuarioId) {
      await pronto;
      const linhas = await db.getAllAsync<LinhaDocumento>(
        'SELECT * FROM documentos WHERE usuario_id = ? AND deleted_at IS NULL',
        usuarioId,
      );
      return ordenarDocumentosMaisNovosPrimeiro(linhas.map(paraDocumentoDaLinha));
    },
    async findById(id) {
      await pronto;
      const linha = await db.getFirstAsync<LinhaDocumento>(
        'SELECT * FROM documentos WHERE id = ? AND deleted_at IS NULL',
        id,
      );
      return linha === null ? null : paraDocumentoDaLinha(linha);
    },
    async save(documento) {
      await pronto;
      const agora = new Date().toISOString();
      const valores = [
        documento.usuarioId,
        documento.titulo,
        JSON.stringify(documento.assinaturaUsada),
        JSON.stringify(documento.tamanhoFoto),
        JSON.stringify(documento.selo),
        JSON.stringify(documento.local),
        documento.assinadoEm,
      ];
      const existente = await db.getFirstAsync<LinhaDocumento>('SELECT * FROM documentos WHERE id = ?', documento.id);
      if (existente === null) {
        await db.runAsync(
          'INSERT INTO documentos (id, usuario_id, titulo, assinatura_usada, tamanho_foto, selo, local_assinatura, assinado_em, created_at, updated_at, deleted_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          documento.id,
          ...valores,
          agora,
          agora,
          null,
          'pending',
        );
        return;
      }
      await db.runAsync(
        'UPDATE documentos SET usuario_id = ?, titulo = ?, assinatura_usada = ?, tamanho_foto = ?, selo = ?, local_assinatura = ?, assinado_em = ?, updated_at = ?, deleted_at = ?, sync_status = ? WHERE id = ?',
        ...valores,
        agora,
        null,
        'pending',
        documento.id,
      );
    },
    async delete(id) {
      await pronto;
      const agora = new Date().toISOString();
      await db.runAsync(
        'UPDATE documentos SET deleted_at = ?, updated_at = ?, sync_status = ? WHERE id = ?',
        agora,
        agora,
        'pending',
        id,
      );
    },
    async clear() {
      await pronto;
      await db.runAsync('DELETE FROM documentos');
    },
  };
}
