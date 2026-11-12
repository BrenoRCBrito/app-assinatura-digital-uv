import type { Repositories } from './repositories';

function avisando<Argumentos extends unknown[], Resultado>(
  acao: (...argumentos: Argumentos) => Promise<Resultado>,
  aoAlterar: () => void,
): (...argumentos: Argumentos) => Promise<Resultado> {
  return async (...argumentos) => {
    const resultado = await acao(...argumentos);
    aoAlterar();
    return resultado;
  };
}

export function comGatilhoDeSincronizacao(repositorios: Repositories, aoAlterar: () => void): Repositories {
  const { assinaturas, documentos, usuarios } = repositorios;
  const avisar = <Argumentos extends unknown[], Resultado>(acao: (...argumentos: Argumentos) => Promise<Resultado>) =>
    avisando(acao, aoAlterar);

  return {
    ...repositorios,
    assinaturas: {
      ...assinaturas,
      save: avisar(assinaturas.save),
      delete: avisar(assinaturas.delete),
    },
    documentos: {
      ...documentos,
      save: avisar(documentos.save),
      delete: avisar(documentos.delete),
    },
    usuarios: {
      ...usuarios,
      create: avisar(usuarios.create),
      updateEmail: avisar(usuarios.updateEmail),
      updateNome: avisar(usuarios.updateNome),
      updateCpf: avisar(usuarios.updateCpf),
      updateTelefone: avisar(usuarios.updateTelefone),
      updateFoto: avisar(usuarios.updateFoto),
    },
  };
}
