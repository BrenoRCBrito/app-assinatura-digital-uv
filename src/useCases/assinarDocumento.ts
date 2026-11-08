import type { Assinatura } from '../domain/assinatura';
import type { CodigoDeAutenticidade } from '../domain/codigoDeAutenticidade';
import type { IsoDateTime } from '../domain/dateTime';
import type {
  ArquivosDoDocumento,
  Base64,
  DocumentoAssinado,
  DocumentoId,
  Html,
  TituloDocumento,
} from '../domain/documento';
import type { Size } from '../domain/geometry';
import type { CapturedPhoto } from '../domain/photo';
import type { PosicaoSelo } from '../domain/selo';
import type { UsuarioId } from '../domain/usuario';
import type { AuthenticationPurpose, AuthenticationResult } from '../services/localAuthentication';
import type { ResultadoLocalAssinatura } from '../services/location';
import type { DocumentoHtml } from '../services/print';
import type { DocumentoAssinadoRepository } from '../storage/repositories';
import type { CodigoEmitido } from './emitirCodigoDoDocumento';

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
  copiarFotoDocumento: (documento: ArquivosDoDocumento, foto: CapturedPhoto) => Promise<void>;
  lerFotoDocumentoBase64: (documento: ArquivosDoDocumento) => Promise<Base64>;
  emitirCodigo: (documento: DocumentoAssinado, fotoBase64: Base64) => Promise<CodigoEmitido>;
  guardarPdfDocumento: (documento: ArquivosDoDocumento, pdf: Base64) => Promise<void>;
  excluirArquivosDocumento: (documento: ArquivosDoDocumento) => void;
  montarHtmlDocumento: (
    documento: DocumentoAssinado,
    fotoBase64: Base64,
    codigo: CodigoDeAutenticidade,
  ) => DocumentoHtml;
  gerarPdf: (html: Html, tamanhoDaPagina: Size) => Promise<Base64>;
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

function apagarArquivos(dependencias: DependenciasAssinatura, documento: ArquivosDoDocumento): void {
  try {
    dependencias.excluirArquivosDocumento(documento);
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

  const semCodigo: DocumentoAssinado = {
    id: dependencias.criarDocumentoId(),
    usuarioId: dependencias.usuarioId,
    titulo: pedido.titulo,
    assinaturaUsada: { nome: pedido.assinatura.nome, desenho: pedido.assinatura.desenho },
    tamanhoFoto: pedido.foto.size,
    selo: pedido.selo,
    local: local.local,
    assinadoEm: dependencias.agora(),
    codigo: null,
    fotoSha256: null,
    fotoStatus: 'local',
    pdfStatus: 'local',
  };

  try {
    await dependencias.copiarFotoDocumento(semCodigo, pedido.foto);
    const fotoBase64 = await dependencias.lerFotoDocumentoBase64(semCodigo);
    // O código depende dos dados do documento, então só entra no registro depois de emitido.
    const { codigo, fotoSha256 } = await dependencias.emitirCodigo(semCodigo, fotoBase64);
    const documento: DocumentoAssinado = { ...semCodigo, codigo, fotoSha256 };
    const { html, tamanhoDaPagina } = dependencias.montarHtmlDocumento(documento, fotoBase64, codigo);
    const pdf = await dependencias.gerarPdf(html, tamanhoDaPagina);
    await dependencias.guardarPdfDocumento(documento, pdf);
    await dependencias.documentos.save(documento);
    return { tipo: 'assinado', documento };
  } catch (error) {
    console.error('Falha ao gerar o documento assinado:', error);
    apagarArquivos(dependencias, semCodigo);
    return { tipo: 'falhou', motivo: 'erroAoGerarDocumento' };
  }
}
