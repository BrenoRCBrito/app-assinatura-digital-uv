import { printToFileAsync } from 'expo-print';

import { criarCodigoCurto, formatarCodigoCurto } from '../../domain/codigoCurto';
import { createBase64, createCity, createHtml } from '../../domain/documento';
import { formatDateTime } from '../../domain/format';
import { createPixels, createSize } from '../../domain/geometry';
import { layoutDaPagina } from '../../domain/pagina';
import { layoutDoSelo } from '../../domain/selo';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { FIXED_COLORS } from '../../theme/appTheme';
import { gerarPdf, LEGENDA_DO_QR, montarHtmlDocumento } from '../print';
import { desenharQrSvg, gerarMatrizQr } from '../qrCode';

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const FOTO = createBase64('/9j/4AAQ');
const CODIGO = criarCodigoCurto('7K3F9QXZM2P4');

describe('montarHtmlDocumento', () => {
  test('monta a página com a foto preenchendo a largura, o desenho em SVG e o selo em porcentagem', () => {
    const { html } = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO, 'android');
    const { foto } = layoutDaPagina(DOCUMENTO.tamanhoFoto, createPixels(595));
    const selo = layoutDoSelo(DOCUMENTO.selo.largura, foto, DOCUMENTO.assinaturaUsada.desenho.quadro);

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('width: 595px;');
    expect(html).toContain('src="data:image/jpeg;base64,/9j/4AAQ"');
    expect(html).toContain('<svg viewBox="0 0 300 150"');
    expect(html).toContain('<path d="M10,20 L30,40" />');
    expect(html).toContain(`stroke="${FIXED_COLORS.ink}"`);
    expect(html).toContain('left: 40%;');
    expect(html).toContain('top: 65%;');
    expect(html).toContain(`width: ${selo.tamanho.width}px;`);
    expect(html).toContain(`<div>${formatDateTime(DOCUMENTO.assinadoEm)}</div><div>Vassouras</div>`);
  });

  test('põe no rodapé o QR do código curto formatado e a legenda, abaixo da foto', () => {
    const { html } = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO, 'android');
    const { rodape, ladoDoQr } = layoutDaPagina(DOCUMENTO.tamanhoFoto, createPixels(595));
    const qr = desenharQrSvg(gerarMatrizQr('7K3F-9QXZ-M2P4'), { tinta: FIXED_COLORS.ink, fundo: FIXED_COLORS.paper });

    expect(html).toContain(qr);
    expect(html).toContain(`top: ${rodape.topo}px;`);
    expect(html).toContain(`width: ${ladoDoQr}px;`);
    expect(html).toContain(`<div class="legenda">${LEGENDA_DO_QR}</div>`);
    expect(LEGENDA_DO_QR).toContain('leia o QR ou digite o código');
  });

  test('o selo claro sai branco no PDF, no traço e na faixa; o QR e a legenda continuam escuros', () => {
    const claro = { ...DOCUMENTO, selo: { ...DOCUMENTO.selo, cor: 'clara' as const } };
    const { html } = montarHtmlDocumento(claro, FOTO, CODIGO, 'android');
    const faixa = /\.faixa \{[^}]*\}/.exec(html)?.[0] ?? '';
    const legenda = /\.legenda \{[^}]*\}/.exec(html)?.[0] ?? '';

    expect(html).toContain(`stroke="${FIXED_COLORS.inkLight}"`);
    expect(faixa).toContain(`color: ${FIXED_COLORS.inkLight};`);
    expect(legenda).toContain(`color: ${FIXED_COLORS.ink};`);
  });

  test('o selo escuro, o de sempre, sai na tinta escura', () => {
    const { html } = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO, 'android');
    const faixa = /\.faixa \{[^}]*\}/.exec(html)?.[0] ?? '';

    expect(DOCUMENTO.selo.cor).toBe('escura');
    expect(html).not.toContain(FIXED_COLORS.inkLight);
    expect(faixa).toContain(`color: ${FIXED_COLORS.ink};`);
  });

  test('sem cidade, mostra as coordenadas na faixa', () => {
    const semCidade = { ...DOCUMENTO, local: { ...DOCUMENTO.local, cidade: null } };

    expect(montarHtmlDocumento(semCidade, FOTO, CODIGO).html).toContain('<div>-22.40418, -43.66283</div>');
  });

  test('escapa a cidade antes de pôr no HTML', () => {
    const cidadeComSimbolos = { ...DOCUMENTO, local: { ...DOCUMENTO.local, cidade: createCity('A & B <C>') } };
    const { html } = montarHtmlDocumento(cidadeComSimbolos, FOTO, CODIGO);

    expect(html).toContain('<div>A &amp; B &lt;C&gt;</div>');
    expect(html).not.toContain('<C>');
  });

  test('escreve o código curto em texto ao lado do QR, para ser digitado na validação', () => {
    const { html } = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO);
    const escrito = /<div class="codigo">([^<]*)<\/div>/.exec(html)?.[1] ?? '';

    expect(escrito).toBe(formatarCodigoCurto(CODIGO));
    expect(criarCodigoCurto(escrito)).toBe(CODIGO);
  });

  test('no Android, o HTML e a página têm a mesma medida', () => {
    const { html, tamanhoDaPagina } = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO, 'android');
    const { pagina } = layoutDaPagina(DOCUMENTO.tamanhoFoto, createPixels(595));

    expect(html).toContain('width: 595px;');
    expect(html).toContain('stroke-width="2"');
    expect(tamanhoDaPagina.width).toBe(595);
    expect(tamanhoDaPagina.height).toBeCloseTo(pagina.height, 6);
  });

  test('no iOS, desenha 1,25× maior para compensar a redução que o WebKit aplica ao imprimir', () => {
    const { html, tamanhoDaPagina } = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO, 'ios');
    const noIos = layoutDaPagina(DOCUMENTO.tamanhoFoto, createPixels(595 * 1.25));
    const noAndroid = layoutDaPagina(DOCUMENTO.tamanhoFoto, createPixels(595));

    expect(html).toContain('width: 743.75px;');
    expect(html).toContain(`height: ${noIos.foto.height}px;`);
    expect(html).toContain(`top: ${noIos.rodape.topo}px;`);
    // O traço não escala com o SVG: engrossa junto para sair com a mesma espessura do Android.
    expect(html).toContain('stroke-width="2.5"');
    // A página do PDF continua em pontos de A4: o WebKit encolhe o desenho de volta para caber nela sem sobra.
    expect(tamanhoDaPagina.width).toBeCloseTo(595, 6);
    expect(tamanhoDaPagina.height).toBeCloseTo(noAndroid.pagina.height, 6);
  });

  test('sem a plataforma, usa a do aparelho', () => {
    const { tamanhoDaPagina } = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO);

    expect(tamanhoDaPagina.width).toBeCloseTo(595, 6);
  });
});

describe('gerarPdf', () => {
  test('imprime o HTML no tamanho da página e devolve o PDF em base64', async () => {
    const html = createHtml('<!DOCTYPE html><html></html>');
    jest.mocked(printToFileAsync).mockResolvedValue({
      uri: 'file:///cache/Print/documento.pdf',
      numberOfPages: 1,
      base64: 'JVBERi0xLjQK',
    });

    await expect(gerarPdf(html, createSize(595, 841))).resolves.toBe('JVBERi0xLjQK');
    expect(printToFileAsync).toHaveBeenCalledWith({ html, width: 595, height: 842, base64: true });
  });

  test('sem o base64 no resultado, falha em vez de guardar um PDF vazio', async () => {
    jest.mocked(printToFileAsync).mockResolvedValue({ uri: 'file:///cache/Print/documento.pdf', numberOfPages: 1 });

    await expect(
      gerarPdf(createHtml('<!DOCTYPE html><html></html>'), createSize(595, 841)),
    ).rejects.toThrow('O PDF não voltou em base64.');
  });
});
