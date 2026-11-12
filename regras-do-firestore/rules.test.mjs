import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

let ambiente;

before(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'assinaaqui-regras',
    firestore: { rules: readFileSync('../firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

after(async () => {
  await ambiente.cleanup();
});

beforeEach(async () => {
  await ambiente.clearFirestore();
});

const AGORA = '2026-10-01T10:00:00.000Z';
const DEPOIS = '2026-10-02T10:00:00.000Z';
const ANTES = '2026-09-01T10:00:00.000Z';

const DESENHO = { tracos: ['M10,20 L30,40'], quadro: { width: 300, height: 150 } };

function perfil(extra = {}) {
  return {
    email: 'ana@exemplo.com',
    nome: 'Ana Souza',
    cpf: '11144477735',
    telefone: '11987654321',
    fotoSha256: null,
    createdAt: AGORA,
    updatedAt: AGORA,
    deletedAt: null,
    servidorEm: serverTimestamp(),
    ...extra,
  };
}

function assinatura(extra = {}) {
  return {
    nome: 'Rubrica',
    desenho: DESENHO,
    createdAt: AGORA,
    updatedAt: AGORA,
    deletedAt: null,
    servidorEm: serverTimestamp(),
    ...extra,
  };
}

function documento(extra = {}) {
  return {
    titulo: 'Contrato de locação',
    assinaturaUsada: { nome: 'Rubrica', desenho: DESENHO },
    tamanhoFoto: { width: 3024, height: 4032 },
    selo: { x: 0.4, y: 0.65, largura: 0.35 },
    local: { coordenadas: { latitude: -22.40418, longitude: -43.66283 }, cidade: 'Vassouras' },
    assinadoEm: AGORA,
    codigo: 'AA1;id=d1#carimbo',
    fotoSha256: 'a'.repeat(64),
    createdAt: AGORA,
    updatedAt: AGORA,
    deletedAt: null,
    servidorEm: serverTimestamp(),
    ...extra,
  };
}

const como = (uid) => ambiente.authenticatedContext(uid).firestore();
const anonimo = () => ambiente.unauthenticatedContext().firestore();

describe('acesso: só o dono', () => {
  test('sem login, nada é lido nem escrito', async () => {
    await assertFails(setDoc(doc(anonimo(), 'usuarios/ana'), perfil()));
    await assertFails(getDoc(doc(anonimo(), 'usuarios/ana')));
  });

  test('o dono grava e lê o próprio perfil', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana'), perfil()));
    await assertSucceeds(getDoc(doc(como('ana'), 'usuarios/ana')));
  });

  test('outra pessoa não grava nem lê o perfil alheio', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana'), perfil()));

    await assertFails(getDoc(doc(como('beto'), 'usuarios/ana')));
    await assertFails(setDoc(doc(como('beto'), 'usuarios/ana'), perfil()));
    await assertFails(
      updateDoc(doc(como('beto'), 'usuarios/ana'), { nome: 'Invasor', updatedAt: DEPOIS, servidorEm: serverTimestamp() }),
    );
  });

  test('outra pessoa não lê nem grava assinaturas e documentos alheios', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura()));
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/documentos/d1'), documento()));

    await assertFails(getDoc(doc(como('beto'), 'usuarios/ana/assinaturas/a1')));
    await assertFails(getDoc(doc(como('beto'), 'usuarios/ana/documentos/d1')));
    await assertFails(getDocs(collection(como('beto'), 'usuarios/ana/documentos')));
    await assertFails(setDoc(doc(como('beto'), 'usuarios/ana/documentos/d2'), documento()));
  });

  test('o dono lista os próprios documentos e pede só o que mudou desde o último marcador', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/documentos/d1'), documento()));

    await assertSucceeds(getDocs(collection(como('ana'), 'usuarios/ana/documentos')));
    await assertSucceeds(
      getDocs(
        query(
          collection(como('ana'), 'usuarios/ana/documentos'),
          where('servidorEm', '>', Timestamp.fromDate(new Date('2020-01-01T00:00:00.000Z'))),
          orderBy('servidorEm'),
        ),
      ),
    );
  });

  test('ninguém lista a coleção inteira de usuários', async () => {
    await assertFails(getDocs(collection(como('ana'), 'usuarios')));
  });

  test('qualquer outra coleção é negada, mesmo para quem está logado', async () => {
    await assertFails(setDoc(doc(como('ana'), 'publico/x'), { a: 1 }));
    await assertFails(getDoc(doc(como('ana'), 'publico/x')));
    await assertFails(setDoc(doc(como('ana'), 'usuarios/ana/outra/x'), { a: 1 }));
  });
});

describe('ninguém apaga de verdade', () => {
  test('nem o dono apaga perfil, assinatura ou documento', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana'), perfil()));
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura()));
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/documentos/d1'), documento()));

    await assertFails(deleteDoc(doc(como('ana'), 'usuarios/ana')));
    await assertFails(deleteDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1')));
    await assertFails(deleteDoc(doc(como('ana'), 'usuarios/ana/documentos/d1')));
  });

  test('a exclusão é a marca deletedAt, que o dono pode gravar', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/documentos/d1'), documento()));

    await assertSucceeds(
      setDoc(doc(como('ana'), 'usuarios/ana/documentos/d1'), documento({ updatedAt: DEPOIS, deletedAt: DEPOIS })),
    );
  });
});

