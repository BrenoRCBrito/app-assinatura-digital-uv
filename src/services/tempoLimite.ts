export function comTempoLimite<T>(promessa: Promise<T>, milissegundos: number, mensagem: string): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    const relogio = setTimeout(() => rejeitar(new Error(mensagem)), milissegundos);
    promessa.then(
      (valor) => {
        clearTimeout(relogio);
        resolver(valor);
      },
      (erro: unknown) => {
        clearTimeout(relogio);
        rejeitar(erro);
      },
    );
  });
}
