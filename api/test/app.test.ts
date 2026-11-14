import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterEach, beforeEach, describe, test } from 'node:test';

import { criarApp } from '../src/app';
import type { Banco } from '../src/banco';
import { abrirBancoSqlite } from '../src/bancoSqlite';
import { criarCarimbo } from '../src/carimbo';
import { codigoCurtoDeBytes, formatarCodigoCurto } from '../src/domain/codigoCurto';
import { documentoOpenApi } from '../src/openapi';
import { CAMPOS_DO_VETOR, CODIGO_IMPRESSO_PELO_APP, SEGREDO_DO_VETOR } from './vetor';

const CAMPOS = [
  { chave: 'id', valor: '1757680000000' },
  { chave: 'email', valor: 'breno@exemplo.com' },
  { chave: 'cpf', valor: '***.456.789-**' },
  { chave: 'titulo', valor: 'Contrato de locação' },
  { chave: 'em', valor: '2026-09-12T14:32:00.000Z' },
  { chave: 'local', valor: '-22.40418,-43.66283' },
  { chave: 'foto', valor: 'a'.repeat(64) },
];
const BYTES_A = Uint8Array.from([0x3a, 0x91, 0xc4, 0x7f, 0x02, 0xe8, 0x55, 0xb6]);
const BYTES_B = Uint8Array.from([0x08, 0, 0, 0, 0, 0, 0, 0]);
const CODIGO_A = formatarCodigoCurto(codigoCurtoDeBytes(BYTES_A));
const CODIGO_B = formatarCodigoCurto(codigoCurtoDeBytes(BYTES_B));

let pasta: string;
let banco: Banco;
let servidor: Server;
let base: string;
let sorteios: Uint8Array[];

beforeEach(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'assinaaqui-api-'));
  banco = abrirBancoSqlite(join(pasta, 'teste.db'));
  sorteios = [BYTES_A, BYTES_B];
  const app = criarApp({
    banco,
    carimbo: criarCarimbo(SEGREDO_DO_VETOR),
    gerarBytes: () => sorteios.shift() ?? BYTES_B,
    agora: () => new Date('2026-11-11T12:00:00.000Z'),
  });
  servidor = app.listen(0, '127.0.0.1');
  await once(servidor, 'listening');
  base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
});

afterEach(async () => {
  servidor.closeAllConnections();
  servidor.close();
  await once(servidor, 'close');
  await banco.fechar();
  rmSync(pasta, { recursive: true, force: true });
});

