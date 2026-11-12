import { criarCodigoCurto } from '../../domain/codigoCurto';
import { camposDoDocumento, type CampoDoCodigo } from '../../domain/codigoDeAutenticidade';
import { createIsoDateTime } from '../../domain/dateTime';
import { createBase64 } from '../../domain/documento';
import { criarCpf, criarEmail, criarTelefone, type Usuario } from '../../domain/usuario';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { emitirCodigoDoDocumento } from '../emitirCodigoDoDocumento';

const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const FOTO = createBase64('/9j/4AAQ');
const RESUMO = 'b'.repeat(64);
const CODIGO = criarCodigoCurto('7K3F9QXZM2P4');
const USUARIO: Usuario = {
  id: DOCUMENTO.usuarioId,
  email: criarEmail('breno@exemplo.com'),
  nome: null,
  cpf: null,
  telefone: null,
  foto: null,
  criadoEm: createIsoDateTime('2026-09-01T10:00:00.000Z'),
};

function criarRegistrar() {
  return jest.fn(async (_campos: readonly CampoDoCodigo[]) => CODIGO);
}

describe('emitirCodigoDoDocumento', () => {
  test('registra na API os campos com o e-mail da conta e o resumo da foto, e devolve o código', async () => {
    const buscarUsuario = jest.fn(async () => USUARIO);
    const resumirSha256 = jest.fn(async () => RESUMO);
    const registrar = criarRegistrar();

    const emitido = await emitirCodigoDoDocumento({ buscarUsuario, resumirSha256, registrar }, DOCUMENTO, FOTO);

    expect(emitido).toEqual({ codigo: CODIGO, fotoSha256: RESUMO });
    expect(buscarUsuario).toHaveBeenCalledWith(DOCUMENTO.usuarioId);
    expect(resumirSha256).toHaveBeenCalledWith(FOTO);
    expect(registrar).toHaveBeenCalledWith(camposDoDocumento(DOCUMENTO, USUARIO, RESUMO));
  });

  test('manda o CPF e o telefone já mascarados, nunca os números inteiros', async () => {
    const titular = { ...USUARIO, cpf: criarCpf('123.456.789-09'), telefone: criarTelefone('(11) 98765-4321') };
    const registrar = criarRegistrar();

    await emitirCodigoDoDocumento(
      { buscarUsuario: async () => titular, resumirSha256: async () => RESUMO, registrar },
      DOCUMENTO,
      FOTO,
    );

    const [campos] = registrar.mock.calls[0];
    expect(campos).toEqual(
      expect.arrayContaining([
        { chave: 'cpf', valor: '***.456.789-**' },
        { chave: 'telefone', valor: '(**) *****-4321' },
      ]),
    );
    expect(JSON.stringify(campos)).not.toMatch(/12345678909|11987654321/);
  });

  test('sem a conta que assina, não chama a API', async () => {
    const registrar = criarRegistrar();

    await expect(
      emitirCodigoDoDocumento({ buscarUsuario: async () => null, resumirSha256: async () => RESUMO, registrar }, DOCUMENTO, FOTO),
    ).rejects.toThrow('A conta que assina o documento não foi encontrada.');
    expect(registrar).not.toHaveBeenCalled();
  });
});
