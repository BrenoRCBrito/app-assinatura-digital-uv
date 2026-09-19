import type { Assinatura } from '../domain/assinatura';
import type { IsoDateTime } from '../domain/dateTime';
import type { Base64, DocumentoAssinado, DocumentoId, Html, TituloDocumento } from '../domain/documento';
import type { CapturedPhoto, FileUri } from '../domain/photo';
import type { PosicaoSelo } from '../domain/selo';
import type { AuthenticationPurpose, AuthenticationResult } from '../services/localAuthentication';
import type { ResultadoLocalAssinatura } from '../services/location';
import type { DocumentoAssinadoRepository } from '../storage/repositories';
import type { UsuarioId } from '../domain/usuario';

export type PedidoAssinatura = Readonly<{
  titulo: TituloDocumento;
  assinatura: Assinatura;
  foto: CapturedPhoto;
  selo: PosicaoSelo;
}>;

export type MotivoFalhaAssinatura =
  | 'autenticacaoBloqueada'
  | 'autenticacaoIndisponivel'
  | 'autenticacaoFalhou'
  | 'localSemPermissao'
  | 'localIndisponivel'
  | 'erroAoGerarDocumento';

export type ResultadoAssinatura =
  | Readonly<{ tipo: 'assinado'; documento: DocumentoAssinado }>
  | Readonly<{ tipo: 'cancelado' }>
  | Readonly<{ tipo: 'falhou'; motivo: MotivoFalhaAssinatura }>;

export type DependenciasAssinatura = Readonly<{
  authenticateDeviceOwner: (purpose: AuthenticationPurpose) => Promise<AuthenticationResult>;
  obterLocalAssinatura: () => Promise<ResultadoLocalAssinatura>;
  copiarFotoDocumento: (id: DocumentoId, foto: CapturedPhoto) => Promise<void>;
  lerFotoDocumentoBase64: (id: DocumentoId) => Promise<Base64>;
  guardarPdfDocumento: (id: DocumentoId, pdf: FileUri) => Promise<void>;
  excluirArquivosDocumento: (id: DocumentoId) => void;
  montarHtmlDocumento: (documento: DocumentoAssinado, fotoBase64: Base64) => Html;
  gerarPdf: (html: Html) => Promise<FileUri>;
  documentos: DocumentoAssinadoRepository;
  agora: () => IsoDateTime;
  criarDocumentoId: () => DocumentoId;
  usuarioId: UsuarioId;
}>;


type FalhaDeAutenticacao = Exclude<AuthenticationResult['type'], 'authenticated' | 'cancelled'>;

const MOTIVO_DA_AUTENTICACAO: Readonly<Record<FalhaDeAutenticacao, MotivoFalhaAssinatura>> = {
  lockedOut: 'autenticacaoBloqueada',
  unavailable: 'autenticacaoIndisponivel',
  failed: 'autenticacaoFalhou',
};

function apagarArquivos(dependencias: DependenciasAssinatura, id: DocumentoId): void {
  try {
    dependencias.excluirArquivosDocumento(id);
  } catch (error) {
    console.error('Falha ao apagar os arquivos do documento:', error);
  }
}

export async function assinarDocumento(
  dependencias: DependenciasAssinatura,
  pedido: PedidoAssinatura,
): Promise<ResultadoAssinatura> {
  const autenticacao = await dependencias.authenticateDeviceOwner('confirmSignature');
  if (autenticacao.type === 'cancelled') {
    return { tipo: 'cancelado' };
  }
  if (autenticacao.type !== 'authenticated') {
    return { tipo: 'falhou', motivo: MOTIVO_DA_AUTENTICACAO[autenticacao.type] };
  }

  const local = await dependencias.obterLocalAssinatura();
  if (local.tipo === 'semPermissao') {
    return { tipo: 'falhou', motivo: 'localSemPermissao' };
  }
  if (local.tipo === 'indisponivel') {
    return { tipo: 'falhou', motivo: 'localIndisponivel' };
  }

  const documento: DocumentoAssinado = {
  id: dependencias.criarDocumentoId(),
  usuarioId: dependencias.usuarioId,
  titulo: pedido.titulo,
  assinaturaUsada: { nome: pedido.assinatura.nome, desenho: pedido.assinatura.desenho },
  tamanhoFoto: pedido.foto.size,
  selo: pedido.selo,
  local: local.local,
  assinadoEm: dependencias.agora(),
  };


  try {
    await dependencias.copiarFotoDocumento(documento.id, pedido.foto);
    const fotoBase64 = await dependencias.lerFotoDocumentoBase64(documento.id);
    const pdf = await dependencias.gerarPdf(dependencias.montarHtmlDocumento(documento, fotoBase64));
    await dependencias.guardarPdfDocumento(documento.id, pdf);
    await dependencias.documentos.save(documento);
    return { tipo: 'assinado', documento };
  } catch (error) {
    console.error('Falha ao gerar o documento assinado:', error);
    apagarArquivos(dependencias, documento.id);
    return { tipo: 'falhou', motivo: 'erroAoGerarDocumento' };
  }
}
