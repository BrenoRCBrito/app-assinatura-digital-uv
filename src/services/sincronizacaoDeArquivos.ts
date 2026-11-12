import { get, ref, remove, set } from 'firebase/database';

import type { ArquivosDoDocumento, Base64 } from '../domain/documento';
import type { UsuarioId } from '../domain/usuario';
import type { ArquivoDoDocumento, DocumentoAssinadoRepository, TipoDeArquivo } from '../storage/repositories';
import { lerFotoDocumentoBase64, lerPdfDocumentoBase64 } from './fileSystem';
import { obterBancoDeArquivos } from './firebase';
import { resumirSha256 } from './hmac';
import { comTempoLimite } from './tempoLimite';

export type ResultadoDosArquivos = Readonly<{ enviados: number; apagados: number; falhas: number }>;

export const TAMANHO_MAXIMO_DO_ARQUIVO = 9000000;
export const TEMPO_LIMITE_DA_LEITURA = 15000;
export const TEMPO_LIMITE_DO_ENVIO = 60000;
export const MAXIMO_DE_FALHAS_SEGUIDAS = 3;

const LEITORES: Readonly<Record<TipoDeArquivo, (documento: ArquivosDoDocumento) => Promise<Base64>>> = {
  foto: lerFotoDocumentoBase64,
  pdf: lerPdfDocumentoBase64,
};

function caminhoDoArquivo(usuarioId: UsuarioId, { documento, tipo }: ArquivoDoDocumento): string {
  return `arquivos/${usuarioId}/${documento.id}/${tipo}`;
}

type Banco = ReturnType<typeof obterBancoDeArquivos>;

async function enviarArquivo(banco: Banco, usuarioId: UsuarioId, arquivo: ArquivoDoDocumento): Promise<void> {
  const { documento, tipo } = arquivo;
  const base64 = await LEITORES[tipo](documento);
  if (base64.length > TAMANHO_MAXIMO_DO_ARQUIVO) {
    throw new Error(`O arquivo (${tipo}) do documento ${documento.id} é grande demais para a nuvem.`);
  }
  const sha256 = await resumirSha256(base64);
  if (tipo === 'foto' && documento.fotoSha256 !== null && documento.fotoSha256 !== sha256) {
    throw new Error(`A foto guardada do documento ${documento.id} não confere com o resumo dele.`);
  }

  const caminho = caminhoDoArquivo(usuarioId, arquivo);
  const naNuvem = await comTempoLimite(
    get(ref(banco, `${caminho}/sha256`)),
    TEMPO_LIMITE_DA_LEITURA,
    'A consulta à nuvem demorou demais.',
  );
  if (naNuvem.exists()) {
    if (naNuvem.val() === sha256) {
      return;
    }
    throw new Error(`Já existe na nuvem um arquivo (${tipo}) diferente para o documento ${documento.id}.`);
  }
  await comTempoLimite(
    set(ref(banco, caminho), { dados: base64, sha256 }),
    TEMPO_LIMITE_DO_ENVIO,
    'O envio para a nuvem demorou demais.',
  );
}

export async function sincronizarArquivos(
  documentos: DocumentoAssinadoRepository,
  usuarioId: UsuarioId,
): Promise<ResultadoDosArquivos> {
  const paraApagar = await documentos.listarArquivosParaApagar(usuarioId);
  const paraEnviar = await documentos.listarArquivosParaEnviar(usuarioId);
  if (paraApagar.length === 0 && paraEnviar.length === 0) {
    return { enviados: 0, apagados: 0, falhas: 0 };
  }

  const banco = obterBancoDeArquivos();
  let enviados = 0;
  let apagados = 0;
  let falhas = 0;
  let falhasSeguidas = 0;

  async function tentar(descricao: string, acao: () => Promise<void>): Promise<boolean> {
    try {
      await acao();
      falhasSeguidas = 0;
      return true;
    } catch (error) {
      falhas += 1;
      falhasSeguidas += 1;
      console.warn(`Falha ao ${descricao}:`, error);
      return false;
    }
  }

  for (const arquivo of paraApagar) {
    if (falhasSeguidas >= MAXIMO_DE_FALHAS_SEGUIDAS) {
      break;
    }
    const apagou = await tentar(
      `apagar da nuvem o arquivo (${arquivo.tipo}) do documento ${arquivo.documento.id}`,
      async () => {
        await comTempoLimite(
          remove(ref(banco, caminhoDoArquivo(usuarioId, arquivo))),
          TEMPO_LIMITE_DA_LEITURA,
          'A remoção na nuvem demorou demais.',
        );
        await documentos.definirArquivoNaNuvem(arquivo.documento.id, arquivo.tipo, false);
      },
    );
    apagados += apagou ? 1 : 0;
  }

  for (const arquivo of paraEnviar) {
    if (falhasSeguidas >= MAXIMO_DE_FALHAS_SEGUIDAS) {
      break;
    }
    const enviou = await tentar(
      `enviar para a nuvem o arquivo (${arquivo.tipo}) do documento ${arquivo.documento.id}`,
      async () => {
        await enviarArquivo(banco, usuarioId, arquivo);
        await documentos.definirArquivoNaNuvem(arquivo.documento.id, arquivo.tipo, true);
      },
    );
    enviados += enviou ? 1 : 0;
  }

  return { enviados, apagados, falhas };
}
