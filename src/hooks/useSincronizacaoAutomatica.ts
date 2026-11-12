import { useEffect } from 'react';
import { AppState } from 'react-native';

import type { UsuarioId } from '../domain/usuario';
import { observarVoltaDaInternet } from '../services/rede';
import { sincronizarTudo } from '../services/sincronizacao';
import { aoSolicitarSincronizacao } from '../services/solicitacaoDeSincronizacao';
import type { Repositories } from '../storage/repositories';

export const ATRASO_APOS_ALTERAR = 3000;
export const INTERVALO_MINIMO_AO_VOLTAR_AO_APP = 30000;

export function useSincronizacaoAutomatica(repositorios: Repositories, usuarioId: UsuarioId | null): void {
  useEffect(() => {
    if (usuarioId === null) {
      return;
    }
    let ultimaVez = 0;
    let espera: ReturnType<typeof setTimeout> | null = null;

    function sincronizar() {
      ultimaVez = Date.now();
      void sincronizarTudo(repositorios, usuarioId as UsuarioId);
    }

    sincronizar();

    const pararDeOuvirAlteracoes = aoSolicitarSincronizacao(() => {
      if (espera !== null) {
        clearTimeout(espera);
      }
      espera = setTimeout(() => {
        espera = null;
        sincronizar();
      }, ATRASO_APOS_ALTERAR);
    });

    const estadoDoApp = AppState.addEventListener('change', (estado) => {
      if (estado === 'active' && Date.now() - ultimaVez >= INTERVALO_MINIMO_AO_VOLTAR_AO_APP) {
        sincronizar();
      }
    });

    const pararDeObservarARede = observarVoltaDaInternet(sincronizar);

    return () => {
      pararDeOuvirAlteracoes();
      estadoDoApp.remove();
      pararDeObservarARede();
      if (espera !== null) {
        clearTimeout(espera);
      }
    };
  }, [repositorios, usuarioId]);
}
