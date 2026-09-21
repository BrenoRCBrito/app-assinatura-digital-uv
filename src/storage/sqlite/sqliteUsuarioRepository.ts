import { openDatabaseSync } from 'expo-sqlite';
import { createIsoDateTime } from '../../domain/dateTime';
import { criarUsuarioId, paraUsuario, type Email, type Usuario } from '../../domain/usuario';
import type { UsuarioRepository } from '../repositories';

type LinhaUsuario = Readonly<{
  id: string;
  email: string;
  senha_hash: string;
  criado_em: string;
}>;

function paraUsuarioDaLinha(linha: LinhaUsuario): Usuario {
  return paraUsuario({
    id: linha.id,
    email: linha.email,
    senhaHash: linha.senha_hash,
    criadoEm: linha.criado_em,
  });
}

export function createSqliteUsuarioRepository(): UsuarioRepository {
  const db = openDatabaseSync('assinaaqui.db');
  const pronto = db.execAsync(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id TEXT PRIMARY KEY NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      criado_em TEXT NOT NULL
    );
  `);

  return {
    async findByEmail(email: Email) {
      await pronto;
      const linha = await db.getFirstAsync<LinhaUsuario>('SELECT * FROM usuarios WHERE email = ?', email);
      return linha === null ? null : paraUsuarioDaLinha(linha);
    },
    async create({ email, senhaHash }) {
      await pronto;
      const usuario: Usuario = {
        id: criarUsuarioId(),
        email,
        senhaHash,
        criadoEm: createIsoDateTime(new Date().toISOString()),
      };
      await db.runAsync(
        'INSERT INTO usuarios (id, email, senha_hash, criado_em) VALUES (?, ?, ?, ?)',
        usuario.id,
        usuario.email,
        usuario.senhaHash,
        usuario.criadoEm,
      );
      return usuario;
    },
    async clear() {
      await pronto;
      await db.runAsync('DELETE FROM usuarios');
    },
  };
}


