import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { criarDocumentoId, type DocumentoId } from '../../domain/documento';
import { formatDateTime } from '../../domain/format';
import { compartilharPdf } from '../../services/sharing';
import {
  createAsyncStorageDocumentoAssinadoRepository,
  DOCUMENTOS_STORAGE_KEY,
} from '../../storage/asyncStorage/asyncStorageDocumentoAssinadoRepository';
import { RepositoriesProvider } from '../../storage/RepositoriesProvider';
import { SettingsProvider } from '../../storage/SettingsProvider';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { DocumentoScreen } from '../DocumentoScreen';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/sharing', () => ({ compartilharPdf: jest.fn() }));
jest.mock('../../services/fileSystem', () => ({
  uriFotoDocumento: (id: string) => `file:///app/documentos/${id}/foto.jpg`,
}));

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');

function Provedores({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SettingsProvider>
      <RepositoriesProvider>{children}</RepositoriesProvider>
    </SettingsProvider>
  );
}

async function abrirDocumento(documentoId: DocumentoId = DOCUMENTO.id) {
  const onNaoEncontrado = jest.fn();
  await render(<DocumentoScreen documentoId={documentoId} onNaoEncontrado={onNaoEncontrado} />, {
    wrapper: Provedores,
  });
  return { onNaoEncontrado };
}

describe('DocumentoScreen', () => {
  let alerta: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.mocked(compartilharPdf).mockReset();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alerta.mockRestore();
  });

  test('mostra o título, a prévia e os dados do documento salvo', async () => {
    await createAsyncStorageDocumentoAssinadoRepository().save(DOCUMENTO);
    await abrirDocumento();

    await screen.findByText('Contrato de locação');
    const assinadoEm = formatDateTime(DOCUMENTO.assinadoEm);

    expect(screen.getByText('PDF A4, 1 página')).toBeTruthy();
    expect(screen.getByLabelText('Foto do documento').props.source).toEqual({
      uri: 'file:///app/documentos/1757680000000/foto.jpg',
    });
    for (const rotulo of ['Assinado em', 'Local', 'Coordenadas', 'Assinatura']) {
      expect(screen.getByText(rotulo)).toBeTruthy();
    }
    expect(screen.getAllByText(assinadoEm)).toHaveLength(2);
    expect(screen.getAllByText('Vassouras')).toHaveLength(2);
    expect(screen.getByText('-22.40418, -43.66283')).toBeTruthy();
    expect(screen.getByText('Rubrica')).toBeTruthy();
  });

  test('sem cidade, esconde a linha Local e leva as coordenadas para o selo', async () => {
    await createAsyncStorageDocumentoAssinadoRepository().save({
      ...DOCUMENTO,
      local: { ...DOCUMENTO.local, cidade: null },
    });
    await abrirDocumento();

    await screen.findByText('Contrato de locação');

    expect(screen.queryByText('Local')).toBeNull();
    expect(screen.getAllByText('-22.40418, -43.66283')).toHaveLength(2);
  });

  test('documento que não existe mostra a mensagem e volta', async () => {
    const { onNaoEncontrado } = await abrirDocumento(criarDocumentoId('999'));

    await waitFor(() => expect(onNaoEncontrado).toHaveBeenCalledTimes(1));
    expect(alerta).toHaveBeenCalledWith('Erro', 'Documento não encontrado.');
  });

  test('falha ao carregar mostra a mensagem e volta', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, '[{"id":');
    const { onNaoEncontrado } = await abrirDocumento();

    await waitFor(() => expect(onNaoEncontrado).toHaveBeenCalledTimes(1));
    expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível carregar os dados.');
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('Compartilhar PDF manda o documento para o compartilhamento', async () => {
    jest.mocked(compartilharPdf).mockResolvedValue('compartilhado');
    await createAsyncStorageDocumentoAssinadoRepository().save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Compartilhar PDF'));

    await waitFor(() => expect(compartilharPdf).toHaveBeenCalledWith(DOCUMENTO));
    expect(alerta).not.toHaveBeenCalled();
  });

  test('sem compartilhamento no aparelho, avisa', async () => {
    jest.mocked(compartilharPdf).mockResolvedValue('indisponivel');
    await createAsyncStorageDocumentoAssinadoRepository().save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Compartilhar PDF'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Compartilhamento indisponível neste aparelho.'));
  });

  test('quando o compartilhamento falha, avisa', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(compartilharPdf).mockRejectedValue(new Error('Falha no compartilhamento'));
    await createAsyncStorageDocumentoAssinadoRepository().save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Compartilhar PDF'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível compartilhar o PDF.'));
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });
});
