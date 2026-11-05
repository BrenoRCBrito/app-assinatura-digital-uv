import { openDatabaseSync } from 'expo-sqlite';

import { NOME_DO_BANCO } from '../sqlite/banco';

type MockDoSqlite = Readonly<{
  __resetTodosOsBancosDeTeste: () => void;
  __falharProximaEscrita: () => void;
}>;

const DATA = '2026-09-12T10:00:00.000Z';
const JSON_QUEBRADO = '{corrompido';

function mockDoSqlite(): MockDoSqlite {
  return jest.requireMock<MockDoSqlite>('expo-sqlite');
}

export function reiniciarBancoDeTeste(): void {
  mockDoSqlite().__resetTodosOsBancosDeTeste();
}

export function falharProximaEscritaNoBanco(): void {
  mockDoSqlite().__falharProximaEscrita();
}

export async function corromperAssinaturaNoBanco(id = '1', usuarioId = '1'): Promise<void> {
  await openDatabaseSync(NOME_DO_BANCO).runAsync(
    'INSERT INTO assinaturas (id, usuario_id, nome, desenho, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    usuarioId,
    'Corrompida',
    JSON_QUEBRADO,
    DATA,
    DATA,
  );
}

export async function corromperDocumentoNoBanco(id = '1', usuarioId = '1'): Promise<void> {
  await openDatabaseSync(NOME_DO_BANCO).runAsync(
    'INSERT INTO documentos (id, usuario_id, titulo, assinatura_usada, tamanho_foto, selo, local_assinatura, assinado_em, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    id,
    usuarioId,
    'Corrompido',
    JSON_QUEBRADO,
    JSON_QUEBRADO,
    JSON_QUEBRADO,
    JSON_QUEBRADO,
    DATA,
    DATA,
    DATA,
  );
}
