import { criarNomeAssinatura } from '../assinatura';
import { ValidationError } from '../brand';
import { createIsoDateTime } from '../dateTime';
import { criarDesenho, criarTraco } from '../desenho';
import {
  createBase64,
  createCity,
  createHtml,
  createLatitude,
  createLongitude,
  criarDocumentoId,
  criarTituloDocumento,
  ordenarDocumentosMaisNovosPrimeiro,
  paraDocumentoAssinado,
  type DocumentoAssinado,
} from '../documento';
import { createFraction, createSize } from '../geometry';

function documentoValido(id: string, assinadoEm: string, cidade: string | null = 'Vassouras'): DocumentoAssinado {
  return {
    id: criarDocumentoId(id),
    titulo: criarTituloDocumento('Contrato de locação'),
    assinaturaUsada: {
      nome: criarNomeAssinatura('Rubrica'),
      desenho: criarDesenho([criarTraco('M10,20 L30,40')], createSize(300, 150)),
    },
    tamanhoFoto: createSize(3024, 4032),
    selo: { x: createFraction(0.4), y: createFraction(0.65), largura: createFraction(0.35) },
    local: {
      coordenadas: { latitude: createLatitude(-22.40418), longitude: createLongitude(-43.66283) },
      cidade: cidade === null ? null : createCity(cidade),
    },
    assinadoEm: createIsoDateTime(assinadoEm),
  };
}

describe('criarDocumentoId', () => {
  test('gera um id numérico a partir do relógio', () => {
    expect(criarDocumentoId()).toMatch(/^\d+$/);
  });

  test('aceita um id numérico salvo e recusa outro formato', () => {
    expect(criarDocumentoId('1757680000000')).toBe('1757680000000');
    expect(() => criarDocumentoId('abc')).toThrow('Id de documento inválido: abc');
  });
});

describe('criarTituloDocumento', () => {
  test('remove espaços das pontas', () => {
    expect(criarTituloDocumento('  Contrato de locação  ')).toBe('Contrato de locação');
  });

  test('exige um título', () => {
    expect(() => criarTituloDocumento('   ')).toThrow(ValidationError);
    expect(() => criarTituloDocumento('   ')).toThrow('Dê um título ao documento.');
  });

  test('aceita 60 caracteres e recusa 61', () => {
    expect(criarTituloDocumento('a'.repeat(60))).toHaveLength(60);
    expect(() => criarTituloDocumento('a'.repeat(61))).toThrow('O título do documento tem no máximo 60 caracteres.');
  });
});

describe('local da assinatura', () => {
  test('createLatitude aceita de -90 a 90', () => {
    expect([createLatitude(-90), createLatitude(90)]).toEqual([-90, 90]);
    expect(() => createLatitude(90.5)).toThrow('Latitude inválida: 90.5');
    expect(() => createLatitude(Number.NaN)).toThrow('Latitude inválida: NaN');
  });

  test('createLongitude aceita de -180 a 180', () => {
    expect([createLongitude(-180), createLongitude(180)]).toEqual([-180, 180]);
    expect(() => createLongitude(-180.5)).toThrow('Longitude inválida: -180.5');
  });

  test('createCity remove espaços das pontas e recusa texto vazio', () => {
    expect(createCity(' Vassouras ')).toBe('Vassouras');
    expect(() => createCity('  ')).toThrow('Cidade vazia.');
  });
});

describe('conteúdo dos arquivos', () => {
  test('createBase64 recusa texto vazio', () => {
    expect(createBase64('/9j/4AAQ')).toBe('/9j/4AAQ');
    expect(() => createBase64('')).toThrow('Base64 vazio.');
  });

  test('createHtml exige o DOCTYPE no início', () => {
    expect(createHtml('<!DOCTYPE html><html></html>')).toBe('<!DOCTYPE html><html></html>');
    expect(() => createHtml('<html></html>')).toThrow('HTML sem DOCTYPE.');
  });
});

describe('ordenarDocumentosMaisNovosPrimeiro', () => {
  test('coloca o mais novo primeiro sem alterar a lista original', () => {
    const antigo = documentoValido('1', '2026-09-10T10:00:00.000Z');
    const novo = documentoValido('2', '2026-09-12T10:00:00.000Z');
    const lista = [antigo, novo];

    expect(ordenarDocumentosMaisNovosPrimeiro(lista)).toEqual([novo, antigo]);
    expect(lista).toEqual([antigo, novo]);
  });
});

describe('paraDocumentoAssinado', () => {
  test('reconstrói um documento salvo em JSON', () => {
    const documento = documentoValido('1757680000000', '2026-09-12T10:00:00.000Z');

    expect(paraDocumentoAssinado(JSON.parse(JSON.stringify(documento)))).toEqual(documento);
  });

  test('reconstrói um documento sem cidade', () => {
    const documento = documentoValido('1', '2026-09-12T10:00:00.000Z', null);

    expect(paraDocumentoAssinado(JSON.parse(JSON.stringify(documento)))).toEqual(documento);
  });

  test('lança erro quando falta um campo', () => {
    const documento = documentoValido('1', '2026-09-12T10:00:00.000Z');

    expect(() => paraDocumentoAssinado({ ...documento, local: undefined })).toThrow('Documento salvo inválido.');
  });

  test('lança erro quando um campo tem o tipo errado', () => {
    const documento = documentoValido('1', '2026-09-12T10:00:00.000Z');

    expect(() => paraDocumentoAssinado({ ...documento, selo: { ...documento.selo, largura: '0.35' } })).toThrow(
      'Documento salvo inválido.',
    );
  });

  test('lança erro quando o dado não é objeto', () => {
    expect(() => paraDocumentoAssinado('documento')).toThrow(ValidationError);
  });
});
