import { get, ref } from 'firebase/database';

import { createBase64, type DocumentoAssinado } from '../domain/documento';
import { lerObjeto, lerTexto } from '../domain/leitura';
import type { DocumentoAssinadoRepository, TipoDeArquivo } from '../storage/repositories';
import { guardarFotoDocumento, guardarPdfDocumento } from './fileSystem';
import { obterBancoDeArquivos } from './firebase';
import { resumirSha256 } from './hmac';
import { comTempoLimite } from './tempoLimite';

export type ResultadoDoDownload = Readonly<{ baixados: number; ausentes: number; falhas: number }>;

export const TEMPO_LIMITE_DO_DOWNLOAD = 60000;

const ARQUIVO_INVALIDO = 'Arquivo da nuvem inválido.';
const TIPOS: readonly TipoDeArquivo[] = ['foto', 'pdf'];

function jaEstaNoAparelho(documento: DocumentoAssinado, tipo: TipoDeArquivo): boolean {
  return (tipo === 'foto' ? documento.fotoStatus : documento.pdfStatus) === 'local';
}

type Banco = ReturnType<typeof obterBancoDeArquivos>;

async function baixarArquivo(banco: Banco, documento: DocumentoAssinado, tipo: TipoDeArquivo): Promise<boolean> {
  const caminho = `arquivos/${documento.usuarioId}/${documento.id}/${tipo}`;
  const naNuvem = await comTempoLimite(
    get(ref(banco, caminho)),
    TEMPO_LIMITE_DO_DOWNLOAD,
    'O download da nuvem demorou demais.',
  );
  if (!naNuvem.exists()) {
    return false;
  }

  const campos = lerObjeto(naNuvem.val(), ARQUIVO_INVALIDO) as Readonly<Record<string, unknown>>;
  const base64 = createBase64(lerTexto(campos.dados, ARQUIVO_INVALIDO));
  const resumoGuardado = lerTexto(campos.sha256, ARQUIVO_INVALIDO);
  const resumoCalculado = await resumirSha256(base64);
  if (resumoCalculado !== resumoGuardado) {
    throw new Error(`O arquivo (${tipo}) baixado do documento ${documento.id} está corrompido.`);
  }
  if (tipo === 'foto' && documento.fotoSha256 !== null && documento.fotoSha256 !== resumoCalculado) {
    throw new Error(`A foto baixada do documento ${documento.id} não é a que foi assinada.`);
  }

  if (tipo === 'foto') {
    await guardarFotoDocumento(documento, base64);
  } else {
    await guardarPdfDocumento(documento, base64);
  }
  return true;
}

export async function baixarArquivosDoDocumento(
  documentos: DocumentoAssinadoRepository,
  documento: DocumentoAssinado,
): Promise<ResultadoDoDownload> {
  const faltando = TIPOS.filter((tipo) => !jaEstaNoAparelho(documento, tipo));
  if (faltando.length === 0) {
    return { baixados: 0, ausentes: 0, falhas: 0 };
  }

  const banco = obterBancoDeArquivos();
  let baixados = 0;
  let ausentes = 0;
  let falhas = 0;
  for (const tipo of faltando) {
    try {
      if (await baixarArquivo(banco, documento, tipo)) {
        await documentos.marcarArquivoBaixado(documento.id, tipo);
        baixados += 1;
      } else {
        ausentes += 1;
      }
    } catch (error) {
      falhas += 1;
      console.warn(`Falha ao baixar o arquivo (${tipo}) do documento ${documento.id}:`, error);
    }
  }
  return { baixados, ausentes, falhas };
}
