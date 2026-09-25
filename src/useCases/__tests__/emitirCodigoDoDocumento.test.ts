/// <reference types="node" />
import { createHmac } from 'node:crypto';

import { camposDoDocumento, validarCodigo, type Carimbar } from '../../domain/codigoDeAutenticidade';
import { createIsoDateTime } from '../../domain/dateTime';
import { createBase64 } from '../../domain/documento';
import { criarEmail, type Usuario } from '../../domain/usuario';
import { criarDocumentoDeTeste } from '../../storage/testing/documentoAssinadoRepositoryContract';
import { emitirCodigoDoDocumento } from '../emitirCodigoDoDocumento';

const carimbar: Carimbar = async (mensagem) =>
  createHmac('sha256', 'segredo-de-teste').update(mensagem).digest('base64url');
const DOCUMENTO = criarDocumentoDeTeste('1757680000000', 'Contrato de locação', '2026-09-12T14:32:00.000Z');
const FOTO = createBase64('/9j/4AAQ');
const RESUMO = 'b'.repeat(64);
const USUARIO: Usuario = {
  id: DOCUMENTO.usuarioId,
  email: criarEmail('breno@exemplo.com'),
  senhaHash: 'hash',
  criadoEm: createIsoDateTime('2026-09-01T10:00:00.000Z'),
};

describe('emitirCodigoDoDocumento', () => {
  test('monta o código com o e-mail da conta, o resumo da foto e o carimbo', async () => {
    const buscarUsuario = jest.fn(async () => USUARIO);
    const resumirSha256 = jest.fn(async () => RESUMO);

    const codigo = await emitirCodigoDoDocumento({ buscarUsuario, resumirSha256, carimbar }, DOCUMENTO, FOTO);

    expect(buscarUsuario).toHaveBeenCalledWith(DOCUMENTO.usuarioId);
    expect(resumirSha256).toHaveBeenCalledWith(FOTO);
    await expect(validarCodigo(codigo, carimbar)).resolves.toEqual({
      tipo: 'autentico',
      campos: camposDoDocumento(DOCUMENTO, USUARIO.email, RESUMO),
      versaoMaisNova: false,
    });
  });

  test('sem a conta que assina, recusa emitir', async () => {
    const semConta = { buscarUsuario: async () => null, resumirSha256: async () => RESUMO, carimbar };

    await expect(emitirCodigoDoDocumento(semConta, DOCUMENTO, FOTO)).rejects.toThrow(
      'A conta que assina o documento não foi encontrada.',
    );
  });
});