function enviar(caminho: string, corpo: unknown): Promise<Response> {
  return fetch(`${base}${caminho}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo),
  });
}

function alterarNoBanco(sql: string): void {
  const direto = new DatabaseSync(join(pasta, 'teste.db'));
  direto.exec(sql);
  direto.close();
}

describe('GET /saude', () => {
  test('responde que está no ar', async () => {
    const resposta = await fetch(`${base}/saude`);

    assert.equal(resposta.status, 200);
    assert.deepEqual(await resposta.json(), { ok: true });
  });
});

describe('POST /documentos', () => {
  test('registra os campos e devolve o código curto', async () => {
    const resposta = await enviar('/documentos', { campos: CAMPOS });

    assert.equal(resposta.status, 201);
    assert.deepEqual(await resposta.json(), { codigo: CODIGO_A });
  });

  test('sorteia outro código quando o primeiro já existe', async () => {
    await enviar('/documentos', { campos: CAMPOS });
    sorteios = [BYTES_A, BYTES_B];

    const resposta = await enviar('/documentos', { campos: CAMPOS });

    assert.deepEqual(await resposta.json(), { codigo: CODIGO_B });
  });

  const invalidos: ReadonlyArray<readonly [string, unknown]> = [
    ['sem campos', {}],
    ['campos que não são lista', { campos: 'id=1' }],
    ['lista vazia', { campos: [] }],
    ['valor que não é texto', { campos: [{ chave: 'id', valor: 1 }] }],
    ['chave repetida', { campos: [CAMPOS[0], CAMPOS[0]] }],
    ['chave fora do formato', { campos: [{ chave: 'Titulo', valor: 'x' }] }],
    ['chave reservada ao servidor', { campos: [...CAMPOS, { chave: 'codigo', valor: 'x' }] }],
  ];
  for (const [caso, corpo] of invalidos) {
    test(`recusa ${caso} com 400`, async () => {
      const resposta = await enviar('/documentos', corpo);

      assert.equal(resposta.status, 400);
      assert.equal(typeof ((await resposta.json()) as { erro: unknown }).erro, 'string');
    });
  }

  test('recusa corpo que não é JSON com 400 em JSON', async () => {
    const resposta = await enviar('/documentos', '{"campos":');

    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: 'Pedido inválido.' });
  });

  test('recusa corpo acima de 16 kB com 413', async () => {
    const resposta = await enviar('/documentos', { campos: [{ chave: 'titulo', valor: 'x'.repeat(17 * 1024) }] });

    assert.equal(resposta.status, 413);
  });
});

describe('GET /documentos/:codigo', () => {
  test('devolve os campos de um código emitido, como foi digitado ou em minúsculas', async () => {
    await enviar('/documentos', { campos: CAMPOS });

    for (const digitado of [CODIGO_A, CODIGO_A.toLowerCase().replaceAll('-', '')]) {
      const resposta = await fetch(`${base}/documentos/${digitado}`);

      assert.equal(resposta.status, 200);
      assert.deepEqual(await resposta.json(), { veredicto: 'autentico', campos: CAMPOS });
    }
  });

  test('código inexistente devolve 404', async () => {
    const resposta = await fetch(`${base}/documentos/${CODIGO_B}`);

    assert.equal(resposta.status, 404);
    assert.deepEqual(await resposta.json(), { erro: 'Código não encontrado.' });
  });

  test('código malformado devolve 400', async () => {
    const resposta = await fetch(`${base}/documentos/abc`);

    assert.equal(resposta.status, 400);
    assert.deepEqual(await resposta.json(), { erro: 'Código malformado.' });
  });

  test('linha alterada direto no banco aparece como adulterada', async () => {
    await enviar('/documentos', { campos: CAMPOS });
    alterarNoBanco("UPDATE documentos SET campos = replace(campos, 'locação', 'compra')");

    const resposta = await fetch(`${base}/documentos/${CODIGO_A}`);

    assert.deepEqual(await resposta.json(), { veredicto: 'adulterado' });
  });

  test('campos ilegíveis no banco também aparecem como adulterados', async () => {
    await enviar('/documentos', { campos: CAMPOS });
    alterarNoBanco("UPDATE documentos SET campos = '[{\"chave\":\"Titulo\",\"valor\":\"x\"}]'");

    const resposta = await fetch(`${base}/documentos/${CODIGO_A}`);

    assert.deepEqual(await resposta.json(), { veredicto: 'adulterado' });
  });
});

describe('POST /validacoes', () => {
  test('código AA1 impresso pelo app até a v0.9.0 é autêntico', async () => {
    const resposta = await enviar('/validacoes', { codigo: CODIGO_IMPRESSO_PELO_APP });

    assert.deepEqual(await resposta.json(), {
      veredicto: 'autentico',
      campos: CAMPOS_DO_VETOR,
      versaoMaisNova: false,
    });
  });

  test('código AA1 alterado não é autêntico', async () => {
    const resposta = await enviar('/validacoes', { codigo: CODIGO_IMPRESSO_PELO_APP.replace('Contrato', 'Contrata') });

    assert.deepEqual(await resposta.json(), { veredicto: 'adulterado' });
  });

  test('texto que não é código AA1 é ilegível', async () => {
    const resposta = await enviar('/validacoes', { codigo: 'https://exemplo.com' });

    assert.deepEqual(await resposta.json(), { veredicto: 'ilegivel' });
  });

  test('sem código devolve 400', async () => {
    const resposta = await enviar('/validacoes', {});

    assert.equal(resposta.status, 400);
  });
});

describe('documentação', () => {
  test('publica o OpenAPI com as rotas da API', async () => {
    const resposta = await fetch(`${base}/openapi.json`);

    assert.equal(resposta.status, 200);
    const documento = (await resposta.json()) as {
      openapi: string;
      info: { title: string };
      paths: Record<string, Record<string, unknown>>;
    };
    assert.equal(documento.openapi, '3.0.3');
    assert.equal(documento.info.title, 'API do AssinaAqui');
    assert.deepEqual(rotasDoOpenApi(documento.paths), [
      'GET /documentos/{codigo}',
      'GET /saude',
      'POST /documentos',
      'POST /validacoes',
    ]);
  });

  test('toda rota da API está documentada', () => {
    const app = criarApp({
      banco,
      carimbo: criarCarimbo(SEGREDO_DO_VETOR),
      gerarBytes: () => BYTES_A,
      agora: () => new Date(),
    });
    const camadas = (app.router as unknown as { stack: { route?: { path: string; methods: Record<string, boolean> } }[] })
      .stack;
    const rotas = camadas
      .flatMap((camada) => (camada.route === undefined ? [] : [camada.route]))
      .filter((rota) => rota.path !== '/openapi.json')
      .flatMap((rota) =>
        Object.keys(rota.methods).map((metodo) => `${metodo.toUpperCase()} ${rota.path.replace(/:(\w+)/g, '{$1}')}`),
      )
      .sort();

    assert.deepEqual(rotas, rotasDoOpenApi(documentoOpenApi.paths));
  });

  test('serve o Swagger UI em /docs', async () => {
    const resposta = await fetch(`${base}/docs/`);

    assert.equal(resposta.status, 200);
    assert.match(resposta.headers.get('content-type') ?? '', /text\/html/);
    assert.match(await resposta.text(), /swagger-ui/i);
  });
});

function rotasDoOpenApi(caminhos: Record<string, Record<string, unknown>>): string[] {
  return Object.entries(caminhos)
    .flatMap(([caminho, metodos]) => Object.keys(metodos).map((metodo) => `${metodo.toUpperCase()} ${caminho}`))
    .sort();
}
