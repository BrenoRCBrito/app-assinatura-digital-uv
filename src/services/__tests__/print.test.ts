import { printToFileAsync } from 'expo-print';

import { emitirCodigo, type CodigoDeAutenticidade } from '../../domain/codigoDeAutenticidade';
import { createBase64, createCity, createHtml } from '../../domain/documento';
import { formatDateTime } from '../../domain/format';
import { createPixels } from '../../domain/geometry';
import { layoutDaPagina } from '../../domain/pagina';
import { layoutDoSelo } from '../../domain/selo';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { FIXED_COLORS } from '../../theme/appTheme';
import { gerarPdf, LEGENDA_DO_QR, montarHtmlDocumento } from '../print';
import { desenharQrSvg, gerarMatrizQr } from '../qrCode';

jest.mock('expo-print', () => ({ printToFileAsync: jest.fn() }));

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const FOTO = createBase64('/9j/4AAQ');
let CODIGO: CodigoDeAutenticidade;

beforeAll(async () => {
  CODIGO = await emitirCodigo([{ chave: 'id', valor: '1757680000000' }], async () => 'carimbo-de-teste');
});

describe('montarHtmlDocumento', () => {
  test('monta a página A4 com a foto, o desenho em SVG e o selo em porcentagem', () => {
    const html = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO);
    const { foto } = layoutDaPagina(DOCUMENTO.tamanhoFoto, createPixels(595));
    const selo = layoutDoSelo(DOCUMENTO.selo.largura, foto, DOCUMENTO.assinaturaUsada.desenho.quadro);

    expect(html.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(html).toContain('width: 595px;');
    expect(html).toContain('height: 841px;');
    expect(html).toContain('src="data:image/jpeg;base64,/9j/4AAQ"');
    expect(html).toContain('<svg viewBox="0 0 300 150"');
    expect(html).toContain('<path d="M10,20 L30,40" />');
    expect(html).toContain(`stroke="${FIXED_COLORS.ink}"`);
    expect(html).toContain('left: 40%;');
    expect(html).toContain('top: 65%;');
    expect(html).toContain(`width: ${selo.tamanho.width}px;`);
    expect(html).toContain(`<div>${formatDateTime(DOCUMENTO.assinadoEm)}</div><div>Vassouras</div>`);
  });

  test('põe o QR do código e a legenda no rodapé, abaixo da foto', () => {
    const html = montarHtmlDocumento(DOCUMENTO, FOTO, CODIGO);
    const { rodape, ladoDoQr } = layoutDaPagina(DOCUMENTO.tamanhoFoto, createPixels(595));

    expect(html).toContain(desenharQrSvg(gerarMatrizQr(CODIGO), { tinta: FIXED_COLORS.ink, fundo: FIXED_COLORS.paper }));
    expect(html).toContain(`top: ${rodape.topo}px;`);
    expect(html).toContain(`width: ${ladoDoQr}px;`);
    expect(html).toContain(`<div class="legenda">${LEGENDA_DO_QR}</div>`);
  });

  test('sem cidade, mostra as coordenadas na faixa', () => {
    const semCidade = { ...DOCUMENTO, local: { ...DOCUMENTO.local, cidade: null } };

    expect(montarHtmlDocumento(semCidade, FOTO, CODIGO)).toContain('<div>-22.40418, -43.66283</div>');
  });

  test('escapa a cidade antes de pôr no HTML', () => {
    const cidadeComSimbolos = { ...DOCUMENTO, local: { ...DOCUMENTO.local, cidade: createCity('A & B <C>') } };
    const html = montarHtmlDocumento(cidadeComSimbolos, FOTO, CODIGO);

    expect(html).toContain('<div>A &amp; B &lt;C&gt;</div>');
    expect(html).not.toContain('<C>');
  });
});

describe('gerarPdf', () => {
  test('imprime o HTML na folha A4 e devolve o PDF em base64', async () => {
    const html = createHtml('<!DOCTYPE html><html></html>');
    jest.mocked(printToFileAsync).mockResolvedValue({
      uri: 'file:///cache/Print/documento.pdf',
      numberOfPages: 1,
      base64: 'JVBERi0xLjQK',
    });

    await expect(gerarPdf(html)).resolves.toBe('JVBERi0xLjQK');
    expect(printToFileAsync).toHaveBeenCalledWith({ html, width: 595, height: 842, base64: true });
  });

  test('sem o base64 no resultado, falha em vez de guardar um PDF vazio', async () => {
    jest.mocked(printToFileAsync).mockResolvedValue({ uri: 'file:///cache/Print/documento.pdf', numberOfPages: 1 });

    await expect(gerarPdf(createHtml('<!DOCTYPE html><html></html>'))).rejects.toThrow('O PDF não voltou em base64.');
  });
});
