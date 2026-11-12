import { criarNomeAssinatura } from '../../domain/assinatura';
import { createIsoDateTime } from '../../domain/dateTime';
import { criarDesenho, criarTraco } from '../../domain/desenho';
import {
  createCity,
  createLatitude,
  createLongitude,
  criarDocumentoId,
  criarTituloDocumento,
  type DocumentoAssinado,
} from '../../domain/documento';
import { createFraction, createSize } from '../../domain/geometry';
import { criarUsuarioId, type UsuarioId } from '../../domain/usuario';
import type { DocumentoAssinadoRepository } from '../repositories';
import { testarSincronizacaoDoRepositorio } from './sincronizacaoDoRepositorioContract';

type OpcoesDoContrato = Readonly<{
  antesDeCada?: () => Promise<void>;
  corromperDados?: () => Promise<void>;
}>;

export const USUARIO_DE_TESTE = criarUsuarioId('1');
export const OUTRO_USUARIO_DE_TESTE = criarUsuarioId('2');

export function criarDocumentoDeTeste(
  id: string,
  titulo: string,
  assinadoEm: string,
  usuarioId: UsuarioId = USUARIO_DE_TESTE,
): DocumentoAssinado {
  return {
    id: criarDocumentoId(id),
    usuarioId,
    titulo: criarTituloDocumento(titulo),
    assinaturaUsada: {
      nome: criarNomeAssinatura('Rubrica'),
      desenho: criarDesenho([criarTraco('M10,20 L30,40')], createSize(300, 150)),
    },
    tamanhoFoto: createSize(3024, 4032),
    selo: { x: createFraction(0.4), y: createFraction(0.65), largura: createFraction(0.35) },
    local: {
      coordenadas: { latitude: createLatitude(-22.40418), longitude: createLongitude(-43.66283) },
      cidade: createCity('Vassouras'),
    },
    assinadoEm: createIsoDateTime(assinadoEm),
    codigo: null,
    fotoSha256: null,
    fotoStatus: 'local',
    pdfStatus: 'local',
  };
}

