import { createInMemoryDocumentoAssinadoRepository } from '../../storage/inMemory/inMemoryDocumentoAssinadoRepository';
import { criarDocumentoDeTeste, USUARIO_DE_TESTE } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { excluirDocumento, type DependenciasExclusao } from '../excluirDocumento';

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');

async function criarDependencias() {
  const passos: string[] = [];
  const registro = createInMemoryDocumentoAssinadoRepository();
  await registro.save(DOCUMENTO);
  const dependencias: DependenciasExclusao = {
    documentos: {
      ...registro,
      delete: async (id) => {
        passos.push(`apagar registro ${id}`);
        await registro.delete(id);
      },
    },
    excluirArquivosDocumento: jest.fn((id) => {
      passos.push(`apagar pasta ${id}`);
    }),
  };
  return { dependencias, passos, registro };
}

describe('excluirDocumento', () => {
  test('apaga o registro antes da pasta do documento', async () => {
    const { dependencias, passos, registro } = await criarDependencias();

    await expect(excluirDocumento(dependencias, DOCUMENTO.id)).resolves.toBe('excluido');
    expect(passos).toEqual(['apagar registro 1757680000000', 'apagar pasta 1757680000000']);
    await expect(registro.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
  });

  test('quando apagar o registro falha, devolve falhou e não apaga a pasta', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { dependencias, registro } = await criarDependencias();
    const semRegistro: DependenciasExclusao = {
      ...dependencias,
      documentos: { ...registro, delete: jest.fn().mockRejectedValue(new Error('Falha no armazenamento')) },
    };

    await expect(excluirDocumento(semRegistro, DOCUMENTO.id)).resolves.toBe('falhou');
    expect(dependencias.excluirArquivosDocumento).not.toHaveBeenCalled();
    await expect(registro.list(USUARIO_DE_TESTE)).resolves.toEqual([DOCUMENTO]);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('quando apagar a pasta falha, o documento continua excluído', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { dependencias, registro } = await criarDependencias();
    const semPasta: DependenciasExclusao = {
      ...dependencias,
      excluirArquivosDocumento: jest.fn(() => {
        throw new Error('Pasta em uso');
      }),
    };

    await expect(excluirDocumento(semPasta, DOCUMENTO.id)).resolves.toBe('excluido');
    await expect(registro.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });
});
