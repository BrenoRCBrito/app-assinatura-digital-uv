import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { criarUsuarioId } from '../../domain/usuario';
import { observarVoltaDaInternet } from '../../services/rede';
import { sincronizarTudo } from '../../services/sincronizacao';
import { solicitarSincronizacao } from '../../services/solicitacaoDeSincronizacao';
import { createRepositories } from '../../storage/createRepositories';
import {
  ATRASO_APOS_ALTERAR,
  INTERVALO_MINIMO_AO_VOLTAR_AO_APP,
  useSincronizacaoAutomatica,
} from '../useSincronizacaoAutomatica';

jest.mock('../../services/sincronizacao', () => ({ sincronizarTudo: jest.fn() }));
jest.mock('../../services/rede', () => ({ observarVoltaDaInternet: jest.fn() }));

const UID = criarUsuarioId('uid-a');
const OUTRO = criarUsuarioId('uid-b');
const INICIO = new Date('2026-10-01T10:00:00.000Z');

let aoMudarOEstadoDoApp: (estado: AppStateStatus) => void;
let aoVoltarAInternet: () => void;
const removerEstadoDoApp = jest.fn();
const pararDeObservarARede = jest.fn();

type Propriedades = Readonly<{ id: typeof UID | null }>;

async function renderizar(usuarioId: typeof UID | null = UID) {
  const repositorios = createRepositories('inMemory');
  const resultado = await renderHook<void, Propriedades>(({ id }) => useSincronizacaoAutomatica(repositorios, id), {
    initialProps: { id: usuarioId },
  });
  return { repositorios, ...resultado };
}

