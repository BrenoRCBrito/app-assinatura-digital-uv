import qrcode from 'qrcode-generator';

export type MatrizQr = readonly (readonly boolean[])[];

export type CoresDoQr = Readonly<{ tinta: string; fundo: string }>;

const CORRECAO_DE_ERRO = 'M';
const ZONA_DE_SILENCIO = 4;

export function gerarMatrizQr(texto: string): MatrizQr {
  const qr = qrcode(0, CORRECAO_DE_ERRO);
  qr.addData(texto, 'Byte');
  qr.make();
  const lado = qr.getModuleCount();

  return Array.from({ length: lado }, (_, linha) =>
    Array.from({ length: lado }, (__, coluna) => qr.isDark(linha, coluna)),
  );
}

export function desenharQrSvg(matriz: MatrizQr, cores: CoresDoQr): string {
  const lado = matriz.length + 2 * ZONA_DE_SILENCIO;
  const modulos = matriz
    .flatMap((linha, y) =>
      linha.flatMap((escuro, x) => (escuro ? [`M${x + ZONA_DE_SILENCIO} ${y + ZONA_DE_SILENCIO}h1v1h-1z`] : [])),
    )
    .join('');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${lado} ${lado}" shape-rendering="crispEdges">`,
    `<rect width="${lado}" height="${lado}" fill="${cores.fundo}"/>`,
    `<path fill="${cores.tinta}" d="${modulos}"/>`,
    '</svg>',
  ].join('');
}
