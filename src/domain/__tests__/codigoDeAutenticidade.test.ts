/// <reference types="node" />
import { createHmac } from 'node:crypto';

import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import {
  camposDoDocumento,
  camposParaExibir,
  emitirCodigo,
  serializarCampos,
  validarCodigo,
  type CampoDoCodigo,
  type Carimbar,
} from '../codigoDeAutenticidade';
import { createIsoDateTime } from '../dateTime';
import { criarTituloDocumento } from '../documento';
import { formatDateTime } from '../format';
import { criarCpf, criarEmail, criarTelefone } from '../usuario';

const carimbar: Carimbar = async (mensagem) =>
  createHmac('sha256', 'segredo-de-teste').update(mensagem).digest('base64url');
const EMAIL = criarEmail('breno@exemplo.com');
const TITULAR = { email: EMAIL, cpf: null, telefone: null };
const TITULAR_COMPLETO = {
  email: EMAIL,
  cpf: criarCpf('123.456.789-09'),
  telefone: criarTelefone('(11) 98765-4321'),
};
const RESUMO_DA_FOTO = 'a'.repeat(64);
const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');

function trocarOUltimoCaractere(texto: string): string {
  const trocado = texto.endsWith('A') ? 'B' : 'A';
  return `${texto.slice(0, -1)}${trocado}`;
}