export function testarContratoDocumentoAssinadoRepository(
  nome: string,
  criarRepositorio: () => DocumentoAssinadoRepository,
  opcoes: OpcoesDoContrato = {},
): void {
  describe(`DocumentoAssinadoRepository (${nome})`, () => {
    beforeEach(async () => {
      await opcoes.antesDeCada?.();
    });

    test('list devolve vazio quando nada foi salvo', async () => {
      await expect(criarRepositorio().list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    });

    test('list devolve do mais novo para o mais antigo', async () => {
      const repositorio = criarRepositorio();
      const antigo = criarDocumentoDeTeste('1', 'Antigo', '2026-09-10T10:00:00.000Z');
      const novo = criarDocumentoDeTeste('2', 'Novo', '2026-09-12T10:00:00.000Z');

      await repositorio.save(antigo);
      await repositorio.save(novo);

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([novo, antigo]);
    });

    test('list só devolve os documentos do usuário pedido', async () => {
      const repositorio = criarRepositorio();
      const meu = criarDocumentoDeTeste('1', 'Meu', '2026-09-10T10:00:00.000Z', USUARIO_DE_TESTE);
      const daOutraConta = criarDocumentoDeTeste(
        '2',
        'De outra conta',
        '2026-09-12T10:00:00.000Z',
        OUTRO_USUARIO_DE_TESTE,
      );

      await repositorio.save(meu);
      await repositorio.save(daOutraConta);

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([meu]);
      await expect(repositorio.list(OUTRO_USUARIO_DE_TESTE)).resolves.toEqual([daOutraConta]);
    });

    test('findById devolve o documento salvo ou null', async () => {
      const repositorio = criarRepositorio();
      const documento = criarDocumentoDeTeste('1', 'Contrato de locação', '2026-09-12T10:00:00.000Z');
      await repositorio.save(documento);

      await expect(repositorio.findById(documento.id, USUARIO_DE_TESTE)).resolves.toEqual(documento);
      await expect(repositorio.findById(criarDocumentoId('999'), USUARIO_DE_TESTE)).resolves.toBeNull();
    });

    test('findById não devolve o documento de outra conta, mesmo sabendo o id', async () => {
      const repositorio = criarRepositorio();
      const daOutraConta = criarDocumentoDeTeste(
        '1',
        'De outra conta',
        '2026-09-12T10:00:00.000Z',
        OUTRO_USUARIO_DE_TESTE,
      );
      await repositorio.save(daOutraConta);

      await expect(repositorio.findById(daOutraConta.id, USUARIO_DE_TESTE)).resolves.toBeNull();
      await expect(repositorio.findById(daOutraConta.id, OUTRO_USUARIO_DE_TESTE)).resolves.toEqual(daOutraConta);
    });


    test('save substitui o documento com o mesmo id', async () => {
      const repositorio = criarRepositorio();
      await repositorio.save(criarDocumentoDeTeste('1', 'Rascunho', '2026-09-12T10:00:00.000Z'));
      const renomeado = criarDocumentoDeTeste('1', 'Contrato de locação', '2026-09-12T10:00:00.000Z');

      await repositorio.save(renomeado);

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([renomeado]);
    });

    test('delete remove só o documento pedido', async () => {
      const repositorio = criarRepositorio();
      const fica = criarDocumentoDeTeste('1', 'Fica', '2026-09-10T10:00:00.000Z');
      await repositorio.save(fica);
      await repositorio.save(criarDocumentoDeTeste('2', 'Sai', '2026-09-12T10:00:00.000Z'));

      await repositorio.delete(criarDocumentoId('2'));

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([fica]);
    });

    test('delete de id inexistente não faz nada', async () => {
      const repositorio = criarRepositorio();
      const documento = criarDocumentoDeTeste('1', 'Contrato de locação', '2026-09-12T10:00:00.000Z');
      await repositorio.save(documento);

      await repositorio.delete(criarDocumentoId('999'));

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([documento]);
    });

    test('clear apaga os documentos salvos', async () => {
      const repositorio = criarRepositorio();
      await repositorio.save(criarDocumentoDeTeste('1', 'Contrato de locação', '2026-09-10T10:00:00.000Z'));
      await repositorio.save(criarDocumentoDeTeste('2', 'Termo de estágio', '2026-09-12T10:00:00.000Z'));

      await repositorio.clear();

      await expect(repositorio.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    });

    const { corromperDados } = opcoes;
    if (corromperDados !== undefined) {
      test('list lança erro quando o dado salvo está corrompido', async () => {
        await corromperDados();

        await expect(criarRepositorio().list(USUARIO_DE_TESTE)).rejects.toThrow();
      });
    }

    testarSincronizacaoDoRepositorio({
      criarRepositorio,
      criarItem: (id, usuarioId) => criarDocumentoDeTeste(id, 'Contrato', '2026-09-12T10:00:00.000Z', usuarioId),
      alterar: (documento) => ({ ...documento, titulo: criarTituloDocumento('Outro título') }),
      criadoEmEsperado: (_documento, agora) => agora,
      usuario: USUARIO_DE_TESTE,
      outroUsuario: OUTRO_USUARIO_DE_TESTE,
    });

    describe('sincronização dos arquivos', () => {
      beforeEach(() => {
        jest.useFakeTimers({ now: new Date('2026-10-01T10:00:00.000Z') });
      });

      afterEach(() => {
        jest.useRealTimers();
      });

      test('documento que veio da nuvem entra com foto e PDF "remote"', async () => {
        const repositorio = criarRepositorio();
        const documento = {
          ...criarDocumentoDeTeste('n1', 'Da nuvem', '2026-09-12T10:00:00.000Z'),
          fotoStatus: 'remote' as const,
          pdfStatus: 'remote' as const,
        };

        await repositorio.aplicarDaNuvem({
          item: documento,
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-05T09:00:00.000Z',
          deletedAt: null,
        });

        await expect(repositorio.findById(documento.id, USUARIO_DE_TESTE)).resolves.toMatchObject({
          fotoStatus: 'remote',
          pdfStatus: 'remote',
        });
      });

      test('atualização que vem da nuvem não mexe no estado da foto e do PDF que já estão neste aparelho', async () => {
        const repositorio = criarRepositorio();
        const local = criarDocumentoDeTeste('1', 'Contrato', '2026-09-12T10:00:00.000Z');
        await repositorio.save(local);

        await repositorio.aplicarDaNuvem({
          item: { ...local, titulo: criarTituloDocumento('Título novo'), fotoStatus: 'remote', pdfStatus: 'remote' },
          createdAt: '2026-10-01T10:00:00.000Z',
          updatedAt: '2026-10-05T09:00:00.000Z',
          deletedAt: null,
        });

        await expect(repositorio.findById(local.id, USUARIO_DE_TESTE)).resolves.toMatchObject({
          titulo: 'Título novo',
          fotoStatus: 'local',
          pdfStatus: 'local',
        });
      });
    });

    describe('arquivos na nuvem', () => {
      const ASSINADO = '2026-09-12T10:00:00.000Z';
      const apagarComoDeUsuario = async (repositorio: DocumentoAssinadoRepository, id: string) =>
        repositorio.delete(criarDocumentoId(id));

      test('documento recém-assinado tem foto e PDF para enviar', async () => {
        const repositorio = criarRepositorio();
        const documento = criarDocumentoDeTeste('d1', 'Contrato', ASSINADO);
        await repositorio.save(documento);

        const arquivos = await repositorio.listarArquivosParaEnviar(USUARIO_DE_TESTE);

        expect(arquivos.map(({ tipo }) => tipo).sort()).toEqual(['foto', 'pdf']);
        expect(arquivos.every((arquivo) => arquivo.documento.id === documento.id)).toBe(true);
      });

      test('arquivo marcado como já na nuvem deixa de ser listado para envio, e o outro continua', async () => {
        const repositorio = criarRepositorio();
        await repositorio.save(criarDocumentoDeTeste('d1', 'Contrato', ASSINADO));

        await repositorio.definirArquivoNaNuvem('d1', 'foto', true);

        const arquivos = await repositorio.listarArquivosParaEnviar(USUARIO_DE_TESTE);
        expect(arquivos.map(({ tipo }) => tipo)).toEqual(['pdf']);
      });

      test('desmarcar volta a listar o arquivo para envio', async () => {
        const repositorio = criarRepositorio();
        await repositorio.save(criarDocumentoDeTeste('d1', 'Contrato', ASSINADO));
        await repositorio.definirArquivoNaNuvem('d1', 'foto', true);

        await repositorio.definirArquivoNaNuvem('d1', 'foto', false);

        const arquivos = await repositorio.listarArquivosParaEnviar(USUARIO_DE_TESTE);
        expect(arquivos.map(({ tipo }) => tipo).sort()).toEqual(['foto', 'pdf']);
      });

      test('salvar de novo o documento não perde a marca de que o arquivo já está na nuvem', async () => {
        const repositorio = criarRepositorio();
        const documento = criarDocumentoDeTeste('d1', 'Contrato', ASSINADO);
        await repositorio.save(documento);
        await repositorio.definirArquivoNaNuvem('d1', 'foto', true);

        await repositorio.save({ ...documento, titulo: criarTituloDocumento('Outro título') });

        const arquivos = await repositorio.listarArquivosParaEnviar(USUARIO_DE_TESTE);
        expect(arquivos.map(({ tipo }) => tipo)).toEqual(['pdf']);
      });

      test('arquivo que não está neste aparelho (documento vindo da nuvem) não é listado para envio', async () => {
        const repositorio = criarRepositorio();
        const documento = {
          ...criarDocumentoDeTeste('n1', 'Da nuvem', ASSINADO),
          fotoStatus: 'remote' as const,
          pdfStatus: 'remote' as const,
        };
        await repositorio.aplicarDaNuvem({
          item: documento,
          createdAt: ASSINADO,
          updatedAt: ASSINADO,
          deletedAt: null,
        });

        await expect(repositorio.listarArquivosParaEnviar(USUARIO_DE_TESTE)).resolves.toEqual([]);
      });

      test('só lista os arquivos do usuário pedido', async () => {
        const repositorio = criarRepositorio();
        await repositorio.save(criarDocumentoDeTeste('d1', 'Meu', ASSINADO, USUARIO_DE_TESTE));
        await repositorio.save(criarDocumentoDeTeste('d2', 'De outra conta', ASSINADO, OUTRO_USUARIO_DE_TESTE));

        const arquivos = await repositorio.listarArquivosParaEnviar(USUARIO_DE_TESTE);

        expect(arquivos.every((arquivo) => arquivo.documento.id === 'd1')).toBe(true);
      });

      test('documento excluído não tem arquivo para enviar', async () => {
        const repositorio = criarRepositorio();
        await repositorio.save(criarDocumentoDeTeste('d1', 'Contrato', ASSINADO));
        await apagarComoDeUsuario(repositorio, 'd1');

        await expect(repositorio.listarArquivosParaEnviar(USUARIO_DE_TESTE)).resolves.toEqual([]);
      });

      describe('limpeza da nuvem dos documentos excluídos', () => {
        test('documento excluído entra na lista para limpar, mesmo que este aparelho não tenha enviado os arquivos', async () => {
          const repositorio = criarRepositorio();
          const documento = criarDocumentoDeTeste('d1', 'Contrato', ASSINADO);
          await repositorio.save(documento);
          await apagarComoDeUsuario(repositorio, 'd1');

          const paraLimpar = await repositorio.listarDocumentosParaLimparNaNuvem(USUARIO_DE_TESTE);

          expect(paraLimpar.map(({ id }) => id)).toEqual([documento.id]);
        });

        test('depois de limpa a nuvem, o documento sai da lista', async () => {
          const repositorio = criarRepositorio();
          await repositorio.save(criarDocumentoDeTeste('d1', 'Contrato', ASSINADO));
          await apagarComoDeUsuario(repositorio, 'd1');

          await repositorio.marcarNuvemLimpa('d1');

          await expect(repositorio.listarDocumentosParaLimparNaNuvem(USUARIO_DE_TESTE)).resolves.toEqual([]);
        });

        test('documento que não foi excluído nunca é listado para limpar, mesmo com arquivo na nuvem', async () => {
          const repositorio = criarRepositorio();
          await repositorio.save(criarDocumentoDeTeste('d1', 'Contrato', ASSINADO));
          await repositorio.definirArquivoNaNuvem('d1', 'foto', true);
          await repositorio.definirArquivoNaNuvem('d1', 'pdf', true);

          await expect(repositorio.listarDocumentosParaLimparNaNuvem(USUARIO_DE_TESTE)).resolves.toEqual([]);
        });

        test('só lista os documentos excluídos do usuário pedido', async () => {
          const repositorio = criarRepositorio();
          await repositorio.save(criarDocumentoDeTeste('d1', 'Meu', ASSINADO, USUARIO_DE_TESTE));
          await repositorio.save(criarDocumentoDeTeste('d2', 'De outra conta', ASSINADO, OUTRO_USUARIO_DE_TESTE));
          await apagarComoDeUsuario(repositorio, 'd1');
          await apagarComoDeUsuario(repositorio, 'd2');

          const paraLimpar = await repositorio.listarDocumentosParaLimparNaNuvem(USUARIO_DE_TESTE);

          expect(paraLimpar.map(({ id }) => id)).toEqual(['d1']);
        });

        test('documento excluído em outro aparelho (veio da nuvem já excluído) também é listado para limpar', async () => {
          const repositorio = criarRepositorio();
          const documento = criarDocumentoDeTeste('n1', 'Excluído lá', ASSINADO);
          await repositorio.aplicarDaNuvem({
            item: { ...documento, fotoStatus: 'remote', pdfStatus: 'remote' },
            createdAt: ASSINADO,
            updatedAt: ASSINADO,
            deletedAt: ASSINADO,
          });

          const paraLimpar = await repositorio.listarDocumentosParaLimparNaNuvem(USUARIO_DE_TESTE);

          expect(paraLimpar.map(({ id }) => id)).toEqual(['n1']);
        });

        test('excluir de novo depois de limpo volta a pedir a limpeza', async () => {
          const repositorio = criarRepositorio();
          const documento = criarDocumentoDeTeste('d1', 'Contrato', ASSINADO);
          await repositorio.save(documento);
          await apagarComoDeUsuario(repositorio, 'd1');
          await repositorio.marcarNuvemLimpa('d1');
          await repositorio.save(documento);

          await apagarComoDeUsuario(repositorio, 'd1');

          const paraLimpar = await repositorio.listarDocumentosParaLimparNaNuvem(USUARIO_DE_TESTE);
          expect(paraLimpar.map(({ id }) => id)).toEqual(['d1']);
        });

        test('marcar um documento que não existe não lança erro', async () => {
          await expect(criarRepositorio().marcarNuvemLimpa('nao-existe')).resolves.toBeUndefined();
        });
      });

      describe('arquivo baixado da nuvem', () => {
        const DA_NUVEM = '2026-10-05T09:00:00.000Z';

        async function documentoSoNaNuvem(repositorio: DocumentoAssinadoRepository) {
          const documento = {
            ...criarDocumentoDeTeste('n1', 'Da nuvem', ASSINADO),
            fotoStatus: 'remote' as const,
            pdfStatus: 'remote' as const,
          };
          await repositorio.aplicarDaNuvem({ item: documento, createdAt: ASSINADO, updatedAt: DA_NUVEM, deletedAt: null });
          return documento;
        }

        test('a foto baixada passa a "local" e o PDF continua "remote"', async () => {
          const repositorio = criarRepositorio();
          const documento = await documentoSoNaNuvem(repositorio);

          await repositorio.marcarArquivoBaixado('n1', 'foto');

          await expect(repositorio.findById(documento.id, USUARIO_DE_TESTE)).resolves.toMatchObject({
            fotoStatus: 'local',
            pdfStatus: 'remote',
          });
        });

        test('o PDF baixado passa a "local" e a foto continua "remote"', async () => {
          const repositorio = criarRepositorio();
          const documento = await documentoSoNaNuvem(repositorio);

          await repositorio.marcarArquivoBaixado('n1', 'pdf');

          await expect(repositorio.findById(documento.id, USUARIO_DE_TESTE)).resolves.toMatchObject({
            fotoStatus: 'remote',
            pdfStatus: 'local',
          });
        });

        test('baixar não altera o documento: continua sincronizado e com a mesma data de atualização', async () => {
          const repositorio = criarRepositorio();
          await documentoSoNaNuvem(repositorio);

          await repositorio.marcarArquivoBaixado('n1', 'foto');
          await repositorio.marcarArquivoBaixado('n1', 'pdf');

          await expect(repositorio.listarPendentes(USUARIO_DE_TESTE)).resolves.toEqual([]);
          await expect(repositorio.lerParaSincronizar('n1')).resolves.toMatchObject({
            registro: { updatedAt: DA_NUVEM },
            pendente: false,
          });
        });

        test('o arquivo baixado já está na nuvem, então não é mandado de volta', async () => {
          const repositorio = criarRepositorio();
          await documentoSoNaNuvem(repositorio);

          await repositorio.marcarArquivoBaixado('n1', 'foto');
          await repositorio.marcarArquivoBaixado('n1', 'pdf');

          await expect(repositorio.listarArquivosParaEnviar(USUARIO_DE_TESTE)).resolves.toEqual([]);
        });

        test('se o documento for excluído depois, entra na lista para limpar a nuvem', async () => {
          const repositorio = criarRepositorio();
          await documentoSoNaNuvem(repositorio);
          await repositorio.marcarArquivoBaixado('n1', 'foto');
          await apagarComoDeUsuario(repositorio, 'n1');

          const paraLimpar = await repositorio.listarDocumentosParaLimparNaNuvem(USUARIO_DE_TESTE);

          expect(paraLimpar.map(({ id }) => id)).toEqual(['n1']);
        });

        test('documento que não existe não lança erro', async () => {
          await expect(criarRepositorio().marcarArquivoBaixado('nao-existe', 'foto')).resolves.toBeUndefined();
        });
      });

      test('marcar um documento que não existe não lança erro', async () => {
        await expect(criarRepositorio().definirArquivoNaNuvem('nao-existe', 'foto', true)).resolves.toBeUndefined();
      });
    });
  });
}
