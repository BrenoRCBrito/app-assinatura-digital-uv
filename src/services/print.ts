import { printToFileAsync } from 'expo-print';

import type { CodigoDeAutenticidade } from '../domain/codigoDeAutenticidade';
import { createBase64, createHtml, type Base64, type DocumentoAssinado, type Html } from '../domain/documento';
import { formatDateTime, formatLocal } from '../domain/format';
import { createPixels, type Size } from '../domain/geometry';
import { LARGURA_DA_FOLHA_A4, layoutDaPagina } from '../domain/pagina';
import { layoutDoSelo } from '../domain/selo';
import { FIXED_COLORS } from '../theme/appTheme';
import { tokens } from '../theme/tokens';
import { desenharQrSvg, gerarMatrizQr } from './qrCode';

const FONTE_DO_SELO = '-apple-system, Helvetica, Arial, sans-serif';

export const LEGENDA_DO_QR = 'Código de autenticidade. Para conferir, abra o AssinaAqui e toque em Validar documento.';

export type DocumentoHtml = Readonly<{ html: Html; tamanhoDaPagina: Size }>;

function escaparHtml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function montarHtmlDocumento(
  documento: DocumentoAssinado,
  fotoBase64: Base64,
  codigo: CodigoDeAutenticidade,
): DocumentoHtml {
  const { pagina, foto, esquerda, topo, rodape, ladoDoQr, tamanhoDaLegenda } = layoutDaPagina(
    documento.tamanhoFoto,
    LARGURA_DA_FOLHA_A4,
  );
  const { desenho } = documento.assinaturaUsada;
  const selo = layoutDoSelo(documento.selo.largura, foto, desenho.quadro);
  const local = formatLocal(documento.local);
  const tracos = desenho.tracos.map((traco) => `<path d="${traco}" />`).join('');
  const qr = desenharQrSvg(gerarMatrizQr(codigo), { tinta: FIXED_COLORS.ink, fundo: FIXED_COLORS.paper });

  const html = createHtml(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { margin: 0; }
  html, body { margin: 0; padding: 0; }
  .pagina {
    position: relative;
    width: ${pagina.width}px;
    height: ${pagina.height}px;
    overflow: hidden;
    background: ${FIXED_COLORS.paper};
  }
  .foto {
    position: absolute;
    left: ${esquerda}px;
    top: ${topo}px;
    width: ${foto.width}px;
    height: ${foto.height}px;
  }
  .foto img { display: block; width: 100%; height: 100%; }
  .selo {
    position: absolute;
    left: ${documento.selo.x * 100}%;
    top: ${documento.selo.y * 100}%;
    width: ${selo.tamanho.width}px;
  }
  .selo svg { display: block; width: 100%; height: ${selo.alturaDoDesenho}px; }
  .faixa {
    height: ${selo.alturaDaFaixa}px;
    font-family: ${FONTE_DO_SELO};
    font-weight: 600;
    font-size: ${selo.tamanhoDaFonte}px;
    line-height: ${selo.alturaDaLinha}px;
    color: ${FIXED_COLORS.ink};
    white-space: nowrap;
    overflow: hidden;
  }
  .rodape {
    position: absolute;
    left: ${rodape.esquerda}px;
    top: ${rodape.topo}px;
    width: ${rodape.largura}px;
    height: ${rodape.altura}px;
    display: flex;
    align-items: center;
  }
  .legenda {
    flex: 1;
    font-family: ${FONTE_DO_SELO};
    font-size: ${tamanhoDaLegenda}px;
    color: ${FIXED_COLORS.ink};
  }
  .qr { flex: none; width: ${ladoDoQr}px; height: ${ladoDoQr}px; }
  .qr svg { display: block; width: 100%; height: 100%; }
</style>
</head>
<body>
<div class="pagina">
  <div class="foto">
    <img src="data:image/jpeg;base64,${fotoBase64}" />
    <div class="selo">
      <svg viewBox="0 0 ${desenho.quadro.width} ${desenho.quadro.height}" preserveAspectRatio="xMidYMid meet">
        <g
          fill="none"
          stroke="${FIXED_COLORS.ink}"
          stroke-width="${tokens.lineWidth.drawing}"
          stroke-linecap="round"
          stroke-linejoin="round"
          vector-effect="non-scaling-stroke"
        >${tracos}</g>
      </svg>
      <div class="faixa"><div>${formatDateTime(documento.assinadoEm)}</div><div>${escaparHtml(local)}</div></div>
    </div>
  </div>
  <div class="rodape">
    <div class="legenda">${LEGENDA_DO_QR}</div>
    <div class="qr">${qr}</div>
  </div>
</div>
</body>
</html>`);

  return { html, tamanhoDaPagina: pagina };
}

export async function gerarPdf(html: Html, tamanhoDaPagina: Size): Promise<Base64> {
  const { base64 } = await printToFileAsync({
    html,
    width: createPixels(Math.round(tamanhoDaPagina.width)),
    // +1 e arredondado: evita o bug do Android que conta uma página a mais quando a altura bate
    // exatamente com a do conteúdo, e evita o Android tratar diferente um valor com casas decimais.
    height: createPixels(Math.round(tamanhoDaPagina.height) + 1),
    base64: true,
  });
  if (base64 === undefined) {
    throw new Error('O PDF não voltou em base64.');
  }
  return createBase64(base64);
}

