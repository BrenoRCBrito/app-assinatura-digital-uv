import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { criarCarimbo } from '../src/carimbo';
import { ValidationError } from '../src/domain/brand';
import {
  BYTES_DO_CODIGO_CURTO,
  codigoCurtoDeBytes,
  criarCodigoCurto,
  formatarCodigoCurto,
} from '../src/domain/codigoCurto';
import { conferirCodigoAntigo, serializarCampos, type CampoDoCodigo } from '../src/domain/codigoDeAutenticidade';
import { CAMPOS_DO_VETOR, CODIGO_IMPRESSO_PELO_APP, SEGREDO_DO_VETOR } from './vetor';

const carimbo = criarCarimbo(SEGREDO_DO_VETOR);

function emitir(campos: readonly CampoDoCodigo[]): string {
  const mensagem = serializarCampos(campos);
  return `${mensagem}#${carimbo.carimbar(mensagem)}`;
}

function trocarOUltimoCaractere(texto: string): string {
  return `${texto.slice(0, -1)}${texto.endsWith('A') ? 'B' : 'A'}`;
}

describe('criarCodigoCurto', () => {
  test('aceita o código impresso, com os hífens', () => {
    assert.equal(criarCodigoCurto('7K3F-9QXZ-M2P4'), '7K3F9QXZM2P4');
  });

  test('aceita minúsculas, espaços e quebras de linha', () => {
    assert.equal(criarCodigoCurto(' 7k3f 9qxz\nm2p4 '), '7K3F9QXZM2P4');
  });

  test('lê O como zero e I ou L como um', () => {
    assert.equal(criarCodigoCurto('7K3F-9QXZ-MOIL'), '7K3F9QXZM011');
  });

  for (const texto of ['7K3F-9QXZ-M2P', '7K3F-9QXZ-M2P45', '7K3F-9QXZ-M2PU', '7K3F_9QXZ_M2P4', '']) {
    test(`recusa ${JSON.stringify(texto)}`, () => {
      assert.throws(() => criarCodigoCurto(texto), ValidationError);
    });
  }
});

describe('formatarCodigoCurto', () => {
  test('separa em três grupos de quatro', () => {
    assert.equal(formatarCodigoCurto(criarCodigoCurto('7K3F9QXZM2P4')), '7K3F-9QXZ-M2P4');
  });
});

describe('codigoCurtoDeBytes', () => {
  test('usa os 60 primeiros bits, cinco por símbolo', () => {
    assert.equal(codigoCurtoDeBytes(new Uint8Array(BYTES_DO_CODIGO_CURTO)), '000000000000');
    assert.equal(codigoCurtoDeBytes(new Uint8Array(BYTES_DO_CODIGO_CURTO).fill(0xff)), 'ZZZZZZZZZZZZ');
    assert.equal(codigoCurtoDeBytes(new Uint8Array([0x08, 0, 0, 0, 0, 0, 0, 0])), '100000000000');
  });

  test('só usa símbolos do alfabeto de Crockford, que a leitura aceita de volta', () => {
    const codigo = codigoCurtoDeBytes(new Uint8Array([0x3a, 0x91, 0xc4, 0x7f, 0x02, 0xe8, 0x55, 0xb6]));

    assert.match(codigo, /^[0-9A-HJKMNP-TV-Z]{12}$/);
    assert.equal(criarCodigoCurto(codigo), codigo);
  });

  test('recusa menos de 8 bytes', () => {
    assert.throws(() => codigoCurtoDeBytes(new Uint8Array(7)), ValidationError);
  });
});

