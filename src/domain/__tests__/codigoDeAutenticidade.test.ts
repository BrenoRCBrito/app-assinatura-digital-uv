import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { camposDoDocumento, camposParaExibir, coordenadasDoCodigo, enderecoDoCodigo } from '../codigoDeAutenticidade';
import { createIsoDateTime } from '../dateTime';
import { createEndereco } from '../endereco';
import { formatDateTime } from '../format';
import { criarCpf, criarEmail, criarTelefone } from '../usuario';

const EMAIL = criarEmail('breno@exemplo.com');
const TITULAR = { email: EMAIL, cpf: null, telefone: null };
const TITULAR_COMPLETO = {
  email: EMAIL,
  cpf: criarCpf('123.456.789-09'),
  telefone: criarTelefone('(11) 98765-4321'),
};
const RESUMO_DA_FOTO = 'a'.repeat(64);
const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const ENDERECO = 'Rua das Flores, 123 - Centro, Vassouras - RJ, 27700-000';
const COM_ENDERECO = { ...DOCUMENTO, local: { ...DOCUMENTO.local, endereco: createEndereco(ENDERECO) } };

describe('campos do código de autenticidade', () => {
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

  test('com o endereço aproximado, ele entra assinado logo depois das coordenadas', () => {
    const campos = camposDoDocumento(COM_ENDERECO, TITULAR, RESUMO_DA_FOTO);

    expect(campos.map(({ chave }) => chave)).toEqual(['id', 'email', 'titulo', 'em', 'local', 'endereco', 'foto']);
    expect(campos).toContainEqual({ chave: 'endereco', valor: ENDERECO });
  });

  test('exibe o endereço aproximado antes das coordenadas', () => {
    const exibidos = camposParaExibir(camposDoDocumento(COM_ENDERECO, TITULAR, RESUMO_DA_FOTO));
    const rotulos = exibidos.map(({ rotulo }) => rotulo);

    expect(exibidos).toContainEqual({ rotulo: 'Endereço aproximado', valor: ENDERECO });
    expect(rotulos.indexOf('Endereço aproximado')).toBe(rotulos.indexOf('Local') - 1);
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

  test('os campos não carregam o CPF nem o telefone inteiros', () => {
    const campos = JSON.stringify(camposDoDocumento(DOCUMENTO, TITULAR_COMPLETO, RESUMO_DA_FOTO));

    expect(campos).not.toContain('12345678909');
    expect(campos).not.toContain('98765');
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

describe('coordenadasDoCodigo', () => {
  test('lê latitude e longitude do campo local', () => {
    expect(coordenadasDoCodigo([{ chave: 'local', valor: '-22.40418,-43.66283' }])).toEqual({
      latitude: -22.40418,
      longitude: -43.66283,
    });
  });

  test('sem o campo local, não há coordenadas', () => {
    expect(coordenadasDoCodigo([{ chave: 'titulo', valor: 'Contrato' }])).toBeNull();
  });

  test.each(['abc', '-22.4', '-22.4,', '91,10', '10,181', '1,2,3'])('local inválido "%s" não vira coordenadas', (valor) => {
    expect(coordenadasDoCodigo([{ chave: 'local', valor }])).toBeNull();
  });
});

describe('enderecoDoCodigo', () => {
  test('lê o endereço aproximado assinado', () => {
    expect(enderecoDoCodigo([{ chave: 'endereco', valor: ' Rua A, Vassouras ' }])).toBe('Rua A, Vassouras');
  });

  test('código de antes do endereço, ou com ele vazio, não tem endereço', () => {
    expect(enderecoDoCodigo([{ chave: 'local', valor: '-22.4,-43.6' }])).toBeNull();
    expect(enderecoDoCodigo([{ chave: 'endereco', valor: '  ' }])).toBeNull();
  });
});
