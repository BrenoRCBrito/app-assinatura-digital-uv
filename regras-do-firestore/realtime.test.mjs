import { readFileSync } from 'node:fs';
import { after, before, beforeEach, describe, test } from 'node:test';

import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { get, ref, remove, set, update } from 'firebase/database';

let ambiente;

before(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'assinaaqui-regras',
    database: { rules: readFileSync('../database.rules.json', 'utf8'), host: '127.0.0.1', port: 9000 },
  });
});

after(async () => {
  await ambiente.cleanup();
});

beforeEach(async () => {
  await ambiente.clearDatabase();
});

const SHA = 'a'.repeat(64);
const foto = (extra = {}) => ({ dados: '/9j/4AAQSkZJRg==', sha256: SHA, ...extra });

const como = (uid) => ambiente.authenticatedContext(uid).database();
const anonimo = () => ambiente.unauthenticatedContext().database();

describe('acesso: só o dono', () => {
  test('sem login, nada é lido nem escrito', async () => {
    await assertFails(set(ref(anonimo(), 'fotos/ana/d1'), foto()));
    await assertFails(get(ref(anonimo(), 'fotos/ana/d1')));
  });

  test('o dono grava e lê a foto de um documento', async () => {
    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/d1'), foto()));

    const lida = await assertSucceeds(get(ref(como('ana'), 'fotos/ana/d1')));
    if (lida.val().sha256 !== SHA) throw new Error('a foto lida não é a gravada');
  });

  test('o dono lê só o resumo (sha256) sem baixar a foto', async () => {
    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/d1'), foto()));

    const resumo = await assertSucceeds(get(ref(como('ana'), 'fotos/ana/d1/sha256')));
    if (resumo.val() !== SHA) throw new Error('o resumo lido não é o gravado');
  });

  test('outra pessoa não lê nem grava a foto alheia', async () => {
    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/d1'), foto()));

    await assertFails(get(ref(como('beto'), 'fotos/ana/d1')));
    await assertFails(get(ref(como('beto'), 'fotos/ana/d1/sha256')));
    await assertFails(set(ref(como('beto'), 'fotos/ana/d2'), foto()));
    await assertFails(remove(ref(como('beto'), 'fotos/ana/d1')));
  });

  test('ninguém lista as fotos: nem a pasta da própria conta, nem a de todos', async () => {
    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/d1'), foto()));

    await assertFails(get(ref(como('ana'), 'fotos/ana')));
    await assertFails(get(ref(como('ana'), 'fotos')));
    await assertFails(get(ref(como('ana'), '/')));
  });

  test('qualquer outro caminho é negado, mesmo para quem está logado', async () => {
    await assertFails(set(ref(como('ana'), 'outro/x'), { a: 1 }));
    await assertFails(get(ref(como('ana'), 'outro/x')));
  });
});

describe('a foto não é alterada, só criada ou apagada', () => {
  test('não sobrescreve uma foto que já existe', async () => {
    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/d1'), foto()));

    await assertFails(set(ref(como('ana'), 'fotos/ana/d1'), foto({ dados: 'outra' })));
  });

  test('não altera só um campo de uma foto que já existe', async () => {
    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/d1'), foto()));

    await assertFails(set(ref(como('ana'), 'fotos/ana/d1/dados'), 'trocada'));
    await assertFails(update(ref(como('ana'), 'fotos/ana/d1'), { sha256: 'b'.repeat(64) }));
  });

  test('o dono apaga a foto, e depois pode gravá-la de novo', async () => {
    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/d1'), foto()));

    await assertSucceeds(remove(ref(como('ana'), 'fotos/ana/d1')));

    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/d1'), foto()));
  });

  test('apagar uma foto que não existe não dá erro', async () => {
    await assertSucceeds(remove(ref(como('ana'), 'fotos/ana/nao-existe')));
  });
});

describe('formato dos dados', () => {
  const recusados = [
    ['sem o resumo', 'fotos/ana/d1', () => ({ dados: 'abc' })],
    ['sem a foto', 'fotos/ana/d1', () => ({ sha256: SHA })],
    ['foto vazia', 'fotos/ana/d1', () => foto({ dados: '' })],
    ['foto que não é texto', 'fotos/ana/d1', () => foto({ dados: 123 })],
    ['resumo com maiúsculas', 'fotos/ana/d1', () => foto({ sha256: 'A'.repeat(64) })],
    ['resumo curto', 'fotos/ana/d1', () => foto({ sha256: 'abc' })],
    ['campo extra', 'fotos/ana/d1', () => foto({ extra: 'x' })],
    ['id inválido', 'fotos/ana/d 1', () => foto()],
    ['foto acima do limite', 'fotos/ana/d1', () => foto({ dados: 'a'.repeat(9000001) })],
  ];

  for (const [nome, caminho, dados] of recusados) {
    test(`recusa: ${nome}`, async () => {
      await assertFails(set(ref(como('ana'), caminho), dados()));
    });
  }

  test('aceita uma foto de vários megabytes (dentro do limite)', async () => {
    await assertSucceeds(set(ref(como('ana'), 'fotos/ana/grande'), foto({ dados: 'a'.repeat(4000000) })));
  });
});
