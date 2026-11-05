import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_SETTINGS } from '../../domain/settings';
import { SETTINGS_STORAGE_KEY } from '../settingsStorage';
import { abrirBanco } from '../sqlite/banco';
import { ASSINATURAS_STORAGE_KEY, DOCUMENTOS_STORAGE_KEY } from '../sqlite/migrarDoAsyncStorage';
import { createSqliteAssinaturaRepository } from '../sqlite/sqliteAssinaturaRepository';
import { createSqliteDocumentoAssinadoRepository } from '../sqlite/sqliteDocumentoAssinadoRepository';
import { criarAssinaturaDeTeste, USUARIO_DE_TESTE } from '../testing/assinaturaRepositoryContract';
import { reiniciarBancoDeTeste } from '../testing/bancoDeTeste';
import { criarDocumentoDeTeste } from '../testing/documentoAssinadoRepositoryContract';

jest.mock('expo-sqlite');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const ASSINATURA = criarAssinaturaDeTeste('1', 'Rubrica', '2026-09-12T10:00:00.000Z');
const DOCUMENTO = criarDocumentoDeTeste('1', 'Contrato de locação', '2026-09-12T14:32:00.000Z');

async function abrirEEsperar() {
  const banco = abrirBanco();
  await banco.pronto;
  return {
    assinaturas: createSqliteAssinaturaRepository(banco),
    documentos: createSqliteDocumentoAssinadoRepository(banco),
  };
}

describe('migração do AsyncStorage para o SQLite', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    reiniciarBancoDeTeste();
  });

  test('copia as assinaturas e os documentos antigos e apaga as chaves antigas', async () => {
    await AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, JSON.stringify([ASSINATURA]));
    await AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, JSON.stringify([DOCUMENTO]));

    const { assinaturas, documentos } = await abrirEEsperar();

    await expect(assinaturas.list(USUARIO_DE_TESTE)).resolves.toEqual([ASSINATURA]);
    await expect(documentos.findById(DOCUMENTO.id)).resolves.toEqual(DOCUMENTO);
    await expect(AsyncStorage.getItem(ASSINATURAS_STORAGE_KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(DOCUMENTOS_STORAGE_KEY)).resolves.toBeNull();
  });

  test('sem dados antigos, não faz nada', async () => {
    const { assinaturas, documentos } = await abrirEEsperar();

    await expect(assinaturas.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    await expect(documentos.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
  });

  test('não sobrescreve o que já existe no SQLite com o mesmo id', async () => {
    const { documentos } = await abrirEEsperar();
    const maisNovo = criarDocumentoDeTeste('1', 'Título novo', '2026-09-12T14:32:00.000Z');
    await documentos.save(maisNovo);
    await AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, JSON.stringify([DOCUMENTO]));

    const depois = await abrirEEsperar();

    await expect(depois.documentos.findById(DOCUMENTO.id)).resolves.toEqual(maisNovo);
    await expect(AsyncStorage.getItem(DOCUMENTOS_STORAGE_KEY)).resolves.toBeNull();
  });

  test('rodar de novo não duplica nada', async () => {
    await AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, JSON.stringify([ASSINATURA]));
    await abrirEEsperar();
    await AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, JSON.stringify([ASSINATURA]));

    const { assinaturas } = await abrirEEsperar();

    await expect(assinaturas.list(USUARIO_DE_TESTE)).resolves.toEqual([ASSINATURA]);
  });

  test('dado antigo corrompido: avisa no console, mantém a chave e não derruba o app', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, '[{"id":');
    await AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, JSON.stringify([ASSINATURA]));

    const { assinaturas, documentos } = await abrirEEsperar();

    await expect(documentos.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(DOCUMENTOS_STORAGE_KEY)).resolves.toBe('[{"id":');
    await expect(assinaturas.list(USUARIO_DE_TESTE)).resolves.toEqual([ASSINATURA]);
    expect(erro).toHaveBeenCalledTimes(1);
    erro.mockRestore();
  });

  test('um item inválido no meio da lista não copia nenhum e mantém a chave', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await AsyncStorage.setItem(DOCUMENTOS_STORAGE_KEY, JSON.stringify([DOCUMENTO, { id: '2' }]));

    const { documentos } = await abrirEEsperar();

    await expect(documentos.list(USUARIO_DE_TESTE)).resolves.toEqual([]);
    await expect(AsyncStorage.getItem(DOCUMENTOS_STORAGE_KEY)).resolves.not.toBeNull();
    erro.mockRestore();
  });

  test('não mexe nas configurações salvas', async () => {
    const salvas = JSON.stringify(DEFAULT_SETTINGS);
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, salvas);
    await AsyncStorage.setItem(ASSINATURAS_STORAGE_KEY, JSON.stringify([ASSINATURA]));

    await abrirEEsperar();

    await expect(AsyncStorage.getItem(SETTINGS_STORAGE_KEY)).resolves.toBe(salvas);
  });
});