describe('serializarCampos', () => {
  test('serializa com o prefixo de versão e os valores percent-encoded', () => {
    assert.equal(serializarCampos([{ chave: 'titulo', valor: 'A;B=C%D#E ç' }]), 'AA1;titulo=A%3BB%3DC%25D%23E%20%C3%A7');
  });

  test('serializa os campos como o app serializava até a v0.9.0', () => {
    const mensagem = CODIGO_IMPRESSO_PELO_APP.slice(0, CODIGO_IMPRESSO_PELO_APP.lastIndexOf('#'));

    assert.equal(serializarCampos(CAMPOS_DO_VETOR), mensagem);
  });

  test('recusa chave repetida ou fora do formato', () => {
    assert.throws(
      () =>
        serializarCampos([
          { chave: 'id', valor: '1' },
          { chave: 'id', valor: '2' },
        ]),
      /Campo inválido/,
    );
    assert.throws(() => serializarCampos([{ chave: 'meu campo', valor: '1' }]), /Campo inválido/);
  });
});

describe('conferirCodigoAntigo', () => {
  test('confere um código impresso pelo app até a v0.9.0', () => {
    assert.deepEqual(conferirCodigoAntigo(CODIGO_IMPRESSO_PELO_APP, carimbo.confere), {
      tipo: 'autentico',
      campos: CAMPOS_DO_VETOR,
      versaoMaisNova: false,
    });
  });

  test('espaço ou quebra de linha em volta do texto lido não atrapalha', () => {
    assert.equal(conferirCodigoAntigo(`  ${CODIGO_IMPRESSO_PELO_APP}\n`, carimbo.confere).tipo, 'autentico');
  });

  const ilegiveis: ReadonlyArray<readonly [string, string]> = [
    ['texto sem carimbo', 'AA1;id=1'],
    ['endereço de site', 'https://exemplo.com/documento'],
    ['prefixo de outro formato', 'XX1;id=1#abc'],
    ['carimbo vazio', 'AA1;id=1#'],
    ['texto vazio', ''],
  ];
  for (const [caso, texto] of ilegiveis) {
    test(`${caso} é ilegível`, () => {
      assert.deepEqual(conferirCodigoAntigo(texto, carimbo.confere), { tipo: 'ilegivel' });
    });
  }

  test('carimbo com um caractere trocado é adulterado', () => {
    const trocado = trocarOUltimoCaractere(CODIGO_IMPRESSO_PELO_APP);

    assert.deepEqual(conferirCodigoAntigo(trocado, carimbo.confere), { tipo: 'adulterado' });
  });

  test('título alterado depois de emitido é adulterado', () => {
    const alterado = CODIGO_IMPRESSO_PELO_APP.replace('Contrato', 'Contrata');

    assert.notEqual(alterado, CODIGO_IMPRESSO_PELO_APP);
    assert.deepEqual(conferirCodigoAntigo(alterado, carimbo.confere), { tipo: 'adulterado' });
  });

  test('carimbo de outro segredo não confere', () => {
    const outro = criarCarimbo('outro-segredo-com-pelo-menos-32-caracteres');

    assert.deepEqual(conferirCodigoAntigo(CODIGO_IMPRESSO_PELO_APP, outro.confere), { tipo: 'adulterado' });
  });

  test('título com separadores, percentual, cerquilha e acentos faz a ida e a volta sem perda', () => {
    const campos = [{ chave: 'titulo', valor: 'Aditivo; cláusula 3=B, 50% #2 ação' }];

    assert.deepEqual(conferirCodigoAntigo(emitir(campos), carimbo.confere), {
      tipo: 'autentico',
      campos,
      versaoMaisNova: false,
    });
  });

  test('campo desconhecido é carimbado e preservado', () => {
    const campos = [...CAMPOS_DO_VETOR, { chave: 'nome', valor: 'Breno' }];

    assert.deepEqual(conferirCodigoAntigo(emitir(campos), carimbo.confere), {
      tipo: 'autentico',
      campos,
      versaoMaisNova: false,
    });
  });

  test('código de uma versão mais nova é autêntico e avisa a versão', () => {
    const mensagem = 'AA2;id=1757680000000;cpf=000';

    assert.deepEqual(conferirCodigoAntigo(`${mensagem}#${carimbo.carimbar(mensagem)}`, carimbo.confere), {
      tipo: 'autentico',
      campos: [
        { chave: 'id', valor: '1757680000000' },
        { chave: 'cpf', valor: '000' },
      ],
      versaoMaisNova: true,
    });
  });
});
