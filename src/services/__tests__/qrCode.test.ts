import qrcode from 'qrcode-generator';

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

  test('o código curto formatado cabe na menor versão do QR, com 21 módulos', () => {
    expect(gerarMatrizQr('7K3F-9QXZ-M2P4')).toHaveLength(21);
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
