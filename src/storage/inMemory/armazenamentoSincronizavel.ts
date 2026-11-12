import type { EstadoLocal, RegistroSincronizavel } from '../repositories';

type Entrada<T> = Readonly<{
  item: T;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  pendente: boolean;
}>;

type ComIdentidade = Readonly<{ id: string; usuarioId: string }>;

export function criarArmazenamentoSincronizavel<T extends ComIdentidade>(
  criadoEm: (item: T, agora: string) => string,
) {
  const entradas = new Map<string, Entrada<T>>();

  function paraRegistro(entrada: Entrada<T>): RegistroSincronizavel<T> {
    return {
      item: entrada.item,
      createdAt: entrada.createdAt,
      updatedAt: entrada.updatedAt,
      deletedAt: entrada.deletedAt,
    };
  }

  return {
    ativos(usuarioId: string): readonly T[] {
      return [...entradas.values()]
        .filter((entrada) => entrada.deletedAt === null && entrada.item.usuarioId === usuarioId)
        .map((entrada) => entrada.item);
    },
    achar(id: string): T | null {
      const entrada = entradas.get(id);
      return entrada === undefined || entrada.deletedAt !== null ? null : entrada.item;
    },
    salvar(item: T): void {
      const agora = new Date().toISOString();
      const existente = entradas.get(item.id);
      entradas.set(item.id, {
        item,
        createdAt: existente?.createdAt ?? criadoEm(item, agora),
        updatedAt: agora,
        deletedAt: null,
        pendente: true,
      });
    },
    apagar(id: string): void {
      const existente = entradas.get(id);
      if (existente === undefined) {
        return;
      }
      const agora = new Date().toISOString();
      entradas.set(id, { ...existente, updatedAt: agora, deletedAt: agora, pendente: true });
    },
    limpar(): void {
      entradas.clear();
    },
    listarPendentes(usuarioId: string): readonly RegistroSincronizavel<T>[] {
      return [...entradas.values()]
        .filter((entrada) => entrada.pendente && entrada.item.usuarioId === usuarioId)
        .map(paraRegistro);
    },
    lerParaSincronizar(id: string): EstadoLocal<T> | null {
      const entrada = entradas.get(id);
      return entrada === undefined ? null : { registro: paraRegistro(entrada), pendente: entrada.pendente };
    },
    aplicarDaNuvem(registro: RegistroSincronizavel<T>, mesclar: (existente: T | null, novo: T) => T): void {
      const existente = entradas.get(registro.item.id);
      entradas.set(registro.item.id, {
        item: mesclar(existente?.item ?? null, registro.item),
        createdAt: registro.createdAt,
        updatedAt: registro.updatedAt,
        deletedAt: registro.deletedAt,
        pendente: false,
      });
    },
    marcarSincronizado(id: string, updatedAt: string): void {
      const entrada = entradas.get(id);
      if (entrada !== undefined && entrada.updatedAt === updatedAt) {
        entradas.set(id, { ...entrada, pendente: false });
      }
    },
  };
}
