import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

import type { Banco, RegistroDoDocumento } from '../src/banco';
import { abrirBancoFirestore } from '../src/bancoFirestore';
import { abrirBancoSqlite } from '../src/bancoSqlite';

const REGISTRO: RegistroDoDocumento = {
  codigo: '7K3F9QXZM2P4',
  campos: '[{"chave":"titulo","valor":"Contrato"}]',
  carimbo: 'carimbo-do-registro',
  criadoEm: '2026-11-11T12:00:00.000Z',
};

type Abertura = Readonly<{ banco: Banco; descartar: () => Promise<void> }>;

function testarContrato(nome: string, abrir: () => Promise<Abertura>, opcoes: { skip?: string } = {}): void {
  describe(`Banco no ${nome}`, opcoes, () => {
    let aberto: Abertura;

    beforeEach(async () => {
      aberto = await abrir();
    });

    afterEach(async () => {
      await aberto.banco.fechar();
      await aberto.descartar();
    });

    test('guarda e devolve o registro pelo código', async () => {
      assert.equal(await aberto.banco.inserir(REGISTRO), true);

      assert.deepEqual(await aberto.banco.buscar(REGISTRO.codigo), REGISTRO);
    });

    test('não sobrescreve um código que já existe', async () => {
      await aberto.banco.inserir(REGISTRO);

      assert.equal(await aberto.banco.inserir({ ...REGISTRO, carimbo: 'outro' }), false);
      assert.equal((await aberto.banco.buscar(REGISTRO.codigo))?.carimbo, REGISTRO.carimbo);
    });

    test('código que não existe devolve nulo', async () => {
      assert.equal(await aberto.banco.buscar('000000000000'), null);
    });
  });
}

testarContrato('SQLite', async () => {
  const pasta = mkdtempSync(join(tmpdir(), 'assinaaqui-banco-'));
  return {
    banco: abrirBancoSqlite(join(pasta, 'teste.db')),
    descartar: async () => rmSync(pasta, { recursive: true, force: true }),
  };
});

// Só roda com o emulador no ar: npm run test:firestore, na pasta api.
const SEM_EMULADOR = process.env.FIRESTORE_EMULATOR_HOST === undefined ? 'sem FIRESTORE_EMULATOR_HOST' : undefined;

testarContrato(
  'Firestore',
  async () => {
    const app = initializeApp({ projectId: 'demo-assinaaqui-api' }, randomUUID());
    // Uma coleção por teste: os testes não enxergam os registros uns dos outros.
    const banco = abrirBancoFirestore(getFirestore(app), `registros-${randomUUID()}`);
    return { banco, descartar: () => deleteApp(app) };
  },
  { skip: SEM_EMULADOR },
);

describe('Banco no Firestore, com documento alterado no console', { skip: SEM_EMULADOR }, () => {
  test('campos que não são texto voltam vazios, para a API acusar adulteração', async () => {
    const app = initializeApp({ projectId: 'demo-assinaaqui-api' }, randomUUID());
    const firestore = getFirestore(app);
    const colecao = `registros-${randomUUID()}`;
    const banco = abrirBancoFirestore(firestore, colecao);
    try {
      await firestore.collection(colecao).doc(REGISTRO.codigo).set({ campos: 42, carimbo: REGISTRO.carimbo });

      assert.deepEqual(await banco.buscar(REGISTRO.codigo), {
        codigo: REGISTRO.codigo,
        campos: '',
        carimbo: REGISTRO.carimbo,
        criadoEm: '',
      });
    } finally {
      await banco.fechar();
      await deleteApp(app);
    }
  });
});
