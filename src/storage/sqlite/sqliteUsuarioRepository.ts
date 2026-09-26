import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';
import { createIsoDateTime } from '../../domain/dateTime';
import {
  criarUsuarioId,
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

type LinhaUsuario = Readonly<{
  id: string;
  email: string;
  senha_hash: string;
  nome: string | null;
  cpf: string | null;
  telefone: string | null;
  foto: string | null;
  criado_em: string;
}>;

function paraUsuarioDaLinha(linha: LinhaUsuario): Usuario {
  return paraUsuario({
    id: linha.id,
    email: linha.email,
    senhaHash: linha.senha_hash,
    nome: linha.nome,
    cpf: linha.cpf,
    telefone: linha.telefone,
    foto: linha.foto,
    criadoEm: linha.criado_em,
  });
}

async function adicionarColunaSeFaltar(db: SQLiteDatabase, coluna: string): Promise<void> {
  try {
    await db.execAsync(`ALTER TABLE usuarios ADD COLUMN ${coluna} TEXT`);
  } catch {
    // Coluna já existe — banco criado antes desta versão do schema.
  }
}

export function createSqliteUsuarioRepository(): UsuarioRepository {
  const db = openDatabaseSync('assinaaqui.db');
  const pronto = (async () => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id TEXT PRIMARY KEY NOT NULL,
        email TEXT UNIQUE NOT NULL,
        senha_hash TEXT NOT NULL,
        cpf TEXT,
        telefone TEXT,
        criado_em TEXT NOT NULL
      );
    `);
    await adicionarColunaSeFaltar(db, 'cpf');
    await adicionarColunaSeFaltar(db, 'telefone');
    await adicionarColunaSeFaltar(db, 'foto');
    await adicionarColunaSeFaltar(db, 'nome');
  })();
  let sequencia = 0;

  async function buscarPorId(id: UsuarioId): Promise<Usuario | null> {
    await pronto;
    const linha = await db.getFirstAsync<LinhaUsuario>('SELECT * FROM usuarios WHERE id = ?', id);
    return linha === null ? null : paraUsuarioDaLinha(linha);
  }

  return {
    async findByEmail(email: Email) {
      await pronto;
      const linha = await db.getFirstAsync<LinhaUsuario>('SELECT * FROM usuarios WHERE email = ?', email);
      return linha === null ? null : paraUsuarioDaLinha(linha);
    },
    findById: buscarPorId,
    async create({ email, senhaHash, nome, cpf, telefone }) {
  await pronto;
  const usuario: Usuario = {
    id: criarUsuarioId(`${Date.now()}${sequencia}`),
    email,
    senhaHash,
    nome: nome ?? null,
    cpf: cpf ?? null,
    telefone: telefone ?? null,
    foto: null,
    criadoEm: createIsoDateTime(new Date().toISOString()),
  };
  sequencia += 1;
  await db.runAsync(
    'INSERT INTO usuarios (id, email, senha_hash, nome, cpf, telefone, foto, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    usuario.id,
    usuario.email,
    usuario.senhaHash,
    usuario.nome,
    usuario.cpf,
    usuario.telefone,
    usuario.foto,
    usuario.criadoEm,
  );

  return usuario;
},
    async updateEmail(id: UsuarioId, email: Email) {
      await pronto;
      await db.runAsync('UPDATE usuarios SET email = ? WHERE id = ?', email, id);
      const atualizado = await buscarPorId(id);
      if (atualizado === null) {
        throw new Error(`Usuário não encontrado: ${id}`);
      }
      return atualizado;
    },
    async updateSenha(id: UsuarioId, senhaHash: string) {
      await pronto;
      await db.runAsync('UPDATE usuarios SET senha_hash = ? WHERE id = ?', senhaHash, id);
      const atualizado = await buscarPorId(id);
      if (atualizado === null) {
        throw new Error(`Usuário não encontrado: ${id}`);
      }
      return atualizado;
    },
    async updateNome(id: UsuarioId, nome: Nome) {
      await pronto;
      await db.runAsync('UPDATE usuarios SET nome = ? WHERE id = ?', nome, id);
      const atualizado = await buscarPorId(id);
      if (atualizado === null) {
        throw new Error(`Usuário não encontrado: ${id}`);
      }
      return atualizado;
    },

    async updateCpf(id: UsuarioId, cpf: Cpf) {
      await pronto;
      await db.runAsync('UPDATE usuarios SET cpf = ? WHERE id = ?', cpf, id);
      const atualizado = await buscarPorId(id);
      if (atualizado === null) {
        throw new Error(`Usuário não encontrado: ${id}`);
      }
      return atualizado;
    },
    async updateTelefone(id: UsuarioId, telefone: Telefone) {
      await pronto;
      await db.runAsync('UPDATE usuarios SET telefone = ? WHERE id = ?', telefone, id);
      const atualizado = await buscarPorId(id);
      if (atualizado === null) {
        throw new Error(`Usuário não encontrado: ${id}`);
      }
      return atualizado;
    },
    async updateFoto(id: UsuarioId, foto: FotoPerfil | null) {
      await pronto;
      await db.runAsync('UPDATE usuarios SET foto = ? WHERE id = ?', foto, id);
      const atualizado = await buscarPorId(id);
      if (atualizado === null) {
        throw new Error(`Usuário não encontrado: ${id}`);
      }
      return atualizado;
    },
    async clear() {
      await pronto;
      await db.runAsync('DELETE FROM usuarios');
    },
  };
}
