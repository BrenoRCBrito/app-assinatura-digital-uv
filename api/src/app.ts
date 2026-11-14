import express, { type ErrorRequestHandler, type Express } from 'express';
import swaggerUi from 'swagger-ui-express';

import type { Banco } from './banco';
import type { Carimbo } from './carimbo';
import { ValidationError } from './domain/brand';
import {
  BYTES_DO_CODIGO_CURTO,
  codigoCurtoDeBytes,
  criarCodigoCurto,
  formatarCodigoCurto,
  type CodigoCurto,
} from './domain/codigoCurto';
import { conferirCodigoAntigo, serializarCampos, type CampoDoCodigo } from './domain/codigoDeAutenticidade';
import { documentoOpenApi } from './openapi';

export type DependenciasDaApi = Readonly<{
  banco: Banco;
  carimbo: Carimbo;
  gerarBytes: (quantidade: number) => Uint8Array;
  agora: () => Date;
}>;

const CHAVE_DO_CODIGO = 'codigo';
const TENTATIVAS_DE_CODIGO_LIVRE = 5;
const LIMITE_DO_CORPO = '16kb';

function lerCampos(dado: unknown): readonly CampoDoCodigo[] | null {
  if (!Array.isArray(dado) || dado.length === 0) {
    return null;
  }
  const campos: CampoDoCodigo[] = [];
  for (const item of dado) {
    if (typeof item?.chave !== 'string' || typeof item?.valor !== 'string') {
      return null;
    }
    campos.push({ chave: item.chave, valor: item.valor });
  }
  return campos;
}

function lerCamposGuardados(json: string): readonly CampoDoCodigo[] | null {
  try {
    return lerCampos(JSON.parse(json));
  } catch {
    return null;
  }
}

function lerCodigo(texto: string): CodigoCurto | null {
  try {
    return criarCodigoCurto(texto);
  } catch {
    return null;
  }
}

function mensagemDoRegistro(codigo: CodigoCurto, campos: readonly CampoDoCodigo[]): string | null {
  try {
    return serializarCampos([...campos, { chave: CHAVE_DO_CODIGO, valor: codigo }]);
  } catch (error) {
    if (error instanceof ValidationError) {
      return null;
    }
    throw error;
  }
}

const tratarErro: ErrorRequestHandler = (erro, _pedido, resposta, _seguir) => {
  const status: unknown = erro?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    resposta.status(status).json({ erro: 'Pedido inválido.' });
    return;
  }
  console.error('Falha na API:', erro);
  resposta.status(500).json({ erro: 'Erro interno.' });
};

export function criarApp({ banco, carimbo, gerarBytes, agora }: DependenciasDaApi): Express {
  const app = express();
  app.use(express.json({ limit: LIMITE_DO_CORPO }));

  app.get('/saude', (_pedido, resposta) => {
    resposta.json({ ok: true });
  });

  app.post('/documentos', (pedido, resposta) => {
    const campos = lerCampos(pedido.body?.campos);
    if (campos === null || campos.some(({ chave }) => chave === CHAVE_DO_CODIGO)) {
      resposta.status(400).json({ erro: 'Campos do documento inválidos.' });
      return;
    }
    for (let tentativa = 0; tentativa < TENTATIVAS_DE_CODIGO_LIVRE; tentativa += 1) {
      const codigo = codigoCurtoDeBytes(gerarBytes(BYTES_DO_CODIGO_CURTO));
      const mensagem = mensagemDoRegistro(codigo, campos);
      if (mensagem === null) {
        resposta.status(400).json({ erro: 'Campos do documento inválidos.' });
        return;
      }
      const gravado = banco.inserir({
        codigo,
        campos: JSON.stringify(campos),
        carimbo: carimbo.carimbar(mensagem),
        criadoEm: agora().toISOString(),
      });
      if (gravado) {
        resposta.status(201).json({ codigo: formatarCodigoCurto(codigo) });
        return;
      }
    }
    resposta.status(503).json({ erro: 'Não foi possível gerar um código livre.' });
  });

  app.get('/documentos/:codigo', (pedido, resposta) => {
    const codigo = lerCodigo(pedido.params.codigo);
    if (codigo === null) {
      resposta.status(400).json({ erro: 'Código malformado.' });
      return;
    }
    const registro = banco.buscar(codigo);
    if (registro === null) {
      resposta.status(404).json({ erro: 'Código não encontrado.' });
      return;
    }
    const campos = lerCamposGuardados(registro.campos);
    const mensagem = campos === null ? null : mensagemDoRegistro(codigo, campos);
    resposta.json(
      mensagem !== null && carimbo.confere(mensagem, registro.carimbo)
        ? { veredicto: 'autentico', campos }
        : { veredicto: 'adulterado' },
    );
  });

  app.post('/validacoes', (pedido, resposta) => {
    const lido: unknown = pedido.body?.codigo;
    if (typeof lido !== 'string') {
      resposta.status(400).json({ erro: 'Envie o código em texto.' });
      return;
    }
    const resultado = conferirCodigoAntigo(lido, carimbo.confere);
    resposta.json(
      resultado.tipo === 'autentico'
        ? { veredicto: 'autentico', campos: resultado.campos, versaoMaisNova: resultado.versaoMaisNova }
        : { veredicto: resultado.tipo },
    );
  });

  app.get('/openapi.json', (_pedido, resposta) => {
    resposta.json(documentoOpenApi);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(documentoOpenApi, { customSiteTitle: 'API do AssinaAqui' }));

  app.use(tratarErro);
  return app;
}
