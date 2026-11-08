import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

import { createBase64, criarDocumentoId, type DocumentoId } from '../../domain/documento';
import { formatDateTime } from '../../domain/format';
import { excluirArquivosDocumento, lerFotoDocumentoBase64 } from '../../services/fileSystem';
import { compartilharPdf } from '../../services/sharing';
import { setStringAsync } from 'expo-clipboard';
import { emitirCodigoDoDocumento } from '../../useCases/emitirCodigoDoDocumento';

import { createRepositories } from '../../storage/createRepositories';
import { RepositoriesProvider } from '../../storage/RepositoriesProvider';
import { SettingsProvider } from '../../storage/SettingsProvider';
import {
  corromperDocumentoNoBanco,
  falharProximaEscritaNoBanco,
  reiniciarBancoDeTeste,
} from '../../storage/testing/bancoDeTeste';
import { criarDocumentoDeTeste ,OUTRO_USUARIO_DE_TESTE ,USUARIO_DE_TESTE} from '../../storage/testing/documentoAssinadoRepositoryContract';
import { DocumentoScreen } from '../DocumentoScreen';
import { useAuthentication } from '../../hooks/useAuthentication';


jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('../../services/sharing', () => ({ compartilharPdf: jest.fn() }));
jest.mock('../../services/fileSystem', () => ({
  uriFotoDocumento: ({ id, usuarioId }: { id: string; usuarioId: string }) =>
    `file:///app/usuarios/${usuarioId}/documentos/${id}/foto.jpg`,
  excluirArquivosDocumento: jest.fn(),
  lerFotoDocumentoBase64: jest.fn(),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('../../services/carimbo', () => ({ carimbarComOSegredoDoApp: jest.fn() }));
jest.mock('../../services/hmac', () => ({ resumirSha256: jest.fn() }));
jest.mock('../../useCases/emitirCodigoDoDocumento', () => ({ emitirCodigoDoDocumento: jest.fn() }));
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));

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
  const onExcluido = jest.fn();
  await render(
    <DocumentoScreen documentoId={documentoId} onNaoEncontrado={onNaoEncontrado} onExcluido={onExcluido} />,
    { wrapper: Provedores },
  );
  return { onNaoEncontrado, onExcluido };
}

