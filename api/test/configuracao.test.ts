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
    });
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
