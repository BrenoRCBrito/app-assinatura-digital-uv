type Linha = Record<string, unknown>;

const bancos = new Map<string, Map<string, Linha[]>>();

function tabelasDoBanco(nomeBanco: string): Map<string, Linha[]> {
  const existente = bancos.get(nomeBanco);
  if (existente !== undefined) {
    return existente;
  }
  const tabelas = new Map<string, Linha[]>();
  bancos.set(nomeBanco, tabelas);
  return tabelas;
}

function linhasDaTabela(tabelas: Map<string, Linha[]>, nomeTabela: string): Linha[] {
  const existente = tabelas.get(nomeTabela);
  if (existente !== undefined) {
    return existente;
  }
  const linhas: Linha[] = [];
  tabelas.set(nomeTabela, linhas);
  return linhas;
}

export function openDatabaseSync(nomeBanco: string) {
  const tabelas = tabelasDoBanco(nomeBanco);

  return {
    execAsync: jest.fn(async (sql: string) => {
      const match = /CREATE TABLE IF NOT EXISTS\s+(\w+)/i.exec(sql);
      if (match) {
        linhasDaTabela(tabelas, match[1]);
      }
    }),
    runAsync: jest.fn(async (sql: string, ...params: unknown[]) => {
      const apagar = /DELETE FROM\s+(\w+)/i.exec(sql);
      if (apagar !== null) {
        const linhas = linhasDaTabela(tabelas, apagar[1]);
        const apagadas = linhas.length;
        linhas.length = 0;
        return { lastInsertRowId: 0, changes: apagadas };
      }
      const match = /INSERT INTO\s+(\w+)\s*\(([^)]+)\)/i.exec(sql);
      if (match === null) {
        throw new Error(`Mock de expo-sqlite não sabe rodar: ${sql}`);
      }
      const [, nomeTabela, colunasTexto] = match;
      const colunas = colunasTexto.split(',').map((coluna) => coluna.trim());
      const linha: Linha = {};
      colunas.forEach((coluna, indice) => {
        linha[coluna] = params[indice];
      });
      const linhas = linhasDaTabela(tabelas, nomeTabela);
      linhas.push(linha);
      return { lastInsertRowId: linhas.length, changes: 1 };
    }),
    getFirstAsync: jest.fn(async (sql: string, ...params: unknown[]) => {
      const match = /SELECT \* FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i.exec(sql);
      if (match === null) {
        throw new Error(`Mock de expo-sqlite não sabe rodar: ${sql}`);
      }
      const [, nomeTabela, coluna] = match;
      const linhas = linhasDaTabela(tabelas, nomeTabela);
      return linhas.find((linha) => linha[coluna] === params[0]) ?? null;
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      const match = /SELECT \* FROM\s+(\w+)/i.exec(sql);
      if (match === null) {
        throw new Error(`Mock de expo-sqlite não sabe rodar: ${sql}`);
      }
      return [...linhasDaTabela(tabelas, match[1])];
    }),
  };
}

export function __resetTodosOsBancosDeTeste(): void {
  bancos.clear();
}
