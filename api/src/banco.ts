import { DatabaseSync } from 'node:sqlite';

export type RegistroDoDocumento = Readonly<{
  codigo: string;
  campos: string;
  carimbo: string;
  criadoEm: string;
}>;

export type Banco = Readonly<{
  inserir: (registro: RegistroDoDocumento) => boolean;
  buscar: (codigo: string) => RegistroDoDocumento | null;
  fechar: () => void;
}>;

type LinhaDoDocumento = Readonly<{ codigo: string; campos: string; carimbo: string; criado_em: string }>;

export function abrirBanco(caminho: string): Banco {
  const db = new DatabaseSync(caminho);
  db.exec(
    'CREATE TABLE IF NOT EXISTS documentos (' +
      'codigo TEXT PRIMARY KEY, campos TEXT NOT NULL, carimbo TEXT NOT NULL, criado_em TEXT NOT NULL)',
  );
  const insercao = db.prepare(
    'INSERT OR IGNORE INTO documentos (codigo, campos, carimbo, criado_em) VALUES (?, ?, ?, ?)',
  );
  const consulta = db.prepare('SELECT codigo, campos, carimbo, criado_em FROM documentos WHERE codigo = ?');

  return {
    inserir({ codigo, campos, carimbo, criadoEm }) {
      return Number(insercao.run(codigo, campos, carimbo, criadoEm).changes) === 1;
    },
    buscar(codigo) {
      const linha = consulta.get(codigo) as LinhaDoDocumento | undefined;
      return linha === undefined
        ? null
        : { codigo: linha.codigo, campos: linha.campos, carimbo: linha.carimbo, criadoEm: linha.criado_em };
    },
    fechar() {
      db.close();
    },
  };
}
