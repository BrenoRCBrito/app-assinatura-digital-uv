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

  describe(`criar e atualizar sim, apagar nunca (${tipo})`, () => {
    const caminho = `arquivos/ana/d1/${tipo}`;

    test('o dono atualiza o arquivo com um conteúdo novo', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertSucceeds(set(ref(como('ana'), caminho), arquivo({ dados: 'novo', sha256: 'b'.repeat(64) })));

      const lido = await get(ref(como('ana'), caminho));
      if (lido.val().dados !== 'novo') throw new Error('a atualização não foi gravada');
    });

    test('o dono atualiza só um campo', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertSucceeds(set(ref(como('ana'), `${caminho}/dados`), 'trocado'));
      await assertSucceeds(update(ref(como('ana'), caminho), { sha256: 'b'.repeat(64) }));
    });

    test('atualização com formato inválido continua recusada', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertFails(set(ref(como('ana'), caminho), arquivo({ sha256: 'curto' })));
      await assertFails(set(ref(como('ana'), `${caminho}/dados`), ''));
    });

    test('outra pessoa não atualiza o arquivo alheio', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertFails(set(ref(como('beto'), caminho), arquivo({ dados: 'invasor' })));
    });

    test('ninguém apaga o arquivo, nem o dono, e ele continua lá', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertFails(remove(ref(como('ana'), caminho)));
      await assertFails(remove(ref(como('beto'), caminho)));

      const lido = await assertSucceeds(get(ref(como('ana'), caminho)));
      if (lido.val().sha256 !== SHA) throw new Error('o arquivo sumiu');
    });

    test('apagar escrevendo vazio (null), no arquivo ou em um campo, também é recusado', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertFails(set(ref(como('ana'), caminho), null));
      await assertFails(set(ref(como('ana'), `${caminho}/dados`), null));
      await assertFails(update(ref(como('ana'), caminho), { dados: null }));
    });

    test('apagar uma pasta acima, do documento, da conta ou de tudo, também é recusado', async () => {
      await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

      await assertFails(remove(ref(como('ana'), 'arquivos/ana/d1')));
      await assertFails(remove(ref(como('ana'), 'arquivos/ana')));
      await assertFails(remove(ref(como('ana'), 'arquivos')));
      await assertFails(remove(ref(como('ana'), '/')));
    });

    test('apagar um arquivo que não existe também é recusado', async () => {
      await assertFails(remove(ref(como('ana'), `arquivos/ana/nao-existe/${tipo}`)));
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

  test('nenhum dos dois pode ser apagado, e os dois continuam lá', async () => {
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/d1/foto'), arquivo()));
    await assertSucceeds(set(ref(como('ana'), 'arquivos/ana/d1/pdf'), arquivo()));

    await assertFails(remove(ref(como('ana'), 'arquivos/ana/d1/pdf')));
    await assertFails(remove(ref(como('ana'), 'arquivos/ana/d1/foto')));

    await assertSucceeds(get(ref(como('ana'), 'arquivos/ana/d1/foto')));
    await assertSucceeds(get(ref(como('ana'), 'arquivos/ana/d1/pdf')));
  });
});

describe('foto de perfil (arquivos/{uid}/perfil/foto)', () => {
  const caminho = 'arquivos/ana/perfil/foto';

  test('o dono grava, lê e troca a foto de perfil', async () => {
    await assertSucceeds(set(ref(como('ana'), caminho), arquivo({ dados: 'primeira' })));
    await assertSucceeds(set(ref(como('ana'), caminho), arquivo({ dados: 'segunda', sha256: 'b'.repeat(64) })));

    const lida = await assertSucceeds(get(ref(como('ana'), caminho)));
    if (lida.val().dados !== 'segunda') throw new Error('a foto trocada não foi gravada');
  });

  test('a foto de perfil é a única que pode ser apagada: o dono a remove (ela muda com frequência)', async () => {
    await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

    await assertSucceeds(remove(ref(como('ana'), caminho)));

    const lida = await get(ref(como('ana'), caminho));
    if (lida.exists()) throw new Error('a foto de perfil continuou na nuvem');
  });

  test('depois de removida, o dono pode gravar outra foto de perfil', async () => {
    await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));
    await assertSucceeds(remove(ref(como('ana'), caminho)));

    await assertSucceeds(set(ref(como('ana'), caminho), arquivo({ dados: 'nova' })));
  });

  test('apagar a foto de perfil que não existe não dá erro', async () => {
    await assertSucceeds(remove(ref(como('ana'), caminho)));
  });

  test('outra pessoa não apaga a foto de perfil alheia', async () => {
    await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

    await assertFails(remove(ref(como('beto'), caminho)));
    await assertFails(set(ref(como('beto'), caminho), null));
  });

  test('a exceção é só da foto: as pastas acima e um PDF de perfil continuam sem poder ser apagados ou criados', async () => {
    await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

    await assertFails(remove(ref(como('ana'), 'arquivos/ana/perfil')));
    await assertFails(remove(ref(como('ana'), 'arquivos/ana')));
    await assertFails(remove(ref(como('ana'), 'arquivos')));
    await assertFails(set(ref(como('ana'), 'arquivos/ana/perfil/pdf'), arquivo()));
  });

  test('outra pessoa não lê nem troca a foto de perfil alheia', async () => {
    await assertSucceeds(set(ref(como('ana'), caminho), arquivo()));

    await assertFails(get(ref(como('beto'), caminho)));
    await assertFails(set(ref(como('beto'), caminho), arquivo({ dados: 'invasor' })));
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
