import { criarEmail, criarUsuarioId } from '../../domain/usuario';
import { createInMemoryUsuarioRepository } from '../inMemory/inMemoryUsuarioRepository';
import { testarContratoUsuarioRepository } from '../testing/usuarioRepositoryContract';

const EMAIL = criarEmail('breno@exemplo.com');
const ID = criarUsuarioId('uid-breno');

testarContratoUsuarioRepository('em memória', createInMemoryUsuarioRepository);

describe('UsuarioRepository (em memória), atualizações', () => {
  test('updateEmail troca o e-mail mantendo o resto', async () => {
    const repositorio = createInMemoryUsuarioRepository();
    const usuario = await repositorio.create({ id: ID, email: EMAIL });
    const novoEmail = criarEmail('novo@exemplo.com');

    const atualizado = await repositorio.updateEmail(usuario.id, novoEmail);

    expect(atualizado.email).toBe(novoEmail);
    expect(atualizado.id).toBe(ID);
    await expect(repositorio.findById(usuario.id)).resolves.toEqual(atualizado);
  });
});