describe('alteração: a mais nova vence', () => {
  test('versão mais nova substitui a anterior', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura()));

    await assertSucceeds(
      setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura({ nome: 'Nova', updatedAt: DEPOIS })),
    );
  });

  test('versão mais antiga NÃO sobrescreve uma mais nova', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura({ updatedAt: DEPOIS })));

    await assertFails(
      setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura({ nome: 'Velha', updatedAt: ANTES })),
    );
  });

  test('a data de criação não pode mudar', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura()));

    await assertFails(
      setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura({ createdAt: ANTES, updatedAt: DEPOIS })),
    );
  });

  test('o mesmo updatedAt é aceito (reenvio da mesma versão)', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura()));

    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana/assinaturas/a1'), assinatura()));
  });
});

describe('formato dos dados', () => {
  test('o marcador do servidor é obrigatório: hora escrita pelo celular é recusada', async () => {
    await assertFails(setDoc(doc(como('ana'), 'usuarios/ana'), perfil({ servidorEm: AGORA })));
  });

  test('campo que não existe no contrato é recusado', async () => {
    await assertFails(setDoc(doc(como('ana'), 'usuarios/ana'), perfil({ admin: true })));
  });

  test('campo que falta é recusado', async () => {
    const { telefone, ...semTelefone } = perfil();
    void telefone;

    await assertFails(setDoc(doc(como('ana'), 'usuarios/ana'), semTelefone));
  });

  const recusados = [
    ['perfil com CPF com letras', 'usuarios/ana', () => perfil({ cpf: '1114447773x' })],
    ['perfil com telefone curto', 'usuarios/ana', () => perfil({ telefone: '123' })],
    ['perfil sem e-mail', 'usuarios/ana', () => perfil({ email: '' })],
    ['perfil com data fora do formato', 'usuarios/ana', () => perfil({ updatedAt: '01/10/2026' })],
    ['perfil com resumo da foto com maiúsculas', 'usuarios/ana', () => perfil({ fotoSha256: 'A'.repeat(64) })],
    ['perfil com resumo da foto curto', 'usuarios/ana', () => perfil({ fotoSha256: 'abc' })],
    ['perfil com resumo da foto que não é texto', 'usuarios/ana', () => perfil({ fotoSha256: 12345 })],
    ['perfil com nome enorme', 'usuarios/ana', () => perfil({ nome: 'x'.repeat(121) })],
    [
      'assinatura sem traços',
      'usuarios/ana/assinaturas/a1',
      () => assinatura({ desenho: { tracos: [], quadro: { width: 1, height: 1 } } }),
    ],
    ['assinatura com nome enorme', 'usuarios/ana/assinaturas/a1', () => assinatura({ nome: 'x'.repeat(41) })],
    ['assinatura com id inválido', 'usuarios/ana/assinaturas/a 1', () => assinatura()],
    ['documento com título enorme', 'usuarios/ana/documentos/d1', () => documento({ titulo: 'x'.repeat(61) })],
    [
      'documento com latitude fora do mundo',
      'usuarios/ana/documentos/d1',
      () => documento({ local: { coordenadas: { latitude: 91, longitude: 0 }, cidade: null } }),
    ],
    ['documento com resumo da foto inválido', 'usuarios/ana/documentos/d1', () => documento({ fotoSha256: 'ABC' })],
    ['documento com id inválido', 'usuarios/ana/documentos/d 1', () => documento()],
  ];

  for (const [nome, caminho, dados] of recusados) {
    test(`recusa: ${nome}`, async () => {
      await assertFails(setDoc(doc(como('ana'), caminho), dados()));
    });
  }

  test('aceita: documento sem cidade, sem código e sem resumo (documento antigo)', async () => {
    await assertSucceeds(
      setDoc(
        doc(como('ana'), 'usuarios/ana/documentos/d1'),
        documento({ local: { coordenadas: { latitude: 0, longitude: 0 }, cidade: null }, codigo: null, fotoSha256: null }),
      ),
    );
  });

  test('aceita: perfil com o resumo da foto (a foto em si fica no Realtime Database)', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana'), perfil({ fotoSha256: 'a'.repeat(64) })));
  });

  test('aceita: trocar e depois remover a foto do perfil (resumo vira null)', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana'), perfil({ fotoSha256: 'a'.repeat(64) })));

    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana'), perfil({ fotoSha256: 'b'.repeat(64), updatedAt: DEPOIS })));
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana'), perfil({ fotoSha256: null, updatedAt: DEPOIS })));
  });

  test('recusa: perfil sem o campo do resumo da foto (o app sempre manda, com null quando não há foto)', async () => {
    const { fotoSha256, ...semFoto } = perfil();
    void fotoSha256;

    await assertFails(setDoc(doc(como('ana'), 'usuarios/ana'), semFoto));
  });

  test('aceita: perfil só com o e-mail (primeiro acesso em outro aparelho)', async () => {
    await assertSucceeds(setDoc(doc(como('ana'), 'usuarios/ana'), perfil({ nome: null, cpf: null, telefone: null })));
  });
});
