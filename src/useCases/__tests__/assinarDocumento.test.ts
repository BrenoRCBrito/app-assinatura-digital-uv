import { emitirCodigo, type CodigoDeAutenticidade } from '../../domain/codigoDeAutenticidade';
import { createIsoDateTime } from '../../domain/dateTime';
import {
  createBase64,
  createCity,
  createHtml,
  createLatitude,
  createLongitude,
  criarDocumentoId,
  criarTituloDocumento,
} from '../../domain/documento';
import { createFraction, createSize } from '../../domain/geometry';
import { createCapturedPhoto } from '../../domain/photo';
import { criarUsuarioId } from '../../domain/usuario';
import { createInMemoryDocumentoAssinadoRepository } from '../../storage/inMemory/inMemoryDocumentoAssinadoRepository';
import { criarAssinaturaDeTeste } from '../../storage/testing/assinaturaRepositoryContract';
import { assinarDocumento, type DependenciasAssinatura, type PedidoAssinatura } from '../assinarDocumento';

const ID = criarDocumentoId('1757680000000');
const ASSINATURA = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-10T10:00:00.000Z');
const USUARIO_ID = criarUsuarioId('42');
const LOCAL = {
  coordenadas: { latitude: createLatitude(-22.40418), longitude: createLongitude(-43.66283) },
  cidade: createCity('Vassouras'),
};
const PEDIDO: PedidoAssinatura = {
  titulo: criarTituloDocumento('Contrato de locação'),
  assinatura: ASSINATURA,
  foto: createCapturedPhoto('file:///cache/foto.jpg', 3024, 4032),
  selo: { x: createFraction(0.4), y: createFraction(0.65), largura: createFraction(0.35) },
};
const FOTO_BASE64 = createBase64('/9j/4AAQ');
const PDF = createBase64('JVBERi0xLjQK');
let CODIGO: CodigoDeAutenticidade;

beforeAll(async () => {
  CODIGO = await emitirCodigo([{ chave: 'id', valor: ID }], async () => 'carimbo-de-teste');
});

function criarDependencias(sobrescrever: Partial<DependenciasAssinatura> = {}) {
  const passos: string[] = [];
  const registro = createInMemoryDocumentoAssinadoRepository();
  const dependencias: DependenciasAssinatura = {
    authenticateDeviceOwner: jest.fn(async (purpose) => {
      passos.push(`autenticar ${purpose}`);
      return { type: 'authenticated' as const };
    }),
    obterLocalAssinatura: jest.fn(async () => {
      passos.push('obter local');
      return { tipo: 'obtido' as const, local: LOCAL };
    }),
    copiarFotoDocumento: jest.fn(async (id) => {
      passos.push(`copiar foto ${id}`);
    }),
    lerFotoDocumentoBase64: jest.fn(async (id) => {
      passos.push(`ler foto ${id}`);
      return FOTO_BASE64;
    }),
    emitirCodigo: jest.fn(async (documento) => {
      passos.push(`emitir codigo ${documento.id}`);
      return CODIGO;
    }),
    montarHtmlDocumento: jest.fn(() => {
      passos.push('montar html');
      return { html: createHtml('<!DOCTYPE html><html></html>'), tamanhoDaPagina: createSize(595, 841) };
    }),
    gerarPdf: jest.fn(async () => {
      passos.push('gerar pdf');
      return PDF;
    }),
    guardarPdfDocumento: jest.fn(async (id, pdf) => {
      passos.push(`guardar pdf ${id} ${pdf}`);
    }),
    excluirArquivosDocumento: jest.fn((id) => {
      passos.push(`apagar pasta ${id}`);
    }),
    documentos: {
      ...registro,
      save: async (documento) => {
        passos.push('salvar registro');
        await registro.save(documento);
      },
    },
    agora: () => createIsoDateTime('2026-09-12T14:32:00.000Z'),
    criarDocumentoId: () => ID,
    usuarioId: USUARIO_ID,
    ...sobrescrever,
  };
  return { dependencias, passos, registro };
}

