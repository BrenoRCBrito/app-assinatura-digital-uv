import { isAvailableAsync, shareAsync } from 'expo-sharing';

import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { compartilharPdf } from '../sharing';

jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(), shareAsync: jest.fn() }));
jest.mock('../fileSystem', () => ({
  uriPdfDocumento: (id: string) => `file:///app/documentos/${id}/documento.pdf`,
}));

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');

describe('compartilharPdf', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('compartilha o PDF do documento com o título na janela', async () => {
    jest.mocked(isAvailableAsync).mockResolvedValue(true);
    jest.mocked(shareAsync).mockResolvedValue(undefined);

    await expect(compartilharPdf(DOCUMENTO)).resolves.toBe('compartilhado');
    expect(shareAsync).toHaveBeenCalledWith('file:///app/documentos/1757680000000/documento.pdf', {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Contrato de locação',
    });
  });

  test('sem compartilhamento no aparelho, devolve indisponivel sem abrir nada', async () => {
    jest.mocked(isAvailableAsync).mockResolvedValue(false);

    await expect(compartilharPdf(DOCUMENTO)).resolves.toBe('indisponivel');
    expect(shareAsync).not.toHaveBeenCalled();
  });

  test('a falha ao compartilhar chega a quem chamou', async () => {
    jest.mocked(isAvailableAsync).mockResolvedValue(true);
    jest.mocked(shareAsync).mockRejectedValue(new Error('Falha no compartilhamento'));

    await expect(compartilharPdf(DOCUMENTO)).rejects.toThrow('Falha no compartilhamento');
  });
});