describe('código de autenticidade', () => {
  test('monta os campos do documento na ordem da v1', () => {
    expect(camposDoDocumento(DOCUMENTO, TITULAR, RESUMO_DA_FOTO)).toEqual([
      { chave: 'id', valor: '1757680000000' },
      { chave: 'email', valor: 'breno@exemplo.com' },
      { chave: 'titulo', valor: 'Contrato de locação' },
      { chave: 'em', valor: '2026-09-12T14:32:00.000Z' },
      { chave: 'local', valor: '-22.40418,-43.66283' },
      { chave: 'foto', valor: RESUMO_DA_FOTO },
    ]);
  });

  test('com CPF e telefone na conta, acrescenta os dois mascarados logo depois do e-mail', () => {
    expect(camposDoDocumento(DOCUMENTO, TITULAR_COMPLETO, RESUMO_DA_FOTO).slice(1, 4)).toEqual([
      { chave: 'email', valor: 'breno@exemplo.com' },
      { chave: 'cpf', valor: '***.456.789-**' },
      { chave: 'telefone', valor: '(**) *****-4321' },
    ]);
  });

  test('telefone fixo, com dez dígitos, também sai mascarado', () => {
    const titular = { ...TITULAR, telefone: criarTelefone('(11) 3333-4321') };

    expect(camposDoDocumento(DOCUMENTO, titular, RESUMO_DA_FOTO)).toContainEqual({
      chave: 'telefone',
      valor: '(**) ****-4321',
    });
  });

  test('o código emitido não carrega o CPF nem o telefone inteiros', async () => {
    const codigo = await emitirCodigo(camposDoDocumento(DOCUMENTO, TITULAR_COMPLETO, RESUMO_DA_FOTO), carimbar);

    expect(codigo).not.toContain('12345678909');
    expect(codigo).not.toContain('98765');
    await expect(validarCodigo(codigo, carimbar)).resolves.toMatchObject({ tipo: 'autentico' });
  });

  test('serializa com o prefixo de versão e os valores percent-encoded', () => {
    expect(serializarCampos([{ chave: 'titulo', valor: 'A;B=C%D#E ç' }])).toBe('AA1;titulo=A%3BB%3DC%25D%23E%20%C3%A7');
  });

  test('o código emitido volta autêntico com os mesmos campos', async () => {
    const campos = camposDoDocumento(DOCUMENTO, TITULAR, RESUMO_DA_FOTO);
    const codigo = await emitirCodigo(campos, carimbar);

    await expect(validarCodigo(codigo, carimbar)).resolves.toEqual({
      tipo: 'autentico',
      campos,
      versaoMaisNova: false,
    });
  });

  test('título com separadores, percentual, cerquilha e acentos faz a ida e a volta sem perda', async () => {
    const titulo = criarTituloDocumento('Aditivo; cláusula 3=B, 50% #2 ação');
    const campos = camposDoDocumento({ ...DOCUMENTO, titulo }, TITULAR, RESUMO_DA_FOTO);

    await expect(validarCodigo(await emitirCodigo(campos, carimbar), carimbar)).resolves.toEqual({
      tipo: 'autentico',
      campos,
      versaoMaisNova: false,
    });
  });

  test('espaço ou quebra de linha em volta do texto lido não atrapalha', async () => {
    const codigo = await emitirCodigo(camposDoDocumento(DOCUMENTO, TITULAR, RESUMO_DA_FOTO), carimbar);

    await expect(validarCodigo(`  ${codigo}\n`, carimbar)).resolves.toMatchObject({ tipo: 'autentico' });
  });

  test.each([
    ['texto sem carimbo', 'AA1;id=1'],
    ['endereço de site', 'https://exemplo.com/documento'],
    ['prefixo de outro formato', 'XX1;id=1#abc'],
    ['carimbo vazio', 'AA1;id=1#'],
    ['texto vazio', ''],
  ])('%s é ilegível', async (_caso, texto) => {
    await expect(validarCodigo(texto, carimbar)).resolves.toEqual({ tipo: 'ilegivel' });
  });

  test('carimbo com um caractere trocado é adulterado', async () => {
    const codigo = await emitirCodigo(camposDoDocumento(DOCUMENTO, TITULAR, RESUMO_DA_FOTO), carimbar);

    await expect(validarCodigo(trocarOUltimoCaractere(codigo), carimbar)).resolves.toEqual({ tipo: 'adulterado' });
  });

  test('título alterado depois de emitido é adulterado', async () => {
    const codigo = await emitirCodigo(camposDoDocumento(DOCUMENTO, TITULAR, RESUMO_DA_FOTO), carimbar);
    const alterado = codigo.replace('Contrato', 'Contrata');

    expect(alterado).not.toBe(codigo);
    await expect(validarCodigo(alterado, carimbar)).resolves.toEqual({ tipo: 'adulterado' });
  });

  test('campo desconhecido é carimbado e preservado', async () => {
    const campos: readonly CampoDoCodigo[] = [
      ...camposDoDocumento(DOCUMENTO, TITULAR, RESUMO_DA_FOTO),
      { chave: 'nome', valor: 'Breno' },
    ];

    await expect(validarCodigo(await emitirCodigo(campos, carimbar), carimbar)).resolves.toEqual({
      tipo: 'autentico',
      campos,
      versaoMaisNova: false,
    });
  });

  test('código de uma versão mais nova é autêntico e avisa a versão', async () => {
    const mensagem = 'AA2;id=1757680000000;cpf=000';
    const codigo = `${mensagem}#${await carimbar(mensagem)}`;

    await expect(validarCodigo(codigo, carimbar)).resolves.toEqual({
      tipo: 'autentico',
      campos: [
        { chave: 'id', valor: '1757680000000' },
        { chave: 'cpf', valor: '000' },
      ],
      versaoMaisNova: true,
    });
  });

  test('recusa chave repetida ou fora do formato', () => {
    expect(() =>
      serializarCampos([
        { chave: 'id', valor: '1' },
        { chave: 'id', valor: '2' },
      ]),
    ).toThrow('Campo inválido');
    expect(() => serializarCampos([{ chave: 'meu campo', valor: '1' }])).toThrow('Campo inválido');
  });

  test('exibe CPF e telefone mascarados logo depois de quem assinou', () => {
    const exibidos = camposParaExibir(camposDoDocumento(DOCUMENTO, TITULAR_COMPLETO, RESUMO_DA_FOTO));

    expect(exibidos.slice(1, 4)).toEqual([
      { rotulo: 'Assinado por', valor: 'breno@exemplo.com' },
      { rotulo: 'CPF', valor: '***.456.789-**' },
      { rotulo: 'Telefone', valor: '(**) *****-4321' },
    ]);
  });

  test('exibe os campos conhecidos em português, na ordem de leitura, sem o resumo da foto', () => {
    const campos = [...camposDoDocumento(DOCUMENTO, TITULAR, RESUMO_DA_FOTO), { chave: 'nome', valor: 'Breno' }];

    expect(camposParaExibir(campos)).toEqual([
      { rotulo: 'Título', valor: 'Contrato de locação' },
      { rotulo: 'Assinado por', valor: 'breno@exemplo.com' },
      { rotulo: 'Assinado em', valor: formatDateTime(createIsoDateTime('2026-09-12T14:32:00.000Z')) },
      { rotulo: 'Local', valor: '-22.40418, -43.66283' },
      { rotulo: 'Documento', valor: '1757680000000' },
      { rotulo: 'nome', valor: 'Breno' },
    ]);
  });
});
