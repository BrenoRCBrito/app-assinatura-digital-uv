import { createIsoDateTime } from '../../domain/dateTime';
import { criarUsuarioId, type Usuario } from '../../domain/usuario';
import type { UsuarioRepository } from '../repositories';

export function createInMemoryUsuarioRepository(): UsuarioRepository {
  let usuarios: readonly Usuario[] = [];

  return {
    async findByEmail(email) {
      return usuarios.find((usuario) => usuario.email === email) ?? null;
    },
    async findById(id) {
      return usuarios.find((usuario) => usuario.id === id) ?? null;
    },
    async create({ email, senhaHash }) {
      const usuario: Usuario = {
        id: criarUsuarioId(`${Date.now()}${usuarios.length}`),
        email,
        senhaHash,
        criadoEm: createIsoDateTime(new Date().toISOString()),
      };
      usuarios = [...usuarios, usuario];
      return usuario;
    },
    async clear() {
      usuarios = [];
    },
  };
}
