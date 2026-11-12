import { paraAssinatura, type Assinatura } from '../domain/assinatura';
import type { Desenho } from '../domain/desenho';
import { paraDocumentoAssinado, type DocumentoAssinado } from '../domain/documento';
import { lerObjeto, lerTexto, lerTextoOuNulo } from '../domain/leitura';
import type { AssinaturaRepository, DocumentoAssinadoRepository } from '../storage/repositories';
import type { AdaptadorDeColecao } from './sincronizacaoDeColecao';

const ASSINATURA_INVALIDA = 'Assinatura da nuvem inválida.';
const DOCUMENTO_INVALIDO = 'Documento da nuvem inválido.';

type Campos = Readonly<Record<string, unknown>>;

function desenhoParaNuvem(desenho: Desenho) {
  return {
    tracos: [...desenho.tracos],
    quadro: { width: desenho.quadro.width, height: desenho.quadro.height },
  };
}

export function adaptadorDeAssinaturas(repositorio: AssinaturaRepository): AdaptadorDeColecao<Assinatura> {
  return {
    colecao: 'assinaturas',
    repositorio,
    paraNuvem: ({ item, createdAt, updatedAt, deletedAt }) => ({
      nome: item.nome,
      desenho: desenhoParaNuvem(item.desenho),
      createdAt,
      updatedAt,
      deletedAt,
    }),
    daNuvem: (id, usuarioId, dados) => {
      const campos = lerObjeto(dados, ASSINATURA_INVALIDA) as Campos;
      const createdAt = lerTexto(campos.createdAt, ASSINATURA_INVALIDA);
      return {
        item: paraAssinatura({
          id,
          usuarioId,
          nome: campos.nome,
          desenho: campos.desenho,
          criadaEm: createdAt,
        }),
        createdAt,
        updatedAt: lerTexto(campos.updatedAt, ASSINATURA_INVALIDA),
        deletedAt: lerTextoOuNulo(campos.deletedAt, ASSINATURA_INVALIDA),
      };
    },
  };
}

export function adaptadorDeDocumentos(repositorio: DocumentoAssinadoRepository): AdaptadorDeColecao<DocumentoAssinado> {
  return {
    colecao: 'documentos',
    repositorio,
    paraNuvem: ({ item, createdAt, updatedAt, deletedAt }) => ({
      titulo: item.titulo,
      assinaturaUsada: { nome: item.assinaturaUsada.nome, desenho: desenhoParaNuvem(item.assinaturaUsada.desenho) },
      tamanhoFoto: { width: item.tamanhoFoto.width, height: item.tamanhoFoto.height },
      selo: { x: item.selo.x, y: item.selo.y, largura: item.selo.largura },
      local: {
        coordenadas: { latitude: item.local.coordenadas.latitude, longitude: item.local.coordenadas.longitude },
        cidade: item.local.cidade,
      },
      assinadoEm: item.assinadoEm,
      codigo: item.codigo,
      fotoSha256: item.fotoSha256,
      createdAt,
      updatedAt,
      deletedAt,
    }),
    daNuvem: (id, usuarioId, dados) => {
      const campos = lerObjeto(dados, DOCUMENTO_INVALIDO) as Campos;
      return {
        item: paraDocumentoAssinado({
          id,
          usuarioId,
          titulo: campos.titulo,
          assinaturaUsada: campos.assinaturaUsada,
          tamanhoFoto: campos.tamanhoFoto,
          selo: campos.selo,
          local: campos.local,
          assinadoEm: campos.assinadoEm,
          codigo: campos.codigo,
          fotoSha256: campos.fotoSha256,
          fotoStatus: 'remote',
          pdfStatus: 'remote',
        }),
        createdAt: lerTexto(campos.createdAt, DOCUMENTO_INVALIDO),
        updatedAt: lerTexto(campos.updatedAt, DOCUMENTO_INVALIDO),
        deletedAt: lerTextoOuNulo(campos.deletedAt, DOCUMENTO_INVALIDO),
      };
    },
  };
}
