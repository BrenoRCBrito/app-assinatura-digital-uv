import { createIsoDateTime } from '../../domain/dateTime';
import type { PerfilParaSincronizar, Usuario, UsuarioId } from '../../domain/usuario';
import type { UsuarioRepository } from '../repositories';

type Controle = Readonly<{ updatedAt: string; pendente: boolean }>;

export function createInMemoryUsuarioRepository(): UsuarioRepository {
  let usuarios: readonly Usuario[] = [];
  const controles = new Map<UsuarioId, Controle>();

  function registrarMudanca(id: UsuarioId): void {
    controles.set(id, { updatedAt: new Date().toISOString(), pendente: true });
  }

  function atualizar(id: UsuarioId, alteracoes: Partial<Usuario>): Usuario {
    const atual = usuarios.find((usuario) => usuario.id === id);
    if (atual === undefined) {
      throw new Error(`Usuário não encontrado: ${id}`);
    }
    const atualizado: Usuario = { ...atual, ...alteracoes };
    usuarios = usuarios.map((usuario) => (usuario.id === id ? atualizado : usuario));
    registrarMudanca(id);
    return atualizado;
  }

  return {
    async findByEmail(email) {
      return usuarios.find((usuario) => usuario.email === email) ?? null;
    },
    async findById(id) {
      return usuarios.find((usuario) => usuario.id === id) ?? null;
    },
    async create({ id, email, nome, cpf, telefone }) {
      const usuario: Usuario = {
        id,
        email,
        nome: nome ?? null,
        cpf: cpf ?? null,
        telefone: telefone ?? null,
        foto: null,
        criadoEm: createIsoDateTime(new Date().toISOString()),
      };
      usuarios = [...usuarios, usuario];
      registrarMudanca(id);
      return usuario;
    },
    async updateEmail(id, email) {
      return atualizar(id, { email });
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
    async listarPerfisPendentes() {
      return usuarios.flatMap((usuario): PerfilParaSincronizar[] => {
        const controle = controles.get(usuario.id);
        if (controle === undefined || !controle.pendente) {
          return [];
        }
        return [
          {
            id: usuario.id,
            email: usuario.email,
            nome: usuario.nome,
            cpf: usuario.cpf,
            telefone: usuario.telefone,
            createdAt: usuario.criadoEm,
            updatedAt: controle.updatedAt,
            deletedAt: null,
          },
        ];
      });
    },
    async lerPerfilLocal(id) {
      const usuario = usuarios.find((candidato) => candidato.id === id);
      const controle = controles.get(id);
      if (usuario === undefined || controle === undefined) {
        return null;
      }
      return {
        perfil: {
          id: usuario.id,
          email: usuario.email,
          nome: usuario.nome,
          cpf: usuario.cpf,
          telefone: usuario.telefone,
          createdAt: usuario.criadoEm,
          updatedAt: controle.updatedAt,
          deletedAt: null,
        },
        pendente: controle.pendente,
      };
    },
    async aplicarPerfilDaNuvem(perfil) {
      if (!usuarios.some((usuario) => usuario.id === perfil.id)) {
        throw new Error(`Usuário não encontrado: ${perfil.id}`);
      }
      usuarios = usuarios.map((usuario) =>
        usuario.id === perfil.id
          ? {
              ...usuario,
              nome: perfil.nome,
              cpf: perfil.cpf,
              telefone: perfil.telefone,
              criadoEm: createIsoDateTime(perfil.createdAt),
            }
          : usuario,
      );
      controles.set(perfil.id, { updatedAt: perfil.updatedAt, pendente: false });
    },
    async aplicarFotoDaNuvem(id, foto) {
      if (!usuarios.some((usuario) => usuario.id === id)) {
        throw new Error(`Usuário não encontrado: ${id}`);
      }
      usuarios = usuarios.map((usuario) => (usuario.id === id ? { ...usuario, foto } : usuario));
    },
    async marcarPerfilSincronizado(id, updatedAt) {
      const controle = controles.get(id);
      if (controle !== undefined && controle.updatedAt === updatedAt) {
        controles.set(id, { ...controle, pendente: false });
      }
    },
    async clear() {
      usuarios = [];
      controles.clear();
    },
    async apagarDaConta(id) {
      usuarios = usuarios.filter((usuario) => usuario.id !== id);
      controles.delete(id);
    },
  };
}
