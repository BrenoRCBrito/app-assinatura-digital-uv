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

      await expect(repositorio.findById(documento.id)).resolves.toEqual(documento);
      await expect(repositorio.findById(criarDocumentoId('999'))).resolves.toBeNull();
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
  });
}
