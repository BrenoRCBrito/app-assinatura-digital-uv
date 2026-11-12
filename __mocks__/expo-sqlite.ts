type Linha = Record<string, unknown>;
type Condicao = Readonly<{ coluna: string; tipo: 'igual' | 'nulo' | 'naoNulo' }>;

const bancos = new Map<string, Map<string, Linha[]>>();
let falharProximaEscrita = false;

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

function naoSabeRodar(sql: string): Error {
  return new Error(`Mock de expo-sqlite não sabe rodar: ${sql}`);
}

function lerCondicoes(sql: string, texto: string | undefined): readonly Condicao[] {
  if (texto === undefined) {
    return [];
  }
  return texto.split(/\s+AND\s+/i).map((parte) => {
    const encontrado = /^(\w+)\s*(=\s*\?|IS\s+NOT\s+NULL|IS\s+NULL)$/i.exec(parte.trim());
    if (encontrado === null) {
      throw naoSabeRodar(sql);
    }
    const operador = encontrado[2];
    const tipo = /IS\s+NOT\s+NULL/i.test(operador) ? 'naoNulo' : /IS\s+NULL/i.test(operador) ? 'nulo' : 'igual';
    return { coluna: encontrado[1], tipo };
  });
}

function filtrar(linhas: readonly Linha[], condicoes: readonly Condicao[], parametros: readonly unknown[]): Linha[] {
  let proximo = 0;
  const esperados = condicoes.map((condicao) => (condicao.tipo === 'igual' ? parametros[proximo++] : null));
  return linhas.filter((linha) =>
    condicoes.every((condicao, indice) => {
      const valor = linha[condicao.coluna] ?? null;
      return condicao.tipo === 'naoNulo' ? valor !== null : valor === esperados[indice];
    }),
  );
}

function condicoesDoWhere(sql: string): readonly Condicao[] {
  return lerCondicoes(sql, /\bWHERE\s+(.+?)(?:\s+ORDER\s+BY\b.*)?$/is.exec(sql)?.[1]);
}

function consultar(tabelas: Map<string, Linha[]>, sql: string, parametros: readonly unknown[]): Linha[] {
  const tabela = /SELECT \* FROM\s+(\w+)/i.exec(sql);
  if (tabela === null) {
    throw naoSabeRodar(sql);
  }
  return filtrar(linhasDaTabela(tabelas, tabela[1]), condicoesDoWhere(sql), parametros);
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
      if (falharProximaEscrita) {
        falharProximaEscrita = false;
        throw new Error('Falha simulada ao gravar no banco.');
      }
      const apagar = /DELETE FROM\s+(\w+)/i.exec(sql);
      if (apagar !== null) {
        const linhas = linhasDaTabela(tabelas, apagar[1]);
        const alvos = filtrar(linhas, condicoesDoWhere(sql), params);
        tabelas.set(
          apagar[1],
          linhas.filter((linha) => !alvos.includes(linha)),
        );
        return { lastInsertRowId: 0, changes: alvos.length };
      }
      const atualizar = /UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)$/is.exec(sql);
      if (atualizar !== null) {
        const colunas = atualizar[2].split(',').map((atribuicao) => {
          const encontrada = /^\s*(\w+)\s*=\s*\?\s*$/.exec(atribuicao);
          if (encontrada === null) {
            throw naoSabeRodar(sql);
          }
          return encontrada[1];
        });
        const alvos = filtrar(
          linhasDaTabela(tabelas, atualizar[1]),
          lerCondicoes(sql, atualizar[3]),
          params.slice(colunas.length),
        );
        alvos.forEach((linha) => {
          colunas.forEach((coluna, indice) => {
            linha[coluna] = params[indice];
          });
        });
        return { lastInsertRowId: 0, changes: alvos.length };
      }
      const match = /INSERT INTO\s+(\w+)\s*\(([^)]+)\)/i.exec(sql);
      if (match === null) {
        throw naoSabeRodar(sql);
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
    getFirstAsync: jest.fn(async (sql: string, ...params: unknown[]) => consultar(tabelas, sql, params)[0] ?? null),
    getAllAsync: jest.fn(async (sql: string, ...params: unknown[]) =>
      consultar(tabelas, sql, params).map((linha) => ({ ...linha })),
    ),
  };
}

export function __resetTodosOsBancosDeTeste(): void {
  bancos.clear();
  falharProximaEscrita = false;
}

export function __falharProximaEscrita(): void {
  falharProximaEscrita = true;
}
