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
import type { DocumentoAssinadoRepository } from '../repositories';

type OpcoesDoContrato = Readonly<{
  antesDeCada?: () => Promise<void>;
  corromperDados?: () => Promise<void>;
}>;

export function criarDocumentoDeTeste(id: string, titulo: string, assinadoEm: string): DocumentoAssinado {
  return {
    id: criarDocumentoId(id),
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
      await expect(criarRepositorio().list()).resolves.toEqual([]);
    });

    test('list devolve do mais novo para o mais antigo', async () => {
      const repositorio = criarRepositorio();
      const antigo = criarDocumentoDeTeste('1', 'Antigo', '2026-09-10T10:00:00.000Z');
      const novo = criarDocumentoDeTeste('2', 'Novo', '2026-09-12T10:00:00.000Z');

      await repositorio.save(antigo);
      await repositorio.save(novo);

      await expect(repositorio.list()).resolves.toEqual([novo, antigo]);
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

      await expect(repositorio.list()).resolves.toEqual([renomeado]);
    });

    test('delete remove só o documento pedido', async () => {
      const repositorio = criarRepositorio();
      const fica = criarDocumentoDeTeste('1', 'Fica', '2026-09-10T10:00:00.000Z');
      await repositorio.save(fica);
      await repositorio.save(criarDocumentoDeTeste('2', 'Sai', '2026-09-12T10:00:00.000Z'));

      await repositorio.delete(criarDocumentoId('2'));

      await expect(repositorio.list()).resolves.toEqual([fica]);
    });

    test('delete de id inexistente não faz nada', async () => {
      const repositorio = criarRepositorio();
      const documento = criarDocumentoDeTeste('1', 'Contrato de locação', '2026-09-12T10:00:00.000Z');
      await repositorio.save(documento);

      await repositorio.delete(criarDocumentoId('999'));

      await expect(repositorio.list()).resolves.toEqual([documento]);
    });

    const { corromperDados } = opcoes;
    if (corromperDados !== undefined) {
      test('list lança erro quando o dado salvo está corrompido', async () => {
        await corromperDados();

        await expect(criarRepositorio().list()).rejects.toThrow();
      });
    }
  });
}
