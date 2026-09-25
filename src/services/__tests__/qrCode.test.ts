import qrcode from 'qrcode-generator';

import { serializarCampos } from '../../domain/codigoDeAutenticidade';
import { desenharQrSvg, gerarMatrizQr } from '../qrCode';

const TEXTO = 'AA1;id=1757680000000;email=breno%40exemplo.com#W9zBRr9gdU5qBCQmCJV1x1oAPwidJzmDnexYuWTsOEM';
const CORES = { tinta: '#0D1B2A', fundo: '#FFFFFF' };

describe('gerarMatrizQr', () => {
  test('gera a matriz quadrada que o encoder anuncia', () => {
    const referencia = qrcode(0, 'M');
    referencia.addData(TEXTO, 'Byte');
    referencia.make();

    const matriz = gerarMatrizQr(TEXTO);

    expect(matriz).toHaveLength(referencia.getModuleCount());
    expect(matriz.every((linha) => linha.length === matriz.length)).toBe(true);
    expect(matriz.map((linha, y) => linha.filter((_, x) => referencia.isDark(y, x) === linha[x]).length)).toEqual(
      matriz.map((linha) => linha.length),
    );
  });

  test('tem os padrões de localização nos três cantos', () => {
    const matriz = gerarMatrizQr(TEXTO);
    const inicioDoUltimo = matriz.length - 7;

    for (const [linha, coluna] of [
      [0, 0],
      [0, inicioDoUltimo],
      [inicioDoUltimo, 0],
    ]) {
      expect(matriz[linha].slice(coluna, coluna + 7).every(Boolean)).toBe(true);
      expect(matriz[linha + 1][coluna + 1]).toBe(false);
      expect(matriz[linha + 3][coluna + 3]).toBe(true);
    }
  });

  test('o pior caso de título acentuado e e-mail longo ainda cabe até a versão 25', () => {
    const mensagem = serializarCampos([
      { chave: 'id', valor: '17902999999990' },
      { chave: 'email', valor: 'um.endereco.bem.comprido@exemplo.com.br' },
      { chave: 'titulo', valor: 'ã'.repeat(60) },
      { chave: 'em', valor: '2026-09-25T23:59:59.999Z' },
      { chave: 'local', valor: '-22.4528212,-43.4784823' },
      { chave: 'foto', valor: 'f'.repeat(64) },
    ]);

    const matriz = gerarMatrizQr(`${mensagem}#${'c'.repeat(43)}`);

    expect(matriz.length).toBeLessThanOrEqual(17 + 4 * 25);
  });
});

describe('desenharQrSvg', () => {
  test('desenha um quadrado por módulo escuro, com zona de silêncio e as cores pedidas', () => {
    const matriz = gerarMatrizQr(TEXTO);
    const lado = matriz.length + 8;

    const svg = desenharQrSvg(matriz, CORES);

    expect(svg.match(/h1v1h-1z/g)).toHaveLength(matriz.flat().filter(Boolean).length);
    expect(svg).toContain(`viewBox="0 0 ${lado} ${lado}"`);
    expect(svg).toContain(`<rect width="${lado}" height="${lado}" fill="${CORES.fundo}"/>`);
    expect(svg).toContain(`<path fill="${CORES.tinta}" d="M`);
  });

  test('só usa aspas duplas, então entra direto no HTML do PDF', () => {
    expect(desenharQrSvg(gerarMatrizQr(TEXTO), CORES)).not.toMatch(/['`]/);
  });
});
