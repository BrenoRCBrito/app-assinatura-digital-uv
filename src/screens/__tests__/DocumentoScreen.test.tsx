import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';

import { criarCodigoCurto } from '../../domain/codigoCurto';
import { criarDocumentoId, type DocumentoId } from '../../domain/documento';
import { createEndereco } from '../../domain/endereco';
import { formatDateTime } from '../../domain/format';
import { consultarEnderecoDoLocal } from '../../services/location';
import { baixarArquivosDoDocumento } from '../../services/baixarArquivosDoDocumento';
import { excluirArquivosDocumento } from '../../services/fileSystem';
import { compartilharPdf } from '../../services/sharing';
import { setStringAsync } from 'expo-clipboard';

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
jest.mock('../../services/baixarArquivosDoDocumento', () => ({ baixarArquivosDoDocumento: jest.fn() }));
jest.mock('../../services/fileSystem', () => ({
  uriFotoDocumento: ({ id, usuarioId }: { id: string; usuarioId: string }) =>
    `file:///app/usuarios/${usuarioId}/documentos/${id}/foto.jpg`,
  excluirArquivosDocumento: jest.fn(),
}));
jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn() }));
jest.mock('../../hooks/useAuthentication', () => ({ useAuthentication: jest.fn() }));
jest.mock('../../services/location', () => ({ consultarEnderecoDoLocal: jest.fn() }));

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const COM_CODIGO = { ...DOCUMENTO, codigo: criarCodigoCurto('7K3F9QXZM2P4') };

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
    jest.mocked(baixarArquivosDoDocumento).mockReset();
    jest.mocked(consultarEnderecoDoLocal).mockReset().mockResolvedValue(null);
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

  test('mostra o endereço aproximado gravado na assinatura, também no mapa, sem consultar nada', async () => {
    const ENDERECO = 'Rua das Flores, 123 - Centro, Vassouras - RJ';
    await createRepositories('sqlite').documentos.save({
      ...DOCUMENTO,
      local: { ...DOCUMENTO.local, endereco: createEndereco(ENDERECO) },
    });
    await abrirDocumento();

    await screen.findByText('Endereço aproximado');

    expect(screen.getAllByText(ENDERECO)).toHaveLength(2);
    expect(screen.queryByText('Local')).toBeNull();
    expect(consultarEnderecoDoLocal).not.toHaveBeenCalled();
  });

  test('documento antigo, sem endereço gravado, consulta o endereço pelas coordenadas', async () => {
    jest.mocked(consultarEnderecoDoLocal).mockResolvedValue(createEndereco('Rua A, Vassouras - RJ'));
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    expect(await screen.findByText('Endereço aproximado')).toBeTruthy();
    expect(screen.getAllByText('Rua A, Vassouras - RJ')).toHaveLength(2);
    expect(consultarEnderecoDoLocal).toHaveBeenCalledWith(DOCUMENTO.local.coordenadas);
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

  test('com o código gravado, copia mesmo que a foto esteja só na nuvem', async () => {
    await createRepositories('sqlite').documentos.save({ ...COM_CODIGO, fotoStatus: 'remote' });
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Copiar código'));

    await waitFor(() => expect(setStringAsync).toHaveBeenCalledWith('7K3F-9QXZ-M2P4'));
    expect(alerta).not.toHaveBeenCalled();
  });

  describe('baixar do servidor', () => {
    test('com tudo no aparelho, não mostra o botão de baixar', async () => {
      await createRepositories('sqlite').documentos.save(DOCUMENTO);
      await abrirDocumento();

      await screen.findByText('Compartilhar PDF');

      expect(screen.queryByText('Baixar do servidor')).toBeNull();
    });

    test.each([
      ['só a foto na nuvem', { fotoStatus: 'remote' as const }],
      ['só o PDF na nuvem', { pdfStatus: 'remote' as const }],
      ['foto e PDF na nuvem', { fotoStatus: 'remote' as const, pdfStatus: 'remote' as const }],
    ])('com %s, mostra o botão de baixar', async (_nome, status) => {
      await createRepositories('sqlite').documentos.save({ ...DOCUMENTO, ...status });
      await abrirDocumento();

      expect(await screen.findByText('Baixar do servidor')).toBeTruthy();
    });

    test('baixa com sucesso: avisa, mostra a prévia da foto e esconde o botão', async () => {
      const toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
      const repositorios = createRepositories('sqlite');
      await repositorios.documentos.save({ ...DOCUMENTO, fotoStatus: 'remote', pdfStatus: 'remote' });
      jest.mocked(baixarArquivosDoDocumento).mockImplementation(async (documentos, documento) => {
        await documentos.marcarArquivoBaixado(documento.id, 'foto');
        await documentos.marcarArquivoBaixado(documento.id, 'pdf');
        return { baixados: 2, ausentes: 0, falhas: 0 };
      });
      await abrirDocumento();

      await fireEvent.press(await screen.findByText('Baixar do servidor'));

      expect(await screen.findByLabelText('Prévia do documento')).toBeTruthy();
      expect(screen.queryByText('Baixar do servidor')).toBeNull();
      expect(screen.queryByText('A foto deste documento ainda não está neste aparelho.')).toBeNull();
      expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Documento baixado' });
      expect(baixarArquivosDoDocumento).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: DOCUMENTO.id, fotoStatus: 'remote' }),
      );
      toast.mockRestore();
    });

    test('arquivo ainda não enviado pelo outro aparelho: explica o que fazer e mantém o botão', async () => {
      await createRepositories('sqlite').documentos.save({ ...DOCUMENTO, fotoStatus: 'remote' });
      jest.mocked(baixarArquivosDoDocumento).mockResolvedValue({ baixados: 0, ausentes: 1, falhas: 0 });
      await abrirDocumento();

      await fireEvent.press(await screen.findByText('Baixar do servidor'));

      await waitFor(() =>
        expect(alerta).toHaveBeenCalledWith(
          'Erro',
          'O outro aparelho ainda não enviou os arquivos deste documento. Abra o app lá e tente de novo.',
        ),
      );
      expect(screen.getByText('Baixar do servidor')).toBeTruthy();
    });

    test('falha de rede ou arquivo corrompido: avisa para conferir a conexão', async () => {
      await createRepositories('sqlite').documentos.save({ ...DOCUMENTO, fotoStatus: 'remote' });
      jest.mocked(baixarArquivosDoDocumento).mockResolvedValue({ baixados: 0, ausentes: 0, falhas: 1 });
      await abrirDocumento();

      await fireEvent.press(await screen.findByText('Baixar do servidor'));

      await waitFor(() =>
        expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível baixar. Confira a conexão e tente de novo.'),
      );
    });

    test('erro inesperado (banco não configurado) também vira o aviso e fica no log', async () => {
      const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
      await createRepositories('sqlite').documentos.save({ ...DOCUMENTO, fotoStatus: 'remote' });
      jest.mocked(baixarArquivosDoDocumento).mockRejectedValue(new Error('Realtime Database não configurado'));
      await abrirDocumento();

      await fireEvent.press(await screen.findByText('Baixar do servidor'));

      await waitFor(() =>
        expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível baixar. Confira a conexão e tente de novo.'),
      );
      expect(erro).toHaveBeenCalledTimes(1);
      erro.mockRestore();
    });

    test('durante o download o botão mostra "Baixando…" e um segundo toque é ignorado', async () => {
      await createRepositories('sqlite').documentos.save({ ...DOCUMENTO, fotoStatus: 'remote' });
      let terminar: (resultado: { baixados: number; ausentes: number; falhas: number }) => void = () => undefined;
      jest.mocked(baixarArquivosDoDocumento).mockReturnValue(
        new Promise((resolver) => {
          terminar = resolver;
        }),
      );
      await abrirDocumento();

      await fireEvent.press(await screen.findByText('Baixar do servidor'));
      await fireEvent.press(await screen.findByText('Baixando…'));

      expect(baixarArquivosDoDocumento).toHaveBeenCalledTimes(1);
      terminar({ baixados: 0, ausentes: 1, falhas: 0 });
      await waitFor(() => expect(screen.getByText('Baixar do servidor')).toBeTruthy());
    });
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

  test('Copiar código copia o código curto guardado no documento, formatado', async () => {
    const toast = jest.spyOn(Toast, 'show').mockImplementation(() => undefined);
    await createRepositories('sqlite').documentos.save(COM_CODIGO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Copiar código'));

    await waitFor(() => expect(setStringAsync).toHaveBeenCalledWith('7K3F-9QXZ-M2P4'));
    expect(toast).toHaveBeenCalledWith({ type: 'success', text1: 'Código copiado' });
    toast.mockRestore();
  });

  test('quando copiar o código falha, avisa', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.mocked(setStringAsync).mockRejectedValue(new Error('Área de transferência indisponível'));
    await createRepositories('sqlite').documentos.save(COM_CODIGO);
    await abrirDocumento();

    await fireEvent.press(await screen.findByText('Copiar código'));

    await waitFor(() => expect(alerta).toHaveBeenCalledWith('Erro', 'Não foi possível copiar o código.'));
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('documento assinado antes da API, sem código, não oferece Copiar código', async () => {
    await createRepositories('sqlite').documentos.save(DOCUMENTO);
    await abrirDocumento();

    await screen.findByText('Contrato de locação');

    expect(screen.queryByText('Copiar código')).toBeNull();
  });
});
