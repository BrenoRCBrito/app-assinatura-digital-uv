import type { NetworkStateEvent } from 'expo-network';

const SEM_MODULO = 'Não foi possível observar a rede (expo-network indisponível). A sincronização ao voltar a internet fica desligada:';

function temInternet(estado: NetworkStateEvent): boolean {
  return estado.isConnected === true && estado.isInternetReachable !== false;
}

export function observarVoltaDaInternet(aoVoltar: () => void): () => void {
  try {
    const rede: typeof import('expo-network') = require('expo-network');
    let comInternet: boolean | null = null;
    const assinatura = rede.addNetworkStateListener((estado) => {
      const agora = temInternet(estado);
      const voltou = agora && comInternet === false;
      comInternet = agora;
      if (voltou) {
        aoVoltar();
      }
    });
    return () => assinatura.remove();
  } catch (error) {
    console.warn(SEM_MODULO, error);
    return () => undefined;
  }
}