describe('assinarDocumento', () => {
  test('autenticação cancelada devolve cancelado sem pedir o local', async () => {
    const { dependencias } = criarDependencias({
      authenticateDeviceOwner: jest.fn().mockResolvedValue({ type: 'cancelled' }),
    });

    await expect(assinarDocumento(dependencias, PEDIDO)).resolves.toEqual({ tipo: 'cancelado' });
    expect(dependencias.obterLocalAssinatura).not.toHaveBeenCalled();
  });

  test.each([
    ['lockedOut', 'autenticacaoBloqueada'],
    ['unavailable', 'autenticacaoIndisponivel'],
    ['failed', 'autenticacaoFalhou'],
  ] as const)('autenticação %s devolve o motivo %s sem pedir o local', async (tipo, motivo) => {
    const { dependencias } = criarDependencias({
      authenticateDeviceOwner: jest.fn().mockResolvedValue({ type: tipo }),
    });

    await expect(assinarDocumento(dependencias, PEDIDO)).resolves.toEqual({ tipo: 'falhou', motivo });
    expect(dependencias.obterLocalAssinatura).not.toHaveBeenCalled();
  });

  test('sem permissão de local devolve localSemPermissao sem gravar arquivos', async () => {
    const { dependencias, passos } = criarDependencias({
      obterLocalAssinatura: jest.fn().mockResolvedValue({ tipo: 'semPermissao' }),
    });

    await expect(assinarDocumento(dependencias, PEDIDO)).resolves.toEqual({
      tipo: 'falhou',
      motivo: 'localSemPermissao',
    });
    expect(passos).toEqual(['autenticar confirmSignature']);
  });

  test('sem local disponível devolve localIndisponivel sem gravar arquivos', async () => {
    const { dependencias, passos } = criarDependencias({
      obterLocalAssinatura: jest.fn().mockResolvedValue({ tipo: 'indisponivel' }),
    });

    await expect(assinarDocumento(dependencias, PEDIDO)).resolves.toEqual({
      tipo: 'falhou',
      motivo: 'localIndisponivel',
    });
    expect(passos).toEqual(['autenticar confirmSignature']);
  });

  test('quando emitir o código falha, apaga a pasta do documento e não salva o registro', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { dependencias, passos, registro } = criarDependencias({
      emitirCodigo: jest.fn().mockRejectedValue(new Error('Segredo do carimbo ausente')),
    });

    await expect(assinarDocumento(dependencias, PEDIDO)).resolves.toEqual({
      tipo: 'falhou',
      motivo: 'erroAoGerarDocumento',
    });
    expect(passos.at(-1)).toBe(`apagar pasta ${ID}`);
    expect(dependencias.gerarPdf).not.toHaveBeenCalled();
    await expect(registro.list(USUARIO_ID)).resolves.toEqual([]);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('quando o PDF falha, apaga a pasta do documento e não salva o registro', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { dependencias, passos, registro } = criarDependencias({
      gerarPdf: jest.fn().mockRejectedValue(new Error('Falha na impressão')),
    });

    await expect(assinarDocumento(dependencias, PEDIDO)).resolves.toEqual({
      tipo: 'falhou',
      motivo: 'erroAoGerarDocumento',
    });
    expect(passos.at(-1)).toBe(`apagar pasta ${ID}`);
    await expect(registro.list(USUARIO_ID)).resolves.toEqual([]);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('quando salvar o registro falha, também apaga a pasta', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { dependencias, passos } = criarDependencias({
      documentos: {
        ...createInMemoryDocumentoAssinadoRepository(),
        save: jest.fn().mockRejectedValue(new Error('Armazenamento cheio')),
      },
    });

    await expect(assinarDocumento(dependencias, PEDIDO)).resolves.toEqual({
      tipo: 'falhou',
      motivo: 'erroAoGerarDocumento',
    });
    expect(passos.at(-1)).toBe(`apagar pasta ${ID}`);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('com sucesso, emite o código, grava a foto e o PDF antes do registro e devolve o documento', async () => {
    const { dependencias, passos, registro } = criarDependencias();

    const resultado = await assinarDocumento(dependencias, PEDIDO);

    const documento = {
      id: ID,
      usuarioId: USUARIO_ID,
      titulo: PEDIDO.titulo,
      assinaturaUsada: { nome: ASSINATURA.nome, desenho: ASSINATURA.desenho },
      tamanhoFoto: PEDIDO.foto.size,
      selo: PEDIDO.selo,
      local: LOCAL,
      assinadoEm: '2026-09-12T14:32:00.000Z',
    };
    expect(resultado).toEqual({ tipo: 'assinado', documento });
    expect(passos).toEqual([
      'autenticar confirmSignature',
      'obter local',
      `copiar foto ${ID}`,
      `ler foto ${ID}`,
      `emitir codigo ${ID}`,
      'montar html',
      'gerar pdf',
      `guardar pdf ${ID} ${PDF}`,
      'salvar registro',
    ]);
    expect(dependencias.emitirCodigo).toHaveBeenCalledWith(documento, FOTO_BASE64);
    expect(dependencias.montarHtmlDocumento).toHaveBeenCalledWith(documento, FOTO_BASE64, CODIGO);
    await expect(registro.findById(ID)).resolves.toEqual(documento);
  });
});
