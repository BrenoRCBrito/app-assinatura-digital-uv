import {
  ordenarDocumentosMaisNovosPrimeiro,
  paraDocumentoAssinado,
  type DocumentoAssinado,
} from '../../domain/documento';
import type {
  ArquivoDoDocumento,
  DocumentoAssinadoRepository,
  RegistroSincronizavel,
  TipoDeArquivo,
} from '../repositories';
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
  codigo: string | null;
  foto_sha256: string | null;
  foto_status: string;
  pdf_status: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
  sync_status: string;
  foto_na_nuvem: number;
  pdf_na_nuvem: number;
}>;

const COLUNAS_DOS_ARQUIVOS: Readonly<Record<TipoDeArquivo, Readonly<{ status: string; naNuvem: string }>>> = {
  foto: { status: 'foto_status', naNuvem: 'foto_na_nuvem' },
  pdf: { status: 'pdf_status', naNuvem: 'pdf_na_nuvem' },
};
const TIPOS: readonly TipoDeArquivo[] = ['foto', 'pdf'];

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
    codigo: linha.codigo,
    fotoSha256: linha.foto_sha256,
    fotoStatus: linha.foto_status,
    pdfStatus: linha.pdf_status,
  });
}

function paraRegistro(linha: LinhaDocumento): RegistroSincronizavel<DocumentoAssinado> {
  return {
    item: paraDocumentoDaLinha(linha),
    createdAt: linha.created_at,
    updatedAt: linha.updated_at ?? linha.created_at,
    deletedAt: linha.deleted_at,
  };
}

function valoresDoDocumento(documento: DocumentoAssinado) {
  return [
    documento.usuarioId,
    documento.titulo,
    JSON.stringify(documento.assinaturaUsada),
    JSON.stringify(documento.tamanhoFoto),
    JSON.stringify(documento.selo),
    JSON.stringify(documento.local),
    documento.assinadoEm,
    documento.codigo,
    documento.fotoSha256,
  ];
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
    async findById(id, usuarioId) {
      await pronto;
      const linha = await db.getFirstAsync<LinhaDocumento>(
        'SELECT * FROM documentos WHERE id = ? AND usuario_id = ? AND deleted_at IS NULL',
        id,
        usuarioId,
      );
      return linha === null ? null : paraDocumentoDaLinha(linha);
    },
    async save(documento) {
      await pronto;
      const agora = new Date().toISOString();
      const valores = [...valoresDoDocumento(documento), documento.fotoStatus, documento.pdfStatus];

      const existente = await db.getFirstAsync<LinhaDocumento>('SELECT * FROM documentos WHERE id = ?', documento.id);
      if (existente === null) {
        await db.runAsync(
          'INSERT INTO documentos (id, usuario_id, titulo, assinatura_usada, tamanho_foto, selo, local_assinatura, assinado_em, codigo, foto_sha256, foto_status, pdf_status, created_at, updated_at, deleted_at, sync_status, foto_na_nuvem, pdf_na_nuvem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          documento.id,
          ...valores,
          agora,
          agora,
          null,
          'pending',
          0,
          0,
        );
        return;
      }
      await db.runAsync(
        'UPDATE documentos SET usuario_id = ?, titulo = ?, assinatura_usada = ?, tamanho_foto = ?, selo = ?, local_assinatura = ?, assinado_em = ?, codigo = ?, foto_sha256 = ?, foto_status = ?, pdf_status = ?, updated_at = ?, deleted_at = ?, sync_status = ? WHERE id = ?',
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
    async listarPendentes(usuarioId) {
      await pronto;
      const linhas = await db.getAllAsync<LinhaDocumento>(
        'SELECT * FROM documentos WHERE usuario_id = ? AND sync_status = ?',
        usuarioId,
        'pending',
      );
      return linhas.map(paraRegistro);
    },
    async lerParaSincronizar(id) {
      await pronto;
      const linha = await db.getFirstAsync<LinhaDocumento>('SELECT * FROM documentos WHERE id = ?', id);
      return linha === null ? null : { registro: paraRegistro(linha), pendente: linha.sync_status === 'pending' };
    },
    async aplicarDaNuvem({ item, createdAt, updatedAt, deletedAt }) {
      await pronto;
      const valores = valoresDoDocumento(item);
      const existente = await db.getFirstAsync<LinhaDocumento>('SELECT * FROM documentos WHERE id = ?', item.id);
      if (existente === null) {
        await db.runAsync(
          'INSERT INTO documentos (id, usuario_id, titulo, assinatura_usada, tamanho_foto, selo, local_assinatura, assinado_em, codigo, foto_sha256, foto_status, pdf_status, created_at, updated_at, deleted_at, sync_status, foto_na_nuvem, pdf_na_nuvem) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          item.id,
          ...valores,
          item.fotoStatus,
          item.pdfStatus,
          createdAt,
          updatedAt,
          deletedAt,
          'synced',
          0,
          0,
        );
        return;
      }
      await db.runAsync(
        'UPDATE documentos SET usuario_id = ?, titulo = ?, assinatura_usada = ?, tamanho_foto = ?, selo = ?, local_assinatura = ?, assinado_em = ?, codigo = ?, foto_sha256 = ?, created_at = ?, updated_at = ?, deleted_at = ?, sync_status = ? WHERE id = ?',
        ...valores,
        createdAt,
        updatedAt,
        deletedAt,
        'synced',
        item.id,
      );
    },
    async listarArquivosParaEnviar(usuarioId) {
      await pronto;
      const arquivos: ArquivoDoDocumento[] = [];
      for (const tipo of TIPOS) {
        const { status, naNuvem } = COLUNAS_DOS_ARQUIVOS[tipo];
        const linhas = await db.getAllAsync<LinhaDocumento>(
          `SELECT * FROM documentos WHERE usuario_id = ? AND deleted_at IS NULL AND ${status} = ? AND ${naNuvem} = ?`,
          usuarioId,
          'local',
          0,
        );
        arquivos.push(...linhas.map((linha) => ({ documento: paraDocumentoDaLinha(linha), tipo })));
      }
      return arquivos;
    },
    async definirArquivoNaNuvem(id, tipo, naNuvem) {
      await pronto;
      await db.runAsync(
        `UPDATE documentos SET ${COLUNAS_DOS_ARQUIVOS[tipo].naNuvem} = ? WHERE id = ?`,
        naNuvem ? 1 : 0,
        id,
      );
    },
    async marcarArquivoBaixado(id, tipo) {
      await pronto;
      const { status, naNuvem } = COLUNAS_DOS_ARQUIVOS[tipo];
      await db.runAsync(`UPDATE documentos SET ${status} = ?, ${naNuvem} = ? WHERE id = ?`, 'local', 1, id);
    },
    async marcarSincronizado(id, updatedAt) {
      await pronto;
      await db.runAsync(
        'UPDATE documentos SET sync_status = ? WHERE id = ? AND updated_at = ?',
        'synced',
        id,
        updatedAt,
      );
    },
  };
}
