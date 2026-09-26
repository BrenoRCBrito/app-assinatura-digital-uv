import { createIsoDateTime } from '../../domain/dateTime';
import { criarUsuarioId, type Usuario, type UsuarioId } from '../../domain/usuario';
import type { UsuarioRepository } from '../repositories';

export function createInMemoryUsuarioRepository(): UsuarioRepository {
  let usuarios: readonly Usuario[] = [];

  function atualizar(id: UsuarioId, alteracoes: Partial<Usuario>): Usuario {
    const atual = usuarios.find((usuario) => usuario.id === id);
    if (atual === undefined) {
      throw new Error(`Usuário não encontrado: ${id}`);
    }
    const atualizado: Usuario = { ...atual, ...alteracoes };
    usuarios = usuarios.map((usuario) => (usuario.id === id ? atualizado : usuario));
    return atualizado;
  }

  return {
    async findByEmail(email) {
      return usuarios.find((usuario) => usuario.email === email) ?? null;
    },
    async findById(id) {
      return usuarios.find((usuario) => usuario.id === id) ?? null;
    },
    async create({ email, senhaHash, nome, cpf, telefone }) {
      const usuario: Usuario = {
      id: criarUsuarioId(`${Date.now()}${usuarios.length}`),
      email,
      senhaHash,
      nome: nome ?? null,
      cpf: cpf ?? null,
      telefone: telefone ?? null,
      foto: null,
      criadoEm: createIsoDateTime(new Date().toISOString()),
    };
    usuarios = [...usuarios, usuario];
    return usuario;
  },

    async updateEmail(id, email) {
      return atualizar(id, { email });
    },
    async updateSenha(id, senhaHash) {
      return atualizar(id, { senhaHash });
    },
    async updateCpf(id, cpf) {
      return atualizar(id, { cpf });
    },
    async updateTelefone(id, telefone) {
      return atualizar(id, { telefone });
    },
    async updateFoto(id, foto) {
      return atualizar(id, { foto });
    },
    async updateNome(id, nome) {
      return atualizar(id, { nome });
    },


    async clear() {
      usuarios = [];
    },
  };
}