describe('DocumentoScreen', () => {
  let alerta: jest.SpyInstance;

  beforeEach(async () => {
    await AsyncStorage.clear();
    reiniciarBancoDeTeste();
    jest.mocked(useAuthentication).mockReturnValue({ usuarioId: USUARIO_DE_TESTE } as ReturnType<typeof useAuthentication>);
    jest.mocked(compartilharPdf).mockReset();
    jest.mocked(excluirArquivosDocumento).mockReset();
    alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(setStringAsync).mockReset();
    jest.mocked(emitirCodigoDoDocumento).mockReset();
    jest.mocked(lerFotoDocumentoBase64).mockReset();
  });

  afterEach(() => {
    alerta.mockRestore();
  });

  test('mostra o título, a prévia e os dados do documento salvo', async () => {
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await screen.findByText('Contrato de locação');
    const assinadoEm = formatDateTime(DOCUMENTO.assinadoEm);

    expect(screen.getByText('PDF A4, 1 página')).toBeTruthy();
    expect(screen.getByLabelText('Foto do documento').props.source).toEqual({
      uri: 'file:///app/usuarios/1/documentos/1757680000000/foto.jpg',
    });
    for (const rotulo of ['Assinado em', 'Local', 'Coordenadas', 'Assinatura']) {
      expect(screen.getByText(rotulo)).toBeTruthy();
    }
    expect(screen.getAllByText(assinadoEm)).toHaveLength(2);
    expect(screen.getAllByText('Vassouras')).toHaveLength(3);
    expect(screen.getByText('-22.40418, -43.66283')).toBeTruthy();
    expect(screen.getByText('Rubrica')).toBeTruthy();
  });

  test('sem cidade, esconde a linha Local e leva as coordenadas para o selo', async () => {
    await createRepositories('sqlite').documentos.save({
      ...DOCUMENTO,
      local: { ...DOCUMENTO.local, cidade: null },
    });
    await abrirDocumento();

    await screen.findByText('Contrato de locação');

    expect(screen.queryByText('Local')).toBeNull();
    expect(screen.getAllByText('-22.40418, -43.66283')).toHaveLength(2);
  });

  test('mostra o mapa com o marcador no local da assinatura', async () => {
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    expect((await screen.findByLabelText('Local da assinatura')).props.coordinate).toEqual({
      latitude: -22.40418,
      longitude: -43.66283,
    });
  });

  test('tocar na prévia amplia o documento e Fechar volta para a tela', async () => {
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    expect(await screen.findAllByLabelText('Prévia do documento')).toHaveLength(1);

    await fireEvent.press(screen.getByLabelText('Ampliar documento'));
    expect(screen.getAllByLabelText('Prévia do documento')).toHaveLength(2);

    await fireEvent.press(screen.getByText('Fechar'));
    await waitFor(() => expect(screen.getAllByLabelText('Prévia do documento')).toHaveLength(1));
  });

  test('Compartilhar dentro do documento ampliado manda o PDF para o compartilhamento', async () => {
    jest.mocked(compartilharPdf).mockResolvedValue('compartilhado');
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByLabelText('Ampliar documento'));
    await fireEvent.press(screen.getByText('Compartilhar'));

    await waitFor(() => expect(compartilharPdf).toHaveBeenCalledWith(DOCUMENTO));
  });

    test('documento de outra conta não abre, mesmo sabendo o id: mostra a mensagem e volta', async () => {
    await createRepositories('sqlite').documentos.save(
      criarDocumentoDeTeste('1757680000000', 'Documento alheio', '2026-09-12T14:32:00.000Z', OUTRO_USUARIO_DE_TESTE),
    );
    const { onNaoEncontrado } = await abrirDocumento();

    await waitFor(() => expect(onNaoEncontrado).toHaveBeenCalledTimes(1));
    expect(alerta).toHaveBeenCalledWith('Erro', 'Documento não encontrado.');
    expect(screen.queryByText('Documento alheio')).toBeNull();
  });

  test('sem conta logada, não carrega nada e não volta', async () => {
    jest.mocked(useAuthentication).mockReturnValue({ usuarioId: null } as ReturnType<typeof useAuthentication>);
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    const { onNaoEncontrado } = await abrirDocumento();

    await new Promise((resolver) => setTimeout(resolver, 50));

    expect(screen.queryByText('Contrato de locação')).toBeNull();
    expect(onNaoEncontrado).not.toHaveBeenCalled();
    expect(alerta).not.toHaveBeenCalled();
  });

  test('com a foto só na nuvem, avisa e não tenta mostrar a prévia', async () => {
    await createRepositories('sqlite').documentos.save({ ...DOCUMENTO, fotoStatus: 'remote' });
    await abrirDocumento();

    expect(await screen.findByText('A foto deste documento ainda não está neste aparelho.')).toBeTruthy();
    expect(screen.queryByLabelText('Prévia do documento')).toBeNull();
    expect(screen.queryByLabelText('Ampliar documento')).toBeNull();
    expect(screen.getByText('Assinado em')).toBeTruthy();
  });

  test('com a foto no aparelho, não mostra o aviso da foto', async () => {
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await screen.findByLabelText('Prévia do documento');

    expect(screen.queryByText('A foto deste documento ainda não está neste aparelho.')).toBeNull();
  });

  test('com o PDF só na nuvem, Compartilhar PDF avisa e não compartilha', async () => {
    await createRepositories('sqlite').documentos.save({ ...DOCUMENTO, pdfStatus: 'remote' });
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Compartilhar PDF'));

    expect(alerta).toHaveBeenCalledWith('Erro', 'O PDF deste documento ainda não está neste aparelho.');
    expect(compartilharPdf).not.toHaveBeenCalled();
  });

  test('documento antigo, sem código gravado e com a foto na nuvem, não consegue copiar o código', async () => {
    await createRepositories('sqlite').documentos.save({ ...DOCUMENTO, fotoStatus: 'remote' });
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Copiar código'));

    expect(alerta).toHaveBeenCalledWith('Erro', 'A foto deste documento ainda não está neste aparelho.');
    expect(emitirCodigoDoDocumento).not.toHaveBeenCalled();
    expect(setStringAsync).not.toHaveBeenCalled();
  });

  test('com o código gravado, copia mesmo que a foto esteja só na nuvem', async () => {
    const gravado = {
      ...DOCUMENTO,
      codigo: 'AA1;id=1757680000000#gravado' as never,
      fotoSha256: 'a'.repeat(64),
      fotoStatus: 'remote' as const,
    };
    await createRepositories('sqlite').documentos.save(gravado);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Copiar código'));

    await waitFor(() => expect(setStringAsync).toHaveBeenCalledWith('AA1;id=1757680000000#gravado'));
    expect(alerta).not.toHaveBeenCalled();
  });

  test('documento que não existe mostra a mensagem e volta', async () => {
    const { onNaoEncontrado } = await abrirDocumento(criarDocumentoId('999'));

    await waitFor(() => expect(onNaoEncontrado).toHaveBeenCalledTimes(1));
    expect(alerta).toHaveBeenCalledWith('Erro', 'Documento não encontrado.');
  });

  test('falha ao carregar mostra a mensagem e volta', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await corromperDocumentoNoBanco(DOCUMENTO.id);
    const { onNaoEncontrado } = await abrirDocumento();

    await waitFor(() => expect(onNaoEncontrado).toHaveBeenCalledTimes(1));
    expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível carregar os dados.');
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('Compartilhar PDF manda o documento para o compartilhamento', async () => {
    jest.mocked(compartilharPdf).mockResolvedValue('compartilhado');
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Compartilhar PDF'));

    await waitFor(() => expect(compartilharPdf).toHaveBeenCalledWith(DOCUMENTO));
    expect(alerta).not.toHaveBeenCalled();
  });

  test('sem compartilhamento no aparelho, avisa', async () => {
    jest.mocked(compartilharPdf).mockResolvedValue('indisponivel');
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Compartilhar PDF'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Compartilhamento indisponível neste aparelho.'));
  });

  test('quando o compartilhamento falha, avisa', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(compartilharPdf).mockRejectedValue(new Error('Falha no compartilhamento'));
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Compartilhar PDF'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível compartilhar o PDF.'));
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('Excluir documento pede confirmação, apaga o documento e sai uma vez só', async () => {
    const toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    const { onExcluido } = await abrirDocumento();

    await fireEvent.press(await screen.findByText('Excluir documento'));
    const [titulo, mensagem, botoes] = alerta.mock.calls[0];
    botoes[1].onPress();
    botoes[1].onPress();

    await waitFor(() => expect(onExcluido).toHaveBeenCalledTimes(1));
    expect([titulo, mensagem]).toEqual([
      'Excluir documento',
      'Excluir "Contrato de locação"? O PDF e a foto também são apagados.',
    ]);
    await expect(createRepositories('sqlite').documentos.findById(DOCUMENTO.id ,DOCUMENTO.usuarioId)).resolves.toBeNull();
    expect(excluirArquivosDocumento).toHaveBeenCalledWith(DOCUMENTO);
    expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Documento excluído' });
    toast.mockRestore();
  });

  test('quando excluir falha, avisa e continua no documento', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    const { onExcluido } = await abrirDocumento();

    await fireEvent.press(await screen.findByText('Excluir documento'));
    falharProximaEscritaNoBanco();
    const [, , botoes] = alerta.mock.calls[0];
    botoes[1].onPress();

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível excluir o documento.'));
    expect(onExcluido).not.toHaveBeenCalled();
    expect(excluirArquivosDocumento).not.toHaveBeenCalled();
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('Copiar código copia o código gravado na assinatura, sem refazer nada', async () => {
    const toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
    const gravado = { ...DOCUMENTO, codigo: 'AA1;id=1757680000000#gravado' as never, fotoSha256: 'a'.repeat(64) };
    await createRepositories('sqlite').documentos.save(gravado);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Copiar código'));

    await waitFor(() => expect(setStringAsync).toHaveBeenCalledWith('AA1;id=1757680000000#gravado'));
    expect(emitirCodigoDoDocumento).not.toHaveBeenCalled();
    expect(lerFotoDocumentoBase64).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Código copiado' });
    toast.mockRestore();
  });

  test('documento antigo, sem código gravado, refaz o código e copia', async () => {
    const toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
    jest.mocked(lerFotoDocumentoBase64).mockResolvedValue(createBase64('Zm90bw=='));
    jest
      .mocked(emitirCodigoDoDocumento)
      .mockResolvedValue({ codigo: 'AA1;id=1757680000000#carimbo' as never, fotoSha256: 'b'.repeat(64) });
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Copiar código'));

    await waitFor(() => expect(setStringAsync).toHaveBeenCalledWith('AA1;id=1757680000000#carimbo'));
    expect(emitirCodigoDoDocumento).toHaveBeenCalledWith(expect.anything(), DOCUMENTO, 'Zm90bw==');
    expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Código copiado' });
    toast.mockRestore();
  });

  test('quando copiar o código falha, avisa', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(lerFotoDocumentoBase64).mockResolvedValue(createBase64('Zm90bw=='));
    jest.mocked(emitirCodigoDoDocumento).mockRejectedValue(new Error('Sem usuário'));
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Copiar código'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível copiar o código.'));
    expect(setStringAsync).not.toHaveBeenCalled();
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

});
