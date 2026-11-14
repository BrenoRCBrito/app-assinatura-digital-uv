import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { enderecosNaRede, lerConfiguracao, PORTA_PADRAO } from '../src/configuracao';

const SEGREDO = 's'.repeat(32);

describe('lerConfiguracao', () => {
  test('lê o segredo e usa a porta padrão', () => {
    assert.deepEqual(lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: SEGREDO }), {
      segredo: SEGREDO,
      porta: PORTA_PADRAO,
      enderecoNaRede: null,
      contaDeServico: null,
    });
  });

  test('lê a conta de serviço do Firebase do JSON baixado do console', () => {
    const json = JSON.stringify({
      type: 'service_account',
      project_id: 'assinaaqui',
      client_email: 'api@assinaaqui.iam.gserviceaccount.com',
      private_key: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });

    assert.deepEqual(lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: SEGREDO, FIREBASE_SERVICE_ACCOUNT: json }).contaDeServico, {
      projectId: 'assinaaqui',
      clientEmail: 'api@assinaaqui.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----\n',
    });
  });

  test('aceita a chave privada com as quebras de linha escapadas duas vezes', () => {
    const json = JSON.stringify({ project_id: 'p', client_email: 'e', private_key: 'linha1\\nlinha2' });

    const conta = lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: SEGREDO, FIREBASE_SERVICE_ACCOUNT: json }).contaDeServico;

    assert.equal(conta?.privateKey, 'linha1\nlinha2');
  });

  test('conta de serviço vazia é o mesmo que não ter: usa o SQLite local', () => {
    assert.equal(lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: SEGREDO, FIREBASE_SERVICE_ACCOUNT: ' ' }).contaDeServico, null);
  });

  test('recusa conta de serviço quebrada sem mostrar o conteúdo dela', () => {
    const quebrado = '{"private_key": "segredo-que-nao-pode-vazar"';
    const incompleto = JSON.stringify({ project_id: 'p', private_key: 'segredo-que-nao-pode-vazar' });

    for (const valor of [quebrado, incompleto, '[]', 'null']) {
      assert.throws(
        () => lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: SEGREDO, FIREBASE_SERVICE_ACCOUNT: valor }),
        (erro: Error) => /FIREBASE_SERVICE_ACCOUNT/.test(erro.message) && !erro.message.includes('segredo-que'),
      );
    }
  });

  test('leva o endereço que o script de subida informa, para o log do contêiner mostrar o IP do PC', () => {
    const ambiente = { ASSINAAQUI_HMAC_SECRET: SEGREDO, ASSINAAQUI_ENDERECO_NA_REDE: ' http://192.168.0.10:3000 ' };

    assert.equal(lerConfiguracao(ambiente).enderecoNaRede, 'http://192.168.0.10:3000');
    assert.equal(lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: SEGREDO, ASSINAAQUI_ENDERECO_NA_REDE: '' }).enderecoNaRede, null);
  });

  test('aceita outra porta pelo PORT', () => {
    assert.equal(lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: SEGREDO, PORT: '4000' }).porta, 4000);
  });

  test('recusa subir sem segredo ou com segredo curto', () => {
    assert.throws(() => lerConfiguracao({}), /ASSINAAQUI_HMAC_SECRET/);
    assert.throws(() => lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: 's'.repeat(31) }), /ASSINAAQUI_HMAC_SECRET/);
  });

  test('recusa porta inválida', () => {
    assert.throws(() => lerConfiguracao({ ASSINAAQUI_HMAC_SECRET: SEGREDO, PORT: 'abc' }), /Porta inválida/);
  });
});

describe('enderecosNaRede', () => {
  test('lista só os IPv4 externos, com a porta', () => {
    const interfaces = {
      lo: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
      wlo1: [
        { address: '192.168.0.10', family: 'IPv4', internal: false },
        { address: 'fe80::1', family: 'IPv6', internal: false },
      ],
      docker0: undefined,
    } as unknown as Parameters<typeof enderecosNaRede>[0];

    assert.deepEqual(enderecosNaRede(interfaces, 3000), ['http://192.168.0.10:3000']);
  });
});