describe('useSincronizacaoAutomatica', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: INICIO });
    jest.mocked(sincronizarTudo).mockReset().mockResolvedValue({ enviados: 0, baixados: 0, falhou: false });
    removerEstadoDoApp.mockReset();
    pararDeObservarARede.mockReset();
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((_evento: string, ouvinte: typeof aoMudarOEstadoDoApp) => {
      aoMudarOEstadoDoApp = ouvinte;
      return { remove: removerEstadoDoApp };
    }) as never);
    jest.mocked(observarVoltaDaInternet).mockReset().mockImplementation((aoVoltar) => {
      aoVoltarAInternet = aoVoltar;
      return pararDeObservarARede;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('ao entrar', () => {
    test('sincroniza a conta que entrou, na hora', async () => {
      const { repositorios } = await renderizar();

      expect(sincronizarTudo).toHaveBeenCalledTimes(1);
      expect(sincronizarTudo).toHaveBeenCalledWith(repositorios, UID);
    });

    test('sem conta logada, não sincroniza nem observa nada', async () => {
      const registrosAntes = jest.mocked(AppState.addEventListener).mock.calls.length;

      await renderizar(null);

      expect(sincronizarTudo).not.toHaveBeenCalled();
      expect(jest.mocked(AppState.addEventListener).mock.calls.length).toBe(registrosAntes);
      expect(observarVoltaDaInternet).not.toHaveBeenCalled();
    });

    test('quando a conta aparece depois, começa a sincronizar', async () => {
      const { rerender } = await renderizar(null);

      await rerender({ id: UID });

      expect(sincronizarTudo).toHaveBeenCalledTimes(1);
    });

    test('ao trocar de conta, sincroniza a nova', async () => {
      const { rerender, repositorios } = await renderizar(UID);

      await rerender({ id: OUTRO });

      expect(sincronizarTudo).toHaveBeenLastCalledWith(repositorios, OUTRO);
      expect(sincronizarTudo).toHaveBeenCalledTimes(2);
    });

    test('ao sair da conta, para de observar tudo', async () => {
      const { rerender } = await renderizar(UID);

      await rerender({ id: null });

      expect(removerEstadoDoApp).toHaveBeenCalledTimes(1);
      expect(pararDeObservarARede).toHaveBeenCalledTimes(1);
      solicitarSincronizacao();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR * 2);
      expect(sincronizarTudo).toHaveBeenCalledTimes(1);
    });

    test('ao fechar a tela, também para de observar', async () => {
      const { unmount } = await renderizar(UID);

      await unmount();

      expect(removerEstadoDoApp).toHaveBeenCalledTimes(1);
      expect(pararDeObservarARede).toHaveBeenCalledTimes(1);
    });
  });

  describe('logo depois de alterar algo', () => {
    test('espera um pouco e sincroniza', async () => {
      await renderizar();
      jest.mocked(sincronizarTudo).mockClear();

      solicitarSincronizacao();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR - 1);
      expect(sincronizarTudo).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);

      expect(sincronizarTudo).toHaveBeenCalledTimes(1);
    });

    test('várias alterações seguidas viram uma sincronização só, depois da última', async () => {
      await renderizar();
      jest.mocked(sincronizarTudo).mockClear();

      solicitarSincronizacao();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR - 500);
      solicitarSincronizacao();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR - 500);
      expect(sincronizarTudo).not.toHaveBeenCalled();
      solicitarSincronizacao();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR);

      expect(sincronizarTudo).toHaveBeenCalledTimes(1);
    });

    test('duas alterações separadas por mais que o atraso sincronizam duas vezes', async () => {
      await renderizar();
      jest.mocked(sincronizarTudo).mockClear();

      solicitarSincronizacao();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR);
      solicitarSincronizacao();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR);

      expect(sincronizarTudo).toHaveBeenCalledTimes(2);
    });

    test('se a tela fecha antes do atraso acabar, a sincronização pendente é cancelada', async () => {
      const { unmount } = await renderizar();
      jest.mocked(sincronizarTudo).mockClear();
      solicitarSincronizacao();

      await unmount();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR * 2);

      expect(sincronizarTudo).not.toHaveBeenCalled();
    });
  });

  describe('ao voltar para o app', () => {
    test('sincroniza quando passou tempo suficiente desde a última vez', async () => {
      await renderizar();
      jest.mocked(sincronizarTudo).mockClear();

      jest.setSystemTime(new Date(INICIO.getTime() + INTERVALO_MINIMO_AO_VOLTAR_AO_APP));
      aoMudarOEstadoDoApp('active');

      expect(sincronizarTudo).toHaveBeenCalledTimes(1);
    });

    test('voltar de novo logo em seguida não sincroniza outra vez', async () => {
      await renderizar();
      jest.mocked(sincronizarTudo).mockClear();
      jest.setSystemTime(new Date(INICIO.getTime() + INTERVALO_MINIMO_AO_VOLTAR_AO_APP));
      aoMudarOEstadoDoApp('active');

      jest.setSystemTime(new Date(INICIO.getTime() + INTERVALO_MINIMO_AO_VOLTAR_AO_APP + 5000));
      aoMudarOEstadoDoApp('active');

      expect(sincronizarTudo).toHaveBeenCalledTimes(1);
    });

    test('voltar pouco depois de ter sincronizado (por exemplo, ao entrar) não sincroniza', async () => {
      await renderizar();
      jest.mocked(sincronizarTudo).mockClear();

      jest.setSystemTime(new Date(INICIO.getTime() + INTERVALO_MINIMO_AO_VOLTAR_AO_APP - 1));
      aoMudarOEstadoDoApp('active');

      expect(sincronizarTudo).not.toHaveBeenCalled();
    });

    test.each<AppStateStatus>(['background', 'inactive'])('ir para %s não sincroniza', async (estado) => {
      await renderizar();
      jest.mocked(sincronizarTudo).mockClear();

      jest.setSystemTime(new Date(INICIO.getTime() + INTERVALO_MINIMO_AO_VOLTAR_AO_APP * 2));
      aoMudarOEstadoDoApp(estado);

      expect(sincronizarTudo).not.toHaveBeenCalled();
    });

    test('uma sincronização por outro motivo conta para o intervalo', async () => {
      await renderizar();
      jest.setSystemTime(new Date(INICIO.getTime() + 20000));
      solicitarSincronizacao();
      jest.advanceTimersByTime(ATRASO_APOS_ALTERAR);
      jest.mocked(sincronizarTudo).mockClear();

      jest.setSystemTime(new Date(INICIO.getTime() + 20000 + ATRASO_APOS_ALTERAR + 10000));
      aoMudarOEstadoDoApp('active');

      expect(sincronizarTudo).not.toHaveBeenCalled();
    });
  });

  describe('quando a internet volta', () => {
    test('sincroniza na hora', async () => {
      await renderizar();
      jest.mocked(sincronizarTudo).mockClear();

      aoVoltarAInternet();

      expect(sincronizarTudo).toHaveBeenCalledTimes(1);
    });

    test('sincroniza mesmo logo depois de ter sincronizado (sem o intervalo mínimo do app)', async () => {
      await renderizar();

      aoVoltarAInternet();

      expect(sincronizarTudo).toHaveBeenCalledTimes(2);
    });
  });
});
