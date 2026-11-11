import { createIsoDateTime } from '../../domain/dateTime';
import {
  paraUsuario,
  type Cpf,
  type Email,
  type FotoPerfil,
  type Nome,
  type Telefone,
  type Usuario,
  type UsuarioId,
} from '../../domain/usuario';
import type { UsuarioRepository } from '../repositories';
import { abrirBanco, adicionarColunaSeFaltar, type Banco } from './banco';

type LinhaUsuario = Readonly<{
  id: string;
  email: string;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  foto: string | null;
  created_at: string;
}>;

function paraUsuarioDaLinha(linha: LinhaUsuario): Usuario {
  return paraUsuario({
    id: linha.id,
    email: linha.email,
    nome: linha.nome,
    cpf: linha.cpf,
    telefone: linha.telefone,
    foto: linha.foto,
    criadoEm: linha.created_at,
  });
}

export function createSqliteUsuarioRepository(banco: Banco = abrirBanco()): UsuarioRepository {
  const { db } = banco;
  const pronto = (async () => {
    await banco.pronto;
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT UNIQUE NOT NULL,
        cpf TEXT,
        telefone TEXT,
        created_at TEXT NOT NULL
      );
    `);
    try {
      await db.execAsync('ALTER TABLE usuarios RENAME COLUMN criado_em TO created_at');
    } catch {}
    await adicionarColunaSeFaltar(db, 'usuarios', 'cpf TEXT');
    await adicionarColunaSeFaltar(db, 'usuarios', 'telefone TEXT');
    await adicionarColunaSeFaltar(db, 'usuarios', 'foto TEXT');
    await adicionarColunaSeFaltar(db, 'usuarios', 'nome TEXT');
    await adicionarColunaSeFaltar(db, 'usuarios', 'updated_at TEXT');
    await adicionarColunaSeFaltar(db, 'usuarios', 'deleted_at TEXT');
    await adicionarColunaSeFaltar(db, 'usuarios', "sync_status TEXT NOT NULL DEFAULT 'pending'");
    await db.execAsync('UPDATE usuarios SET updated_at = created_at WHERE updated_at IS NULL');
    try {
      await db.execAsync('ALTER TABLE usuarios DROP COLUMN senha_hash');
      await db.execAsync('DELETE FROM usuarios');
    } catch {}
  })();

  async function buscarPorId(id: UsuarioId): Promise<Usuario | null> {
    await pronto;
    const linha = await db.getFirstAsync<LinhaUsuario>(
      'SELECT * FROM usuarios WHERE id = ? AND deleted_at IS NULL',
      id,
    );
    return linha === null ? null : paraUsuarioDaLinha(linha);
  }

  async function atualizarCampo(id: UsuarioId, coluna: string, valor: string | null): Promise<Usuario> {
    await pronto;
    await db.runAsync(
      `UPDATE usuarios SET ${coluna} = ?, updated_at = ?, sync_status = ? WHERE id = ?`,
      valor,
      new Date().toISOString(),
      'pending',
      id,
    );
    const atualizado = await buscarPorId(id);
    if (atualizado === null) {
      throw new Error(`Usuário não encontrado: ${id}`);
    }
    return atualizado;
  }

  return {
    async findByEmail(email: Email) {
      await pronto;
      const linha = await db.getFirstAsync<LinhaUsuario>(
        'SELECT * FROM usuarios WHERE email = ? AND deleted_at IS NULL',
        email,
      );
      return linha === null ? null : paraUsuarioDaLinha(linha);
    },
    findById: buscarPorId,
    async create({ id, email, nome, cpf, telefone }) {
      await pronto;
      const agora = new Date().toISOString();
      const usuario: Usuario = {
        id,
        email,
        nome: nome ?? null,
        cpf: cpf ?? null,
        telefone: telefone ?? null,
        foto: null,
        criadoEm: createIsoDateTime(agora),
      };

      await db.runAsync(
        'INSERT INTO usuarios (id, email, nome, cpf, telefone, foto, created_at, updated_at, deleted_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        usuario.id,
        usuario.email,
        usuario.nome,
        usuario.cpf,
        usuario.telefone,
        usuario.foto,
        usuario.criadoEm,
        agora,
        null,
        'pending',
      );

      return usuario;
    },
    updateEmail: (id: UsuarioId, email: Email) => atualizarCampo(id, 'email', email),
    updateNome: (id: UsuarioId, nome: Nome) => atualizarCampo(id, 'nome', nome),
    updateCpf: (id: UsuarioId, cpf: Cpf) => atualizarCampo(id, 'cpf', cpf),
    updateTelefone: (id: UsuarioId, telefone: Telefone) => atualizarCampo(id, 'telefone', telefone),
    updateFoto: (id: UsuarioId, foto: FotoPerfil | null) => atualizarCampo(id, 'foto', foto),
    async clear() {
      await pronto;
      await db.runAsync('DELETE FROM usuarios');
    },
  };
}
