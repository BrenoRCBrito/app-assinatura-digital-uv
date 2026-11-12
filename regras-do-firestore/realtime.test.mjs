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
const arquivo = (extra = {}) => ({ dados: '/9j/4AAQSkZJRg==', sha256: SHA, ...extra });

const como = (uid) => ambiente.authenticatedContext(uid).database();
const anonimo = () => ambiente.unauthenticatedContext().database();

for (const tipo of ['foto', 'pdf']) {
  describe(`acesso: só o dono (${tipo})`, () => {
    const caminho = `arquivos/ana/d1/${tipo}`;

    test('sem login, nada é lido nem escrito', async () => {
      await assertFails(set(ref(anonimo(), caminho), arquivo()));
      await assertFails(get(ref(anonimo(), caminho)));
    });

    test('o dono grava e lê o arquivo', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      const lido = await assertSucceeds(get(ref(como('ana'), caminho)));
      if (lido.val().sha256 !== SHA) throw new Error('o arquivo lido não é o gravado');
    });

    test('o dono lê só o resumo (sha256) sem baixar o arquivo', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      const resumo = await assertSucceeds(get(ref(como('ana'), `${caminho}/sha256`)));
      if (resumo.val() !== SHA) throw new Error('o resumo lido não é o gravado');
    });

    test('outra pessoa não lê nem grava o arquivo alheio', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertFails(get(ref(como('beto'), caminho)));
      await assertFails(get(ref(como('beto'), `${caminho}/sha256`)));
      await assertFails(set(ref(como('beto'), `arquivos/ana/d2/${tipo}`), arquivo()));
      await assertFails(remove(ref(como('beto'), caminho)));
    });
  });

  describe(`o arquivo não é alterado, só criado ou apagado (${tipo})`, () => {
    const caminho = `arquivos/ana/d1/${tipo}`;

    test('não sobrescreve um arquivo que já existe', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertFails(set(ref(como('ana'), caminho), arquivo({ dados: 'outro' })));
    });

    test('não altera só um campo de um arquivo que já existe', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertFails(set(ref(como('ana'), `${caminho}/dados`), 'trocado'));
      await assertFails(update(ref(como('ana'), caminho), { sha256: 'b'.repeat(64) }));
    });

    test('o dono apaga o arquivo, e depois pode gravá-lo de novo', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertSucceeds(remove(ref(como('ana'), caminho)));

      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));
    });

    test('apagar um arquivo que não existe não dá erro', async () => {
      await assertSucceeds(remove(ref(como('ana'), `arquivos/ana/nao-existe/${tipo}`)));
    });
  });
}

describe('foto e PDF do mesmo documento', () => {
  test('convivem: cada um no seu lugar, sem um sobrescrever o outro', async () => {
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/d1/foto'), arquivo({ dados: 'foto' })));
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/d1/pdf'), arquivo({ dados: 'pdf' })));

    const foto = await get(ref(como('ana'), 'arquivos/ana/d1/foto/dados'));
    const pdf = await get(ref(como('ana'), 'arquivos/ana/d1/pdf/dados'));
    if (foto.val() !== 'foto' || pdf.val() !== 'pdf') throw new Error('foto e PDF se misturaram');
  });

  test('apagar um não apaga o outro', async () => {
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/d1/foto'), arquivo()));
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/d1/pdf'), arquivo()));

    await assertSucceeds(remove(ref(como('ana'), 'arquivos/ana/d1/pdf')));

    await assertSucceeds(get(ref(como('ana'), 'arquivos/ana/d1/foto')));
  });
});

describe('ninguém lista', () => {
  test('nem o documento, nem a pasta da conta, nem a de todos', async () => {
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/d1/foto'), arquivo()));

    await assertFails(get(ref(como('ana'), 'arquivos/ana/d1')));
    await assertFails(get(ref(como('ana'), 'arquivos/ana')));
    await assertFails(get(ref(como('ana'), 'arquivos')));
    await assertFails(get(ref(como('ana'), '/')));
  });

  test('qualquer outro caminho é negado, mesmo para quem está logado', async () => {
    await assertFails(set(ref(como('ana'), 'outro/x'), { a: 1 }));
    await assertFails(get(ref(como('ana'), 'outro/x')));
    await assertFails(set(ref(como('ana'), 'fotos/ana/d1'), arquivo()));
  });
});

describe('formato dos dados', () => {
  const recusados = [
    ['sem o resumo', 'arquivos/ana/d1/foto', () => ({ dados: 'abc' })],
    ['sem o conteúdo', 'arquivos/ana/d1/foto', () => ({ sha256: SHA })],
    ['conteúdo vazio', 'arquivos/ana/d1/foto', () => arquivo({ dados: '' })],
    ['conteúdo que não é texto', 'arquivos/ana/d1/pdf', () => arquivo({ dados: 123 })],
    ['resumo com maiúsculas', 'arquivos/ana/d1/pdf', () => arquivo({ sha256: 'A'.repeat(64) })],
    ['resumo curto', 'arquivos/ana/d1/pdf', () => arquivo({ sha256: 'abc' })],
    ['campo extra', 'arquivos/ana/d1/foto', () => arquivo({ extra: 'x' })],
    ['tipo que não é foto nem pdf', 'arquivos/ana/d1/video', () => arquivo()],
    ['id inválido', 'arquivos/ana/d 1/foto', () => arquivo()],
    ['foto acima do limite', 'arquivos/ana/d1/foto', () => arquivo({ dados: 'a'.repeat(9000001) })],
    ['PDF acima do limite', 'arquivos/ana/d1/pdf', () => arquivo({ dados: 'a'.repeat(9000001) })],
  ];

  for (const [nome, caminho, dados] of recusados) {
    test(`recusa: ${nome}`, async () => {
      await assertFails(set(ref(como('ana'), caminho), dados()));
    });
  }

  test('aceita arquivos de vários megabytes (dentro do limite)', async () => {
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/grande/foto'), arquivo({ dados: 'a'.repeat(4000000) })));
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/grande/pdf'), arquivo({ dados: 'a'.repeat(4000000) })));
  });
});
