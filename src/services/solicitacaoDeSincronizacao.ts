type Ouvinte = () => void;

const ouvintes = new Set<Ouvinte>();

export function solicitarSincronizacao(): void {
  for (const ouvinte of [...ouvintes]) {
    ouvinte();
  }
}

export function aoSolicitarSincronizacao(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
